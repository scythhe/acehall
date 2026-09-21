# PROGRESS.md

| #   | Phase                             | Status  |
| --- | --------------------------------- | ------- |
| 0   | Scaffold & foundations            | ✅ Done |
| 1   | Greybox scene & player            | —       |
| 2   | Interaction & sit-down transition | —       |
| 3   | Overlay, adapter & demo           | —       |
| 4   | Asset pipeline & art pass         | —       |
| 5   | White-labeling & localization     | —       |
| 6   | Mobile & performance              | —       |
| 7   | Packaging, demo site & docs       | —       |
| 8   | Polish & QA                       | —       |

---

## Phase 0 — Scaffold & foundations (2026-09-21)

### Done

- Vite 8 + React 19.2 + TypeScript 6.0 (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
- Runtime deps installed: three 0.186, @react-three/fiber 9.7, drei 10.7, rapier 2.2, postprocessing 3.1, zustand 5.
- ESLint 10 flat config (typescript-eslint strict + stylistic, react-hooks, react-refresh, `no-explicit-any` = error), Prettier, Vitest 5 (+ jsdom for DOM tests).
- Folder structure from `CLAUDE.md` §5 (empty folders hold a `.gitkeep`).
- Public types from §6 in `src/lib/types.ts`, exported from `src/lib/index.ts`.
- `mountAceHall()` mounts a React root with an empty R3F `<Canvas>` (brand background colour) and an empty operator overlay layer (`[data-acehall-operator-layer]`, above the canvas, `pointer-events: none`). The handle's `unmount()` fully cleans up; `setLocale` / `openGameList` update a per-mount zustand store (nothing renders from it yet).
- `src/config/defaults.ts`: `applyDefaults()` fills optional config fields (all zones enabled, game list on with `walk-to`, quality `auto`, audio off at 0.7, "Powered by" on).
- Demo entry (`index.html` → `src/demo/main.ts`) with a demo config and a stub adapter.
- `ASSETS.md`, `README.md`, `.claude/launch.json` (dev server for the preview browser).
- Tests: config defaults, store behaviour, mount/unmount (canvas mocked; jsdom has no WebGL).

### Decisions made

- **React 19 instead of 18** (approved; `CLAUDE.md` §3 updated). R3F 9 / drei 10 / rapier 2 / postprocessing 3 require it. React is pinned to `~19.2.0` because R3F 9.7 declares `react >=19 <19.3`.
- **TypeScript `~6.0.3`**, not 7: typescript-eslint 8.70 supports `<6.1`.

### Left / next

- Phase 1: greybox scene, anchors + loader, Rapier, character controller, camera rig, `src/tuning.ts`, Playwright MCP.
- `adapter` is accepted by `mountAceHall` but not called yet (Phase 3).

### Known issues

- Console warning `THREE.Clock: This module has been deprecated` comes from inside R3F 9.7 with three 0.186. Harmless; goes away when R3F updates.
- Production bundle is a single ~1.09 MB chunk (297 kB gzip), mostly three.js. Code splitting is Phase 6.
- `npm install` warns that `fsevents` has an install script not in the allow list. It is an optional macOS file-watcher dependency; nothing needs to be approved.

### How to test manually

1. `npm install`
2. `npm run typecheck && npm run lint && npm test` — all pass (7 tests).
3. `npm run dev`, open http://localhost:5173 — a full-window, very dark purple (`#0b0710`) page. No scrollbars.
4. DevTools → Elements: `#app > div[data-acehall] > div` contains a `<canvas>` and a `div[data-acehall-operator-layer]`.
5. DevTools → Console: no errors (the `THREE.Clock` warning above is expected).
6. In the console, check `document.querySelector('[data-acehall] canvas').getContext('webgl2') !== null` is `true`.
7. Phone (same Wi-Fi): `npm run dev -- --host`, open the printed network URL — same dark full-screen page, no errors.
8. `npm run build && npm run preview` — same result from the production build.
