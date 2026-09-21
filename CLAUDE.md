# CLAUDE.md — AceHall

**AceHall** is a white-label, third-person 3D casino lobby for the web. This file is the source of truth for the project. Read it fully at the start of every session, then read `PROGRESS.md` to see where we are. Work only on the phase you are asked to work on.

---

## 1. What we are building

AceHall is embedded by licensed online casino operators into their existing platforms. The player controls an avatar, walks around a lively casino floor, sits down at a table or machine, and the operator's real game opens in an overlay.

**AceHall is a presentation layer only.**
- Operators supply accounts, wallets, balances, certified games, KYC, and responsible-gambling logic.
- AceHall **never** handles money, calculates outcomes, or stores balances. The balance shown in the HUD is display-only and comes from the operator adapter.
- The buyers are online casino operators in Georgia. Success means (a) a demo that looks impressive within the first 10 seconds and (b) integration that takes an operator days, not months.

**Branding:** "AceHall" is the product name, not the in-scene brand. In the 3D scene and UI, only the operator's brand appears. The only AceHall branding is an optional small "Powered by AceHall" credit (config flag, on by default in the demo).

The experience is inspired by walking through a casino in open-world games like GTA Online. **All assets, layout, and branding must be original.** Never replicate any existing game's venue, models, logos, music, or UI.

---

## 2. Experience spec

### Core flow
1. **Spawn** immediately inside the casino on the main floor, just past the entrance, facing down the central aisle toward the tables. No intro cinematic, no exterior. The first rendered frame must already look like a busy, well-lit casino.
2. **Free roam**
   - Desktop: WASD to move, Shift to sprint, mouse drag / pointer-lock to orbit the camera, E to interact.
   - Mobile: left virtual joystick, right-side drag to orbit, on-screen interact button.
   - Smooth acceleration/deceleration; the avatar turns to face movement direction.
3. **Zones**: slots floor, table games (blackjack, roulette, baccarat), live-dealer area, VIP room, bar/lounge, cashier desk.
4. **Interaction**: when the avatar is within range of an interactive object and roughly facing it, show a contextual prompt ("Press E to play *Game Name*" / "Tap to play"). Highlight the object subtly (emissive pulse or outline).
5. **Sit-down transition** (the signature moment, must feel polished):
   - Player input locks.
   - Avatar walks/turns to the object's seat anchor (a short navigation path, not a teleport).
   - Sit animation plays.
   - Camera eases (≈0.8–1.2 s, ease-in-out) from third-person to the object's seated camera anchor.
   - Game overlay opens with the operator's launch URL.
6. **Leaving**: closing the overlay reverses the sequence: camera eases back, stand animation, input unlocks.
7. **"Skip to game list"** button always visible: opens a searchable, categorized 2D list of all games. Selecting one either walks the avatar there or opens the game directly (config option).

### HUD
- Player display name and balance (display-only, from adapter), currency formatted per locale.
- Settings: quality (auto/low/medium/high), audio mute + volume, language.
- Minimal, brandable, never covers the center of the screen.

### Out of scope for v1
Multiplayer presence, chat, avatar customization, any money handling, any real-money game logic.

---

## 3. Tech stack

AceHall is **web-native**. Do not propose Unreal, Unity, or any engine that requires pixel streaming or a heavy runtime: they break the embed model, mobile load times, and operator integration.

| Concern | Choice |
|---|---|
| Build | Vite + React 19 + TypeScript (strict) |
| 3D | three.js via React Three Fiber, @react-three/drei |
| Physics / collision | @react-three/rapier (kinematic character controller) |
| State | zustand |
| Postprocessing | @react-three/postprocessing (bloom for neon, used sparingly, off on low tier) |
| Asset pipeline | @gltf-transform/cli + scripts (Draco/Meshopt, KTX2) |
| Tests | Vitest for logic; Playwright for smoke/visual tests |
| Lint/format | ESLint + Prettier |
| Packaging | Library build (ESM) for npm (`acehall`) + an IIFE bundle for `<script>` embed |

**Ask before adding any dependency not listed here.**

---

## 4. Tooling & MCP servers

These MCP servers are available to you. Each is introduced in a specific phase; don't rely on one before its phase unless the human has added it.

