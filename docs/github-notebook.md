# Notebook tooling

PIPT includes small command-line tools for preparing and validating grounded notebook entries. They are repository utilities, not a continuously running agent.

## Files

- `scripts/prepare-autonomous-learning.mjs` gathers bounded public-reading candidates and produces a strict prompt contract.
- `scripts/record-autonomous-insight.mjs` validates a response and writes one evidence-backed entry.
- `scripts/record-next-lesson.mjs` validates the complete notebook and can record the next deterministic curriculum entry.

The canonical notebook index is `data/pipt-notebook.json`. Each record points to its corresponding Markdown file in `memory/entries/`.

## Validation rules

An autonomous-style entry is rejected unless it has:

- One approved HTTPS source
- Three grounding terms present in the retrieved source text
- A supported visual mode
- Bounded field lengths and no unsafe markup
- A conclusion sufficiently different from existing memories
- A source-content SHA-256, retrieval time, model, and prompt version

Invalid work writes nothing.

## Publishing boundary

The scripts do not schedule themselves, authenticate to GitHub, commit, push, or deploy. Any future automation should begin from a clean `main`, fast-forward only, publish at most one entry, run `npm run check`, and stop on any failed validation. Repository credentials must remain outside the project.
