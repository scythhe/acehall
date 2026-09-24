// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createBridgeHandler } from '../src/overlay/bridge';
import { prepareLaunch } from '../src/overlay/launch';
import type { OperatorAdapter, PlayerSession } from '../src/lib/types';

const session: PlayerSession = {
  playerId: 'p',
  displayName: 'P',
  currency: 'GEL',
  balance: 10,
  isAuthenticated: true,
};
const ctx = { locale: 'en', device: 'desktop', timeoutMs: 50 } as const;
const adapter = (overrides: Partial<OperatorAdapter> = {}): OperatorAdapter => ({
  getSession: () => Promise.resolve(session),
  getGameLaunchUrl: (id) => Promise.resolve(`https://games.example/${id}`),
  ...overrides,
});

describe('postMessage bridge', () => {
  const frame = {} as Window;
  const setup = () => {
    const onClose = vi.fn();
    const onBalanceChanged = vi.fn();
    const handle = createBridgeHandler({
      allowedOrigins: ['https://games.example'],
      frameWindow: () => frame,
      onClose,
      onBalanceChanged,
    });
    const send = (data: unknown, origin = 'https://games.example', source: unknown = frame) => {
      handle({ data, origin, source } as MessageEvent);
    };
    return { send, onClose, onBalanceChanged };
  };

  it('handles close and balance_changed from the game frame', () => {
    const { send, onClose, onBalanceChanged } = setup();
    send({ source: 'acehall-game', type: 'close' });
    send({ source: 'acehall-game', type: 'balance_changed', balance: 1e9 });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onBalanceChanged).toHaveBeenCalledTimes(1);
  });

  it('ignores other origins, other windows and malformed or unknown messages', () => {
    const { send, onClose, onBalanceChanged } = setup();
    send({ source: 'acehall-game', type: 'close' }, 'https://evil.example');
    send({ source: 'acehall-game', type: 'close' }, 'https://games.example', {});
    send({ source: 'other', type: 'close' });
    send({ source: 'acehall-game', type: 'launch_rocket' });
    send({ source: 'acehall-game' });
    send('close');
    send(null);
    expect(onClose).not.toHaveBeenCalled();
    expect(onBalanceChanged).not.toHaveBeenCalled();
  });
});

describe('prepareLaunch', () => {
  it('returns the launch URL when the player may play', async () => {
    expect(await prepareLaunch(adapter(), 'g1', ctx)).toEqual({
      status: 'ready',
      url: 'https://games.example/g1',
    });
  });

  it('passes locale and device to the adapter', async () => {
    const getGameLaunchUrl = vi.fn(() => Promise.resolve('u'));
    await prepareLaunch(adapter({ getGameLaunchUrl }), 'g1', { ...ctx, locale: 'ka' });
    expect(getGameLaunchUrl).toHaveBeenCalledWith('g1', { locale: 'ka', device: 'desktop' });
  });

  it('does not launch when limits say canPlay: false, and reports the operator reason', async () => {
    const getGameLaunchUrl = vi.fn(() => Promise.resolve('u'));
    const result = await prepareLaunch(
      adapter({
        getGameLaunchUrl,
        getPlayerLimitsState: () =>
          Promise.resolve({ canPlay: false, reason: 'Daily limit reached' }),
      }),
      'g1',
      ctx,
    );
    expect(result).toEqual({ status: 'blocked', message: 'Daily limit reached' });
    expect(getGameLaunchUrl).not.toHaveBeenCalled();
  });

  it('asks the operator to log in when the player is a guest', async () => {
    const requestLogin = vi.fn();
    const result = await prepareLaunch(
      adapter({
        requestLogin,
        getSession: () => Promise.resolve({ ...session, isAuthenticated: false }),
      }),
      'g1',
      ctx,
    );
    expect(result).toEqual({ status: 'login' });
    expect(requestLogin).toHaveBeenCalledTimes(1);
  });

  it('reports adapter failures and timeouts instead of throwing', async () => {
    const failing = await prepareLaunch(
      adapter({ getGameLaunchUrl: () => Promise.reject(new Error('boom')) }),
      'g1',
      ctx,
    );
    expect(failing).toEqual({ status: 'error', message: 'boom' });
    const hanging = await prepareLaunch(
      adapter({ getGameLaunchUrl: () => new Promise(() => undefined) }),
      'g1',
      ctx,
    );
    expect(hanging.status).toBe('error');
  });
});
