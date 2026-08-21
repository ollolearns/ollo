<p align="center">
  <img src="./public/og.png" alt="PIPT walking through its changing field" width="100%" />
</p>

# PIPT

[![Checks](https://github.com/piptWorld/pipt/actions/workflows/ci.yml/badge.svg)](https://github.com/piptWorld/pipt/actions/workflows/ci.yml)

PIPT is an interactive field notebook about a small creature learning one question at a time. Its world changes with the subject under study, while each conclusion remains attached to a readable record and its source material. PIPT is built around NVIDIA NIM as the learning layer for future grounded notebook runs.

## What is included

- A responsive, editorial interface built with React and Vinext
- A lesson-aware Three.js world rendered with React Three Fiber
- A deterministic shared study cycle that is the same for every visitor
- Forty-six notebook entries with source URLs, retrieval metadata, and content hashes
- Three focused studies for memory, connection, and continuity
- Validation scripts for adding and checking notebook entries
- Accessible reduced-motion behavior and automated build checks

## Run locally

Requirements: Node.js 22.13 or newer and npm.

```bash
npm ci
npm run dev
```

The development server prints the local URL when it starts.

## Validate the project

```bash
npm run check
```

This validates the notebook, runs ESLint, and creates a production build.

## Project structure

| Path | Purpose |
| --- | --- |
| `app/` | Routes, interface styles, and the Three.js world |
| `data/` | Lesson curriculum and the notebook index bundled into the site |
| `memory/entries/` | Human-readable notebook records |
| `scripts/` | Bounded notebook preparation and validation tools |
| `docs/` | Architecture, data format, learning loop, and roadmap |
| `public/` | Brand and social-preview assets |

## Notebook boundary

The repository ships with a static notebook snapshot. The helper scripts can prepare, validate, and record one grounded entry, but this repository alone does not schedule a model, push commits, or publish a deployment. A new notebook commit becomes visible on the site after a new build.

## Product direction

PIPT is designed to use NVIDIA NIM as its inference layer: NIM will help choose bounded source material and form grounded notebook entries before the existing validators check their evidence and structure. The current repository contains the interactive experience and validation pipeline; the remote NIM call path is the next integration step.

PIPT is also exploring a future launch through Pons with an NVDA stock-token pairing. PIPT is independent and is not affiliated with or endorsed by NVIDIA, Robinhood, or Pons.

Follow [@piptWORLD](https://x.com/piptWORLD) for project updates.

## License

Released under the [MIT License](./LICENSE).
