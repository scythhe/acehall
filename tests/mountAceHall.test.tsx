// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { act } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { mountAceHall } from '../src/lib';
import { demoConfig } from '../src/demo/demoConfig';
import { stubAdapter } from '../src/demo/stubAdapter';

// jsdom has no WebGL, so the R3F canvas is replaced with a plain element.
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children?: ReactNode }) => (
    <div data-testid="canvas" data-has-children={children ? 'true' : 'false'} />
  ),
}));

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  document.body.innerHTML = '';
});

function mount() {
  const target = document.createElement('div');
  document.body.appendChild(target);
  let handle!: ReturnType<typeof mountAceHall>;
  act(() => {
    handle = mountAceHall(target, { config: demoConfig, adapter: stubAdapter });
  });
  return { target, handle };
}

describe('mountAceHall', () => {
  it('renders the canvas and the operator overlay layer into the target', () => {
    const { target } = mount();
    expect(target.querySelector('[data-acehall]')).not.toBeNull();
    expect(target.querySelector('[data-testid="canvas"]')).not.toBeNull();
    expect(target.querySelector('[data-acehall-operator-layer]')).not.toBeNull();
  });

  it('exposes the public handle', () => {
    const { handle } = mount();
    expect(typeof handle.setLocale).toBe('function');
    expect(typeof handle.openGameList).toBe('function');
    expect(() => {
      handle.setLocale('ka');
      handle.openGameList();
    }).not.toThrow();
  });

  it('removes everything on unmount and tolerates a second call', () => {
    const { target, handle } = mount();
    act(() => handle.unmount());
    expect(target.childElementCount).toBe(0);
    expect(() => handle.unmount()).not.toThrow();
  });
});
