import type { CSSProperties } from 'react';
import { Canvas } from '@react-three/fiber';
import type { ResolvedConfig } from '../config/defaults';

const FONT_STACK =
  '"Noto Sans Georgian", "Noto Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const rootStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  fontFamily: FONT_STACK,
};

const layerStyle: CSSProperties = { position: 'absolute', inset: 0 };

interface AceHallRootProps {
  config: ResolvedConfig;
}

export function AceHallRoot({ config }: AceHallRootProps) {
  return (
    <div style={{ ...rootStyle, background: config.brand.colors.uiBackground }}>
      <div style={layerStyle}>
        <Canvas>
          <color attach="background" args={[config.brand.colors.uiBackground]} />
        </Canvas>
      </div>
      {/* Operators render age gates, KYC, reality checks and limit popups in here. */}
      <div data-acehall-operator-layer="" style={{ ...layerStyle, pointerEvents: 'none' }} />
    </div>
  );
}
