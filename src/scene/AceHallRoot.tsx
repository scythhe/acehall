import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import { Canvas } from '@react-three/fiber';
import { useStore } from 'zustand';
import { Physics } from '@react-three/rapier';
import type { ResolvedConfig } from '../config/defaults';
import { useOperatorSession, refreshSession } from '../adapter/session';
import { localizedName } from '../i18n';
import { createNavGrid, findRoute } from '../interaction/route';
import { GameOverlay } from '../overlay/GameOverlay';
import { getSceneGame } from './games/sceneGame';
import { useGameController } from '../overlay/useGameController';
import { debugToolsAvailable, type LobbyStore } from '../lib/store';
import { LobbyStoreContext, useLobby } from '../lib/storeContext';
import { Highlight } from '../interaction/Highlight';
import { buildInteractables } from '../interaction/interactables';
import type { InteractionEnv, InteractionEvent } from '../interaction/step';
import type { OperatorAdapter } from '../lib/types';
import { InteractionPrompt } from '../ui/InteractionPrompt';
import { GameList } from '../ui/GameList';
import type { GameEntry } from '../ui/gameListModel';
import { Hud } from '../ui/Hud';
import type { Vec2 } from '../player/movement';
import { PlayerRig } from '../player/PlayerRig';
import { createPlayerRuntime, type PlayerRuntime } from '../player/runtime';
import { TUNING } from '../tuning';
import { loadAnchors } from './anchors/loader';
import type { Anchor } from './anchors/types';
import { buildColliders } from './greybox';
import { Casino } from './Casino';
import { AnchorDebug } from './debug/AnchorDebug';
import { DebugKeys } from './debug/DebugKeys';

const FONT_STACK =
  '"Noto Sans Georgian", "Noto Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const rootStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  fontFamily: FONT_STACK,
  outline: 'none',
};

const layerStyle: CSSProperties = { position: 'absolute', inset: 0 };

interface AceHallRootProps {
  config: ResolvedConfig;
  store: LobbyStore;
  adapter: OperatorAdapter;
}

export function AceHallRoot({ config, store, adapter }: AceHallRootProps) {
  const runtimeRef = useRef(createPlayerRuntime());
  const rootRef = useRef<HTMLDivElement>(null);
  const controller = useGameController(store, adapter, runtimeRef);
  const game = useStore(store, (s) => s.game);
  const locale = useStore(store, (s) => s.locale);
  useOperatorSession(adapter, store);

  const request = (flag: 'interactPressed') => () => {
    runtimeRef.current.controls[flag] = true;
  };

  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
    return store.subscribe((state, previous) => {
      if (state.gameListOpen && !previous.gameListOpen)
        adapter.onEvent?.({ type: 'game_list_opened' });
      // Modals take keyboard focus with them when they close; hand it back so the avatar responds again.
      if ((previous.game && !state.game) || (previous.gameListOpen && !state.gameListOpen)) {
        rootRef.current?.focus({ preventScroll: true });
      }
    });
  }, [store, adapter]);

  const selectGame = (entry: GameEntry) => {
    const state = store.getState();
    state.closeGameList();
    if (state.interaction.phase !== 'free' || state.game) return;
    if (config.gameList.selectBehavior === 'walk-to' || getSceneGame(entry.gameId)) {
      runtimeRef.current.controls.goTo = { gameId: entry.gameId };
    } else {
      adapter.onEvent?.({
        type: 'object_interacted',
        anchorId: entry.anchorId,
        gameId: entry.gameId,
      });
      controller.start(entry.gameId, 'direct');
    }
  };

  const gameName = game
    ? config.objects.find((o) => o.gameId === game.gameId)?.displayName
    : undefined;

  return (
    <LobbyStoreContext.Provider value={store}>
      <div
        data-acehall-root=""
        tabIndex={0}
        ref={rootRef}
        style={{ ...rootStyle, background: config.brand.colors.uiBackground }}
      >
        <div style={layerStyle}>
          <Lobby config={config} store={store} adapter={adapter} runtimeRef={runtimeRef} />
        </div>
        <div style={{ ...layerStyle, pointerEvents: 'none' }}>
          <Hud
            colors={config.brand.colors}
            locales={config.locale.available}
            gameListEnabled={config.gameList.enabled}
          />
          <InteractionPrompt colors={config.brand.colors} onInteract={request('interactPressed')} />
          <GameList colors={config.brand.colors} objects={config.objects} onSelect={selectGame} />
          {game?.status === 'open' && game.scene && (
            <game.scene.Controls colors={config.brand.colors} onLeave={controller.close} />
          )}
          {game &&
            (game.presentation === 'overlay' ||
              (game.status !== 'open' && game.status !== 'preparing')) && (
              <GameOverlay
                game={game}
                name={gameName ? localizedName(gameName, locale) : game.gameId}
                colors={config.brand.colors}
                allowedOrigins={config.allowedGameOrigins}
                onClose={controller.close}
                onRetry={controller.retry}
                onBalanceChanged={() => {
                  void refreshSession(adapter, store);
                }}
              />
            )}
        </div>
        {/* Operators render age gates, KYC, reality checks and limit popups in here. */}
        <div data-acehall-operator-layer="" style={{ ...layerStyle, pointerEvents: 'none' }} />
      </div>
    </LobbyStoreContext.Provider>
  );
}

