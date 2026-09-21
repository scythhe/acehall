# PROGRESS.md

| #   | Phase                             | Status  |
| --- | --------------------------------- | ------- |
| 0   | Scaffold & foundations            | ✅ Done |
| 1   | Greybox scene & player            | ✅ Done |
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

---

## Phase 1 — Greybox scene & player (2026-09-21)

### Done

- **Hall:** 60 × 44 m, 6 m ceiling (4 m in the VIP room), entrance gap in the south wall. Zones: slots (4 banks × 12 machines, back-to-back), tables pit, live dealer (4 booths), VIP room (own walls, doorway, lower ceiling), bar/lounge (counter, 10 stools, 4 sofa groups), cashier desk. Everything is boxes/primitives; slot machines, stools and light panels are instanced.
- **Poker is the focal point.** Four poker tables (two 9-max, two 6-max) frame the spawn view, each with a seat anchor for every chair (9 + 9 + 6 + 6 = 30 seats) and a seated camera per seat.
- **Anchors** (`src/scene/anchors/`): plain data in `anchors.ts` behind `loadAnchors(): Promise<Anchor[]>` in `loader.ts`. 65 anchors: `slots.row{1-4}.{01-12}`, `poker.table1-4`, `blackjack.table1-3`, `roulette.table1-2`, `baccarat.table1-2`, `live.booth1-4`, `vip.blackjack1`, `vip.baccarat1`, `cashier.desk1`. Each anchor holds object position/rotation and a list of seats (position, heading, seated camera position/target). The `Anchor` type is internal; the public API is unchanged. Props are drawn from the anchor data, so visuals and data cannot drift apart.
- **Physics:** Rapier fixed colliders derived from the same data (`buildColliders`), kinematic capsule with `KinematicCharacterController` (slides along walls).
- **Player:** WASD/arrows, Shift to sprint, acceleration/deceleration, avatar turns towards its movement direction. Orbit by dragging; a plain click requests pointer lock (Esc exits).
- **Camera:** over-the-shoulder spring arm. A sphere cast from the pivot shortens it instantly at walls and it relaxes back out.
- **Debug:** `` ` `` (or F2, or the key left of 1 on ISO layouts) toggles anchor markers + labels, seat discs, seated-camera lines and Rapier collider wireframes. Keys 1-7 (also numpad) teleport to spawn / slots / tables (poker) / live dealer / VIP / bar / cashier, whether or not the overlay is on. Available in dev builds, or with `?debug` in any build. Dev/debug builds also write the player's position to `data-player` on the `[data-acehall]` element for automated checks.
- `src/tuning.ts` holds every feel constant (speeds, camera distance/pitch/sensitivity, spawn).
- Tests: 32 pass (anchor ids, zone containment, poker seat counts, no overlapping colliders, every seat reachable, movement, diagonal speed and camera maths).
- Held keys are tracked as a set of physical keys (W and ArrowUp together, releasing one keeps you moving). Diagonals are normalized: measured 3.20 m/s walking and 6.00 m/s sprinting in every diagonal, with no speed spikes over 2,044 frames across all zones.

### Decisions made

- **Poker seats are individual anchors under one table anchor.** Live poker is run entirely by the operator's game in the overlay; AceHall only seats the player. No other players, cards or dealing are shown in 3D (multiplayer presence and game logic are out of scope in `CLAUDE.md`).
- Key/pointer listeners are attached to the AceHall root element, not `window`, so an embedded lobby never steals host-page keys. The root takes focus on mount and on click.
- No gravity: the floor is flat and the avatar is kept on it, so there is no ground snapping yet.
- The `cashier` seat is a standing spot in front of the desk.

### Left / next

- Phase 2: interaction prompts, walk-to-seat, sit animation, camera ease using the seat anchors. Phase 2 must disable chair/stool collision when walking to a seat (stools and poker chairs are visual only right now, so they do not block the player).
- Screen is empty at the entrance opening (shows the background colour). A vestibule/entrance scene is an art-pass (Phase 4) item.
- Touch controls are Phase 6. On a portrait phone the horizontal FOV is narrow, so the poker tables sit at the screen edges at spawn; revisit FOV/spawn distance in Phase 6.
- The avatar fills the screen when the arm is pulled in tight against a wall; consider fading it out below ~1 m in Phase 2.

### Known issues

- Console: `THREE.Clock` deprecation (R3F, from Phase 0) and a Rapier `deprecated parameters for the initialization function` warning (inside `@react-three/rapier`). Both are harmless and library-side. A favicon 404 also shows in dev.
- Two copies of `@dimforge/rapier3d-compat` are installed (one nested under `@react-three/rapier`), with slightly different APIs; code uses only types exported by `@react-three/rapier`/`useRapier()`.
- Production bundle: 3.4 MB (1.16 MB gzip) in one chunk, mostly three.js + Rapier WASM. Well inside the 8 MB budget; splitting is Phase 6.
- Headless Playwright renders WebGL in software, so frame rates were not measured (per `CLAUDE.md`).

### How to test manually

1. `npm run typecheck && npm run lint && npm test` — all pass (32 tests).
2. `npm run dev`, open http://localhost:5173. You start just inside the entrance looking down the central aisle, with a poker table on each side ahead.
3. Walk with WASD; hold Shift to sprint. The avatar accelerates smoothly and turns to face its direction. Walk into walls, tables, slot banks and columns: you slide along them and never pass through.
4. Drag the mouse to orbit. A short click (no drag) enables pointer lock; Esc releases it. Orbit the camera into a wall behind you: the camera pulls in close instead of clipping through, then eases back out.
5. Open http://localhost:5173/?debug (or press `` ` ``): coloured anchor markers with ids, green seat discs, white seated-camera lines and collider wireframes appear. Press `` ` `` again to hide them.
6. Press 1-7 to jump to each zone (works with the overlay on or off) (spawn, slots, tables/poker, live dealer, VIP, bar, cashier). Check the poker tables show 9, 9, 6 and 6 seat discs.
7. Console: no errors (the known warnings above are expected).
8. Phone (same Wi-Fi): `npm run dev -- --host` and open the printed URL. The scene renders full-screen and fits without scrolling. Touch controls do not exist yet (Phase 6), so you cannot move on a phone.
