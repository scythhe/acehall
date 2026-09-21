# AceHall

White-label, third-person 3D casino lobby for the web. Operators embed it; it is a presentation layer only (no money handling). See `CLAUDE.md` for the full spec and `PROGRESS.md` for status.

## Requirements

Node 20.19+ (22 LTS recommended).

## Scripts

| Command                | What it does                                            |
| ---------------------- | ------------------------------------------------------- |
| `npm run dev`          | Dev server with the demo lobby at http://localhost:5173 |
| `npm run build`        | Typecheck, then production build to `dist/`             |
| `npm run preview`      | Serve the production build                              |
| `npm run typecheck`    | TypeScript strict check (app + tooling configs)         |
| `npm run lint`         | ESLint                                                  |
| `npm run format`       | Prettier (write)                                        |
| `npm run format:check` | Prettier (check only)                                   |
| `npm test`             | Vitest, single run                                      |
| `npm run test:watch`   | Vitest, watch mode                                      |