| MCP | From phase | Use it for | Don't use it for |
|---|---|---|---|
| **Context7** (docs) | 0 | Current API docs for R3F, drei, Rapier, three.js, gltf-transform. Check before using any API you're not certain about. | — |
| **Playwright** | 1 | Opening the dev server, simulating input, taking screenshots at checkpoints, reading console errors. | Performance measurement. Its frame rates are meaningless. |
| **Blender** | 4 | Modeling casino props that don't exist as free assets; batch cleanup of downloaded assets (scale, pivots, merging, baking, GLB export); viewport screenshots to check modeling. | Downloading from Sketchfab or generating models with AI (Hyper3D, Hunyuan3D, etc.) without the human's explicit per-asset approval. |
| **Chrome DevTools** | 6 | Performance traces, draw calls, memory, network waterfalls on desktop. | Replacing real-phone testing. |

---

## 5. Architecture

```
/
├─ CLAUDE.md               # this file
├─ PROGRESS.md             # phase status log, updated by Claude at end of each phase
├─ ASSETS.md               # asset license manifest
├─ assets-src/             # raw downloaded assets and .blend files (not shipped)
├─ scripts/                # asset pipeline scripts
├─ public/assets/          # processed, optimized assets (shipped)
├─ src/
│  ├─ lib/                 # public API: mountAceHall(), types, adapter interface
│  ├─ config/              # config schema, defaults, validation
│  ├─ adapter/             # OperatorAdapter interface, demo/mock adapter
│  ├─ scene/               # Canvas, lighting, environment, zones
│  ├─ scene/anchors/       # anchor data + loaders
│  ├─ player/              # character controller, animation, camera rig
│  ├─ interaction/         # interactables, proximity detection, prompts, transitions
│  ├─ overlay/             # game overlay/iframe, postMessage bridge
│  ├─ ui/                  # HUD, settings, game list, loading screen, credits
│  ├─ i18n/                # ka / en / ru strings
│  ├─ quality/             # device detection, quality tiers
│  ├─ audio/               # ambient + spatial audio
│  ├─ tuning.ts            # all feel-related constants
│  └─ demo/                # demo site, theme switcher, placeholder games
└─ tests/
```

### Scene anchors
The casino layout exposes **named anchors** (e.g. `slots.row1.03`, `blackjack.table2`, `roulette.table1`). Each anchor defines: object position/rotation, seat position, seated camera position/target, and object kind. The operator config maps games onto anchors, so operators customize content without touching 3D code.

**Authoring decision:** anchors are authored in code for v1 (`src/scene/anchors/anchors.ts`). Keep them as **plain data** behind a loader interface (`loadAnchors(): Promise<Anchor[]>`), so a later loader can read them from named empties in a Blender-exported GLB (e.g. `anchor_blackjack.table2`) without changing anything else.

---

## 6. Public API (implement these types exactly; extend only with approval)

