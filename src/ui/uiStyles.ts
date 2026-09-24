import type { CSSProperties } from 'react';
import type { ResolvedConfig } from '../config/defaults';

export type Colors = ResolvedConfig['brand']['colors'];

/** Translucent panel in the operator's UI colours. */
export const panelStyle = (colors: Colors): CSSProperties => ({
  background: `${colors.uiBackground}e6`,
  color: colors.uiText,
  border: `1px solid ${colors.accent}55`,
  borderRadius: 12,
});

export const buttonStyle = (colors: Colors): CSSProperties => ({
  padding: '8px 14px',
  border: `1px solid ${colors.accent}`,
  borderRadius: 999,
  background: `${colors.uiBackground}cc`,
  color: colors.uiText,
  font: 'inherit',
  fontSize: 14,
  cursor: 'pointer',
});
