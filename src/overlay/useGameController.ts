import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { LobbyStore } from '../lib/store';
import type { OperatorAdapter } from '../lib/types';
import type { PlayerRuntime } from '../player/runtime';
import { loadAnchors } from '../scene/anchors/loader';
import { getSceneGame } from '../scene/games/sceneGame';
import { TUNING } from '../tuning';
import { prepareLaunch } from './launch';

const isTouchDevice = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;

export interface GameController {
  /** Ask the operator for permission and a launch URL, then show the game. Ignored while a game is showing. */
  start(gameId: string, source: 'seat' | 'direct'): void;
  /** Close the overlay. When seated this also stands the avatar up. */
  close(): void;
  retry(): void;
}

/**
 * Owns the game's life cycle and the adapter events that go with it. Sitting down opens the seated game;
 * leaving the seat always closes it, whichever way the leave began. Games registered as scene games are
 * played on the table itself; everything else opens in the iframe overlay.
 */
export function useGameController(
  store: LobbyStore,
  adapter: OperatorAdapter,
  runtimeRef: RefObject<PlayerRuntime>,
): GameController {
  const attempt = useRef(0);
  const openedAt = useRef(0);

  const finish = useCallback(() => {
    attempt.current++;
    const { game, setGame } = store.getState();
    game?.scene?.close();
    if (game?.status === 'open') {
      adapter.onEvent?.({
        type: 'game_closed',
        gameId: game.gameId,
        durationMs: Math.round(performance.now() - openedAt.current),
      });
    }
    setGame(null);
  }, [adapter, store]);

  const start = useCallback<GameController['start']>(
    (gameId, source) => {
      const state = store.getState();
      if (state.game) return;
      const id = ++attempt.current;
      const sceneGame = source === 'seat' ? getSceneGame(gameId) : undefined;
      const presentation = sceneGame ? 'scene' : 'overlay';
      state.setGame({ gameId, source, status: 'preparing', presentation });
      const fail = (status: 'error' | 'blocked' | 'login', message?: string) => {
        store.getState().setGame({
          gameId,
          source,
          status,
          presentation,
          ...(message === undefined ? {} : { message }),
        });
      };

      void (async () => {
        const result = await prepareLaunch(
          adapter,
          gameId,
          {
            locale: state.locale,
            device: isTouchDevice() ? 'mobile' : 'desktop',
            timeoutMs: TUNING.overlay.launchTimeoutMs,
          },
          { launchUrl: !sceneGame },
        );
        if (attempt.current !== id) return;
        if (result.status !== 'ready') {
          if (result.status === 'blocked') fail('blocked', result.message);
          else if (result.status === 'login') fail('login');
          else fail('error', result.message);
          return;
        }
        if (!sceneGame) {
          openedAt.current = performance.now();
          store
            .getState()
            .setGame({ gameId, source, status: 'open', presentation, url: result.url });
          adapter.onEvent?.({ type: 'game_opened', gameId });
          return;
        }

        try {
          const target = store.getState().interaction.target;
          const anchor = (await loadAnchors()).find((a) => a.id === target?.anchorId);
          if (!target || !anchor) throw new Error('The table is not available.');
          const scene = await sceneGame.open({
            gameId,
            anchorId: anchor.id,
            tablePosition: anchor.position,
            seats: anchor.seats,
            seatIndex: anchor.seats.findIndex((seat) => seat.id === target.seat.id),
          });
          if (attempt.current !== id) {
            scene.close();
            return;
          }
          openedAt.current = performance.now();
          store.getState().setGame({ gameId, source, status: 'open', presentation, scene });
          adapter.onEvent?.({ type: 'game_opened', gameId });
        } catch (error) {
          if (attempt.current === id) {
            fail('error', error instanceof Error ? error.message : String(error));
          }
        }
      })();
    },
    [adapter, store],
  );

  const close = useCallback(() => {
    const { game } = store.getState();
    if (!game) return;
    if (game.source === 'seat') runtimeRef.current.controls.cancelPressed = true;
    else finish();
  }, [finish, store, runtimeRef]);

  const retry = useCallback(() => {
    const { game, setGame } = store.getState();
    if (!game) return;
    attempt.current++;
    setGame(null);
    start(game.gameId, game.source);
  }, [start, store]);

  useEffect(() => {
    const unsubscribe = store.subscribe((state, previous) => {
      const phase = state.interaction.phase;
      if (phase === previous.interaction.phase) return;
      if (phase === 'seated') {
        const gameId = state.interaction.target?.gameId;
        if (gameId) start(gameId, 'seat');
      } else if (state.game?.source === 'seat') {
        finish();
      }
    });
    const counter = attempt;
    return () => {
      unsubscribe();
      counter.current++;
      store.getState().game?.scene?.close();
    };
  }, [store, start, finish]);

  return { start, close, retry };
}