```ts
export type Locale = 'ka' | 'en' | 'ru';

export type ObjectKind =
  | 'slot' | 'blackjack' | 'roulette' | 'baccarat' | 'live-dealer' | 'poker';

export interface PlayerSession {
  playerId: string;
  displayName: string;
  currency: string;          // ISO 4217, e.g. 'GEL'
  balance: number;           // display only
  isAuthenticated: boolean;
}

export interface PlayerLimitsState {
  canPlay: boolean;
  reason?: string;           // operator-supplied message shown if canPlay is false
}

export type AceHallEvent =
  | { type: 'lobby_loaded'; loadMs: number; qualityTier: string }
  | { type: 'zone_entered'; zone: string }
  | { type: 'object_interacted'; anchorId: string; gameId: string }
  | { type: 'game_opened'; gameId: string }
  | { type: 'game_closed'; gameId: string; durationMs: number }
  | { type: 'game_list_opened' };

export interface OperatorAdapter {
  getSession(): Promise<PlayerSession>;
  getGameLaunchUrl(
    gameId: string,
    ctx: { locale: Locale; device: 'desktop' | 'mobile' }
  ): Promise<string>;
  subscribeBalance?(cb: (balance: number) => void): () => void;
  getPlayerLimitsState?(gameId: string): Promise<PlayerLimitsState>;
  onEvent?(event: AceHallEvent): void;
  /** Called when the player tries to play while not authenticated. */
  requestLogin?(): void;
  /** Called when the player clicks the cashier desk. */
  openCashier?(): void;
}

export interface InteractiveObjectConfig {
  anchorId: string;
  gameId: string;
  kind: ObjectKind;
  displayName: string | Partial<Record<Locale, string>>;
  thumbnailUrl?: string;
  category?: string;
}

export interface AceHallConfig {
  brand: {
    name: string;                   // the operator's brand
    logoUrl?: string;               // applied to in-scene signage textures
    colors: {
      primary: string;
      accent: string;
      neon: string;
      carpet: string;
      uiBackground: string;
      uiText: string;
    };
    loadingScreen?: { backgroundUrl?: string; tagline?: string };
    showPoweredBy?: boolean;        // "Powered by AceHall" credit
  };
  locale: {
    default: Locale;
    available: Locale[];
    overrides?: Partial<Record<Locale, Record<string, string>>>;
  };
  zones?: Partial<Record<
    'slots' | 'tables' | 'liveDealer' | 'vip' | 'bar' | 'cashier',
    { enabled: boolean }
  >>;
  objects: InteractiveObjectConfig[];
  gameList?: { enabled: boolean; selectBehavior: 'walk-to' | 'open-directly' };
  quality?: 'auto' | 'low' | 'medium' | 'high';
  audio?: { enabledByDefault: boolean; volume: number };
  allowedGameOrigins: string[];      // postMessage origin allowlist
}

export function mountAceHall(
  target: HTMLElement,
  options: { config: AceHallConfig; adapter: OperatorAdapter }
): { unmount(): void; setLocale(l: Locale): void; openGameList(): void };
```

### postMessage bridge
- Game iframes may send `{ source: 'acehall-game', type: 'close' }` and `{ source: 'acehall-game', type: 'balance_changed' }`.
- Validate `event.origin` against `allowedGameOrigins`. Ignore everything else silently.
- On `balance_changed`, re-fetch the session through the adapter. Never trust a balance value from a message.

### Operator overlays
Leave a DOM layer above the canvas where operators can render their own age gate, KYC prompts, reality checks, and limit popups. If `getPlayerLimitsState` returns `canPlay: false`, show the operator's `reason` and do not launch the game.

---

## 7. Assets

- Use **only** assets whose licenses allow **commercial use and redistribution inside a sold product**: CC0 preferred, CC-BY acceptable with attribution. **Reject** anything CC-BY-NC, "personal use only," "editorial," or with unclear licensing.
- Suggested sources: Poly Haven (HDRIs, textures, props), ambientCG (PBR materials), Kenney and Quaternius (CC0 models/characters), Mixamo (character animations), Freesound filtered to CC0 (audio), Sketchfab filtered to CC0/CC-BY with license verified per model.
- **Visual direction: stylized low-poly with rich lighting** (neon, emissive signage, warm pools of light, bloom) unless the human changes this. Every asset must match this direction. Never mix styles.
- Casino props that don't exist as good free assets (slot machines, roulette wheels, card tables, chip stacks, signage) are **modeled with Blender MCP** in Phase 4, or generated procedurally in code if simpler. Save `.blend` sources in `assets-src/`.
- **Workflow**: Claude proposes candidate assets with URL + license; the human verifies and downloads them into `assets-src/`; Claude processes them. Do not assume a license. If unclear, flag it. This applies equally to anything fetched through an MCP.
- Every asset goes through `scripts/process-assets` (compression, KTX2, normalized scale and pivot, per-zone texture budget).
- Every asset is listed in `ASSETS.md` (name, source URL or "original — modeled in Blender", author, license, attribution text). An in-app credits screen is generated from it.

---

## 8. Performance budgets (hard requirements)

| Metric | Target |
|---|---|
| Desktop (mid-range, integrated GPU) | 60 fps |
| Mobile (3-year-old mid-range Android) | 30 fps stable |
| First interactive frame, 4G | < 5 s |
| Initial download | < 8 MB; other zones stream in afterward |
| Draw calls (high tier) | < 150 in view |
| Texture memory (low tier) | < 128 MB |

