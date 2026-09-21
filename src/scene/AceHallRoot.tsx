import { Suspense, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import type { ResolvedConfig } from '../config/defaults';
import { debugToolsAvailable, type LobbyStore } from '../lib/store';
import { LobbyStoreContext, useLobby } from '../lib/storeContext';
import { PlayerRig } from '../player/PlayerRig';
import { createPlayerRuntime } from '../player/runtime';
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
}

export function AceHallRoot({ config, store }: AceHallRootProps) {
  return (
    <LobbyStoreContext.Provider value={store}>
      <div
        data-acehall-root=""
        tabIndex={0}
        ref={(el) => el?.focus({ preventScroll: true })}
        style={{ ...rootStyle, background: config.brand.colors.uiBackground }}
      >
        <div style={layerStyle}>
          <Lobby config={config} />
        </div>
        {/* Operators render age gates, KYC, reality checks and limit popups in here. */}
        <div data-acehall-operator-layer="" style={{ ...layerStyle, pointerEvents: 'none' }} />
      </div>
    </LobbyStoreContext.Provider>
  );
}

function Lobby({ config }: { config: ResolvedConfig }) {
  const [anchors, setAnchors] = useState<readonly Anchor[]>([]);
  const runtimeRef = useRef(createPlayerRuntime());
  const debug = useLobby((s) => s.debug);

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
          <PlayerRig runtimeRef={runtimeRef} />
        </Physics>
      </Suspense>
      {debug && <AnchorDebug anchors={anchors} />}
      {debugToolsAvailable() && <DebugKeys runtimeRef={runtimeRef} />}
    </Canvas>
  );
}
