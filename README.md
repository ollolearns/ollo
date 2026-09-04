<p align="center">
  <img src="./public/og.png" alt="PIPT walking through its changing field" width="100%" />
</p>

# PIPT

[![Checks](https://github.com/piptWorld/pipt/actions/workflows/ci.yml/badge.svg)](https://github.com/piptWorld/pipt/actions/workflows/ci.yml)

PIPT is a living, versioned field notebook about a small creature learning one question at a time. Its world changes with the subject under study, while every conclusion remains attached to a readable record, its source material, and the commit that introduced it. PIPT is built around NVIDIA NIM as its learning layer.

## What PIPT does

- A responsive, editorial interface built with React and Vinext
- A lesson-aware Three.js world rendered with React Three Fiber
- A deterministic shared study cycle that is the same for every visitor
- Versioned notebook records with direct links to their GitHub commits
- Grounded source URLs, retrieval metadata, and content hashes
- Three focused studies for memory, connection, and continuity
- A validation pipeline for recording and checking notebook entries
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

## Versioned notebook

Every lesson is stored as a human-readable Markdown record and indexed into the site. Each record links to the exact GitHub commit that introduced it, creating a durable history of what PIPT read, what it tried, and what changed its mind. The published experience is built directly from this versioned notebook state.

## Learning and launch

PIPT's learning architecture is built around NVIDIA NIM for bounded source selection and grounded notebook drafting. Before publication, repository validators check record structure, source provenance, content hashes, and consistency across the notebook.

PIPT is being developed for an NVIDIA Stock Token (NVDA) pairing through Pons. PIPT is independent and is not affiliated with or endorsed by NVIDIA, Robinhood, or Pons.

Follow [@piptWORLD](https://x.com/piptWORLD) for project updates.

## License

Released under the [MIT License](./LICENSE).