Techniques: instancing for repeated machines/chairs/stools, baked lighting on static geometry, LODs, frustum culling, zone-based streaming, capped DPR on mobile, bloom and shadows disabled on low tier. Quality tier auto-detected from GPU info + a short frame-time probe, user-overridable.

Measure on the human's real phone and with Chrome DevTools MCP. Never use Playwright numbers.

---

## 9. Localization
Georgian (`ka`), English (`en`), Russian (`ru`). All UI strings in `src/i18n`. No hardcoded user-facing text. Use a font stack that renders Georgian script correctly (e.g. Noto Sans Georgian with fallbacks). Format currency and numbers with `Intl`.

---

## 10. Working rules for Claude

1. **One phase at a time.** Start each phase by stating a short plan (files to create/change, approach, risks) and wait for approval before writing code.
2. **Ask before** adding dependencies, changing the public API types, or changing the visual direction.
3. **Keep it runnable.** At the end of every phase, `npm run dev`, `npm run typecheck`, `npm run lint`, and `npm test` must pass.
4. **Update `PROGRESS.md`** at the end of each phase: what was done, what's left, known issues, and exactly how to test it manually.
5. **Give the human a manual test checklist** at the end of each phase (what to click, what should happen, what to check on a phone).
6. Prefer small, readable components. No `any`. No dead code. Comment only non-obvious logic.
7. Feel-related constants (speeds, camera distances, easing durations, interaction ranges) go in `src/tuning.ts` so they can be adjusted quickly.
8. Never add money logic, outcome generation for real money, or storage of balances. The placeholder games in `src/demo/` are play-money only and exist for sales demos.
9. If something in this file seems wrong or conflicts with a good implementation, say so and propose a change rather than silently deviating.
10. **Verify visual work with Playwright MCP** (from Phase 1). After changes to the scene, camera, UI, or transitions, open the dev server in headed mode, take screenshots at checkpoints (spawn view, each zone, mid-transition, seated view, mobile viewport 390×844), and check the console for errors before reporting a phase as done. Don't screenshot after every small edit. If screenshots look different from expected (e.g. black or very slow render), suspect software WebGL fallback and tell the human.
11. **Blender MCP limits** (from Phase 4): use it for modeling and asset cleanup only. Never download or generate assets through it without the human's explicit approval for that specific asset. Only operate on files inside this project.
12. **Check docs with Context7** before using any R3F, drei, Rapier, or three.js API you're not certain about.

---

## 11. Phases

| # | Phase | MCP added | Done when |
|---|---|---|---|
| 0 | Scaffold & foundations | Context7 | Vite/TS/R3F project, folder structure, lint/test setup, public types in `src/lib`, empty `mountAceHall`, `PROGRESS.md` and `ASSETS.md` created |
| 1 | Greybox scene & player | Playwright | Blockout casino with all zones and code-authored anchors (behind the loader interface), Rapier collisions, character controller, spring-arm camera with wall collision, desktop controls, anchor debug toggle |
| 2 | Interaction & sit-down transition | — | Proximity detection, prompts, highlight, walk-to-seat, sit animation, camera ease, reverse on exit, all timings in `tuning.ts` |
| 3 | Overlay, adapter & demo | — | Game overlay/iframe, postMessage bridge with origin checks, demo adapter, 3 play-money placeholder games (blackjack, roulette, slot), HUD, game list |
| 4 | Asset pipeline & art pass | Blender | Pipeline scripts, sourced + Blender-modeled assets replacing greybox, lighting pass, neon/bloom, ambient + spatial audio, `ASSETS.md` complete, credits screen |
| 5 | White-labeling & localization | — | Config drives brand colors/logos/signage/zones/object mapping, ka/en/ru, config validation with clear errors, 3 example brand themes, "Powered by AceHall" flag |
| 6 | Mobile & performance | Chrome DevTools | Touch controls, quality tiers + auto-detect, zone streaming, all budgets in section 8 met and measured |
| 7 | Packaging, demo site & docs | — | `acehall` npm library build, `<script>` embed build, static demo site with live theme switcher, `docs/INTEGRATION.md` (embed snippet, config reference, adapter example, operator checklist) |
| 8 | Polish & QA | — | Playwright test suite (load, walk, interact, open/close game, adapter errors), edge cases (slow network, iframe fails to load, `canPlay:false`), accessibility basics, final performance report |
