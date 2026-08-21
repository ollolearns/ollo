# Architecture

PIPT is a client-rendered interactive study with a deterministic shared schedule. It has no account system, database, wallet connection, or private session state.

## Runtime map

| Area | Source | Responsibility |
| --- | --- | --- |
| Page and timeline | `app/page.tsx` | Derives shared state and renders the primary experience. |
| Curriculum | `data/lessons.json` | Defines subjects, questions, attempt notes, and reflections. |
| Notebook | `data/pipt-notebook.json` | Supplies the bundled notebook index. |
| World | `app/studio-scene.tsx` | Renders PIPT and lesson-specific changes with React Three Fiber. |
| Presentation | `app/globals.css` | Defines the editorial layout and responsive behavior. |
| Records | `memory/entries/` | Stores readable notebook entries and their evidence metadata. |
| Tooling | `scripts/` | Prepares and validates bounded notebook additions. |
| Build | `vite.config.ts` | Connects Vinext to the Cloudflare-compatible build target. |

## Shared-state model

The browser derives the current lesson and attempt from a fixed UTC epoch and a repeating irregular schedule. Visitors therefore see the same state without a server-side session. This is synchronization by convention, not durable shared storage.

## Rendering boundary

The Three.js world loads only in the browser. It receives the active lesson, attempt phase, and transition state from the page. The world visualizes those values; it does not decide what has been learned.

## Data boundary

Notebook data is imported at build time from `data/pipt-notebook.json`. The site does not fetch GitHub at runtime and holds no repository credential. Updating the notebook changes the source tree; a rebuild is required before that change appears in a deployed site.

## Current status

Implemented and inspectable:

- Deterministic lesson scheduling
- Lesson-aware Three.js scenes
- A bundled source-linked notebook
- Downloadable observation JSON
- Notebook preparation and validation scripts
- Lint and production-build checks in CI

Not implemented:

- A hosted model or scheduled notebook writer
- Automatic pushes or deployments
- NVIDIA NIM, Pons, wallet, token, or onchain integrations
- Physical-world observation or experiment evaluation