interface LobbyProps {
  config: ResolvedConfig;
  store: LobbyStore;
  adapter: OperatorAdapter;
  runtimeRef: RefObject<PlayerRuntime>;
}

function Lobby({ config, store, adapter, runtimeRef }: LobbyProps) {
  const [anchors, setAnchors] = useState<readonly Anchor[]>([]);
  const debug = useLobby((s) => s.debug);
  const game = useStore(store, (s) => s.game);
  const SceneGame = game?.status === 'open' ? game.scene?.Scene : undefined;
  const hasCashier = adapter.openCashier !== undefined;

  const router = useMemo(() => {
    const grid = createNavGrid(buildColliders(anchors), TUNING.navigation);
    return (from: Vec2, to: Vec2) => findRoute(grid, from, to, TUNING.navigation.sightStep);
  }, [anchors]);

  const interaction = useMemo<InteractionEnv>(() => {
    const handle = (event: InteractionEvent) => {
      const state = store.getState();
      switch (event.type) {
        case 'focus':
          state.setFocus(event.target);
          break;
        case 'cashier':
          adapter.openCashier?.();
          break;
        case 'phase': {
          const { phase, target } = event;
          state.setInteraction(phase, phase === 'free' ? null : target);
          const gameId = target.gameId ?? '';
          if (phase === 'walking') {
            // Free the cursor so the game overlay can be clicked once seated.
            if (document.pointerLockElement?.closest('[data-acehall]')) document.exitPointerLock();
            adapter.onEvent?.({ type: 'object_interacted', anchorId: target.anchorId, gameId });
          }
          break;
        }
      }
    };
    return {
      interactables: buildInteractables(anchors, config, { cashier: hasCashier }),
      router,
      emit: handle,
    };
  }, [anchors, config, adapter, store, hasCashier, router]);

  useEffect(() => {
    let cancelled = false;
    void loadAnchors().then((loaded) => {
      if (!cancelled) setAnchors(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Canvas
      camera={{ fov: TUNING.camera.fov, near: 0.1, far: 120, position: [0, 3, 21] }}
      dpr={[1, 2]}
    >
      <color attach="background" args={[config.brand.colors.uiBackground]} />
      <Suspense fallback={null}>
        <Physics gravity={[0, 0, 0]} timeStep="vary" debug={debug}>
          <Casino anchors={anchors} colors={config.brand.colors} />
          <PlayerRig runtimeRef={runtimeRef} interaction={interaction} />
        </Physics>
      </Suspense>
      {SceneGame && <SceneGame />}
      <Highlight anchors={anchors} color={config.brand.colors.neon} />
      {debug && <AnchorDebug anchors={anchors} />}
      {debugToolsAvailable() && <DebugKeys runtimeRef={runtimeRef} />}
    </Canvas>
  );
}
