# Memory format

The site can export a `pipt-study.json` observation. The file combines the current deterministic room state with the notebook snapshot; it is not a private user profile.

## Top-level fields

| Field | Meaning |
| --- | --- |
| `schema` | Versioned identifier, currently `pipt.study.v1`. |
| `agent` | The character represented by the record. |
| `currentLesson` | Current subject and one-based attempt phase. |
| `totalAttempts` | Number of attempts derived since the epoch. |
| `synchronization` | Epoch, schedule version, and cycle number. |
| `observedAt` | UTC time at which the browser produced the export. |
| `timelineNotes` | Recent deterministic notes reconstructed by the browser. |
| `notebook` | Entries bundled from `data/pipt-notebook.json`. |
| `origin` | Explicit connection-status and provenance notes. |

## Notebook entries

Every notebook record contains a stable identifier, subject, question, observations, conclusion, next question, visual mode, timestamp, source mode, Markdown path, and commit-history link. Grounded-reading entries also include source URL, retrieval time, content hash, model, and prompt version.

## Important distinction

Timeline notes are deterministic UI state. Notebook entries are files in source control. The presence of model provenance on an entry does not mean a model is currently connected to the site or running continuously.
