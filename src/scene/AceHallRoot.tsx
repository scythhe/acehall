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
import { Physics } from '@react-three/rapier';
import type { ResolvedConfig } from '../config/defaults';
import { debugToolsAvailable, type LobbyStore } from '../lib/store';
import { LobbyStoreContext, useLobby } from '../lib/storeContext';
import { Highlight } from '../interaction/Highlight';
import { buildInteractables } from '../interaction/interactables';
import type { InteractionEnv, InteractionEvent } from '../interaction/step';
import type { OperatorAdapter } from '../lib/types';
import { InteractionPrompt } from '../ui/InteractionPrompt';
import { SeatedPanel } from '../ui/SeatedPanel';
import { PlayerRig } from '../player/PlayerRig';
import { createPlayerRuntime, type PlayerRuntime } from '../player/runtime';
import { TUNING } from '../tuning';
import { loadAnchors } from './anchors/loader';
import type { Anchor } from './anchors/types';
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
  const request = (flag: 'interactPressed' | 'cancelPressed') => () => {
    runtimeRef.current.controls[flag] = true;
  };

  return (
    <LobbyStoreContext.Provider value={store}>
      <div
        data-acehall-root=""
        tabIndex={0}
        ref={(el) => el?.focus({ preventScroll: true })}
        style={{ ...rootStyle, background: config.brand.colors.uiBackground }}
      >
        <div style={layerStyle}>
          <Lobby config={config} store={store} adapter={adapter} runtimeRef={runtimeRef} />
        </div>
        <div style={{ ...layerStyle, pointerEvents: 'none' }}>
          <InteractionPrompt colors={config.brand.colors} onInteract={request('interactPressed')} />
          <SeatedPanel colors={config.brand.colors} onLeave={request('cancelPressed')} />
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
  const seatedAt = useRef(0);
  const hasCashier = adapter.openCashier !== undefined;

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
            // Free the cursor so the seated UI (and later the game overlay) can be clicked.
            if (document.pointerLockElement?.closest('[data-acehall]')) document.exitPointerLock();
            adapter.onEvent?.({ type: 'object_interacted', anchorId: target.anchorId, gameId });
          } else if (phase === 'seated') {
            seatedAt.current = performance.now();
            adapter.onEvent?.({ type: 'game_opened', gameId });
          } else if (phase === 'easingOut') {
            adapter.onEvent?.({
              type: 'game_closed',
              gameId,
              durationMs: Math.round(performance.now() - seatedAt.current),
            });
          }
          break;
        }
      }
    };
    return {
      interactables: buildInteractables(anchors, config, { cashier: hasCashier }),
      emit: handle,
    };
  }, [anchors, config, adapter, store, hasCashier]);

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
      <Highlight anchors={anchors} color={config.brand.colors.neon} />
      {debug && <AnchorDebug anchors={anchors} />}
      {debugToolsAvailable() && <DebugKeys runtimeRef={runtimeRef} />}
    </Canvas>
  );
}
