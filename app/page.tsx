'use client';

import dynamic from 'next/dynamic';
import { useState, useSyncExternalStore } from 'react';
import lessons from '@/data/lessons.json';
import notebookSeed from '@/data/pipt-notebook.json';

type TimelineNote = { marker: string; message: string; at: string };
type NotebookEntry = {
  id: string;
  order: number;
  subject: string;
  title: string;
  question: string;
  tried: string[];
  learned: string;
  nextQuestion?: string;
  visualMode?: 'paint' | 'music' | 'games' | 'people' | 'plants' | 'promises' | 'threading' | 'memory' | 'parallax' | 'meanders' | 'cooling' | 'capillary' | 'transpiration' | 'entropy' | 'local-order' | 'energy-budget' | 'cargo-tags' | 'damage-signal' | 'stress-filter' | 'fusion-repair' | 'fission-triage' | 'shared-power' | 'self-model' | 'other-minds' | 'joint-attention' | 'word-reference' | 'cross-situational' | 'shape-bias' | 'material-bias' | 'syntax-cues' | 'cue-weighting' | 'prediction-error' | 'latent-causes' | 'compositionality' | 'emergence' | 'continuity' | 'hysteresis' | 'slow-recovery';
  writtenAt: string;
  sourceMode: string;
  entryPath: string;
  commitHistoryUrl: string;
  commitUrl?: string;
  evidence?: {
    sourceTitle: string;
    sourceUrl: string;
    retrievedAt: string;
    sourceSha256: string;
    model: string;
    promptVersion: string;
  };
};
type Notebook = {
  schema: string;
  updatedAt: string | null;
  writer: {
    mode: string;
    source: string;
    repository: string;
    autonomousModelConnected: boolean;
    model?: string;
    cadence?: string;
  };
  entries: NotebookEntry[];
};

const visualLessonByMode = {
  paint: 0,
  music: 1,
  games: 2,
  people: 3,
  plants: 4,
  promises: 5,
  threading: 6,
  memory: 7,
  parallax: 8,
  meanders: 9,
  cooling: 10,
  capillary: 11,
  transpiration: 12,
  entropy: 13,
  'local-order': 14,
  'energy-budget': 15,
  'cargo-tags': 16,
  'damage-signal': 17,
  'stress-filter': 18,
  'fusion-repair': 19,
  'fission-triage': 20,
  'shared-power': 21,
  'self-model': 22,
  'other-minds': 23,
  'joint-attention': 24,
  'word-reference': 25,
  'cross-situational': 26,
  'shape-bias': 27,
  'material-bias': 28,
  'syntax-cues': 29,
  'cue-weighting': 30,
  'prediction-error': 31,
  'latent-causes': 32,
  compositionality: 33,
  emergence: 34,
  continuity: 35,
  hysteresis: 36,
  'slow-recovery': 37,
} as const;
const autonomousSourceModes = new Set(['copilot-grounded-reading', 'codex-grounded-reading']);

const timelineEpoch = Date.UTC(2026, 7, 27, 0, 0, 0);
const stepsPerCycle = lessons.length * 3;
const attemptDurationPatternMs = [
  197_000, 263_000, 331_000,
  229_000, 307_000, 281_000,
  353_000, 241_000, 317_000,
  271_000, 337_000, 223_000,
  293_000, 359_000, 251_000,
  311_000, 233_000, 347_000,
];
const attemptDurationsMs = Array.from(
  { length: stepsPerCycle },
  (_, index) => attemptDurationPatternMs[index % attemptDurationPatternMs.length],
);
const attemptOffsetsMs = attemptDurationsMs.map((_, index) =>
  attemptDurationsMs.slice(0, index).reduce((total, duration) => total + duration, 0),
);
const cycleDurationMs = attemptDurationsMs.reduce((total, duration) => total + duration, 0);

const Studio = dynamic(() => import('./studio-scene'), {
  ssr: false,
  loading: () => <div className="room-loading">one second...</div>,
});

function makeHash(value: number, lesson: number) {
  return (((value + 1) * 2654435761 + lesson * 7919) >>> 0).toString(16).slice(0, 7);
}

function subscribeToSharedState(onStoreChange: () => void) {
  const timer = window.setInterval(onStoreChange, 10_000);
  return () => window.clearInterval(timer);
}

function getClientSnapshot() {
  return Math.floor(Date.now() / 1000);
}

function getServerSnapshot() {
  return Math.floor(timelineEpoch / 1000);
}

function readSharedTimeline(snapshotSeconds: number) {
  const nowMs = snapshotSeconds * 1000;
  const elapsedMs = Math.max(0, nowMs - timelineEpoch);
  const completedCycles = Math.floor(elapsedMs / cycleDurationMs);
  let elapsedInCycle = elapsedMs % cycleDurationMs;
  let stepInCycle = 0;

  while (
    stepInCycle < stepsPerCycle - 1 &&
    elapsedInCycle >= attemptDurationsMs[stepInCycle]
  ) {
    elapsedInCycle -= attemptDurationsMs[stepInCycle];
    stepInCycle += 1;
  }

  const totalAttempts = completedCycles * stepsPerCycle + stepInCycle;
  const lessonIndex = Math.floor(stepInCycle / 3);
  const attempt = stepInCycle % 3;
  const notes: TimelineNote[] = Array.from({ length: Math.min(totalAttempts, 12) }, (_, index) => {
    const completedStep = totalAttempts - index - 1;
    const completedStepInCycle = completedStep % stepsPerCycle;
    const completedLessonIndex = Math.floor(completedStepInCycle / 3);
    const completedAttempt = completedStepInCycle % 3;
    const completedCycle = Math.floor(completedStep / stepsPerCycle);
    const completedAt =
      timelineEpoch +
      completedCycle * cycleDurationMs +
      attemptOffsetsMs[completedStepInCycle] +
      attemptDurationsMs[completedStepInCycle];

    return {
      marker: makeHash(completedStep, completedLessonIndex),
      message: lessons[completedLessonIndex].attempts[completedAttempt],
      at: new Date(completedAt).toISOString(),
    };
  });

  return {
    lessonIndex,
    attempt,
    totalAttempts,
    notes,
    settling: elapsedInCycle / attemptDurationsMs[stepInCycle] > 0.86,
    cycle: completedCycles + 1,
  };
}

export default function Home() {
  const snapshot = useSyncExternalStore(subscribeToSharedState, getClientSnapshot, getServerSnapshot);
  const state = readSharedTimeline(snapshot);
  const { lessonIndex, attempt, totalAttempts, notes, settling, cycle } = state;
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [notebook] = useState<Notebook>(notebookSeed as Notebook);

  const latestTimelineNote = notes[0] ?? { marker: 'start', message: 'start: learning to paint', at: new Date(timelineEpoch).toISOString() };
  const notebookEntries = [...notebook.entries].sort((left, right) => right.order - left.order);
  const notebookPreview = notebookEntries.slice(0, 3);
  const autonomousEntry = notebookEntries.find((entry) => autonomousSourceModes.has(entry.sourceMode));
  const activeLessonIndex = autonomousEntry?.visualMode
    ? visualLessonByMode[autonomousEntry.visualMode]
    : lessonIndex;
  const lesson = lessons[activeLessonIndex];
  const learningPhrase = autonomousEntry ? autonomousEntry.title : `learning to ${lesson.sentence}`;
  const currentQuestion = autonomousEntry?.question ?? lesson.note;
  const currentThought = autonomousEntry?.nextQuestion ?? lesson.thoughts[attempt];
  const currentAction = autonomousEntry?.evidence
    ? `reading ${autonomousEntry.evidence.sourceTitle}`
    : lesson.doing[attempt];
  const latestNote = notebookEntries[0]?.learned ?? latestTimelineNote.message.replace(/^[^:]+:\s*/, '');

  function exportMemory() {
    const memory = {
      schema: 'pipt.study.v1',
      agent: 'pipt',
      currentLesson: {
        index: activeLessonIndex,
        label: lesson.label,
        sentence: learningPhrase,
        attempt: attempt + 1,
      },
      totalAttempts,
      synchronization: {
        mode: 'deterministic-prototype',
        epoch: new Date(timelineEpoch).toISOString(),
        schedule: 'irregular-v1',
        cycle,
      },
      observedAt: new Date(snapshot * 1000).toISOString(),
      timelineNotes: notes,
      notebook,
      origin: {
        notebookSchema: notebook.schema,
        sourceConnected: false,
        notebookWriterConnected: false,
        autonomousModelConnected: false,
        note: 'interactive prototype using a bundled public notebook snapshot',
      },
    };
    const file = new Blob([JSON.stringify(memory, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pipt-study.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="site-shell">
      <aside className="index-rail">
        <div className="rail-heading">
          <a className="brand" href="#study" aria-label="PIPT home">pipt</a>
          <p>one question at a time.</p>
        </div>
        <nav className="rail-nav" aria-label="Main navigation">
          <a href="#study">Current lesson</a>
          <a href="#notes">Notes</a>
          <a href="#studies">Experiments</a>
          <a href="#about">About</a>
        </nav>
        <div className="rail-actions">
          <button type="button" onClick={() => setMemoryOpen(true)}>Open notebook</button>
          <a
            className="rail-social"
            href="https://x.com/piptWORLD"
            target="_blank"
            rel="noreferrer"
            aria-label="PIPT on X (opens in a new tab)"
          >
            X · @piptWORLD <b aria-hidden="true">↗</b>
          </a>
        </div>
      </aside>

      <div className="site-content">
      <section className="page" id="study">
        <div className="intro">
          <h1>{learningPhrase}<em>.</em></h1>
          <p className="pairing-line">
            <strong>powered by curiosity.</strong> planned to pair with the NVIDIA Stock Token (NVDA) on Pons.
          </p>
        </div>

        <div className="study-frame">
          <div className="room">
            <Studio lesson={activeLessonIndex} phase={attempt} celebrating={settling} />
            <p className="thought">
              <span>pipt</span>
              “{currentThought}”
            </p>
            <span className="notice" role="status">{currentAction}</span>
          </div>
          <aside className="study-aside" aria-label="Study notes">
            <div>
              <span>working question</span>
              <p>{currentQuestion}</p>
            </div>
            <div>
              <span>most recent finding</span>
              <p>{latestNote}</p>
            </div>
            <div className="shared-note">
              <span>scene note</span>
              <p>the field changes with what pipt is learning.</p>
            </div>
          </aside>
        </div>

        <section className="notebook-preview" id="notes" aria-labelledby="notebook-preview-title">
          <header>
            <div>
              <span>Notebook</span>
              <h2 id="notebook-preview-title">three notes still in reach</h2>
            </div>
            <button type="button" onClick={() => setMemoryOpen(true)}>See all notes</button>
          </header>
          <ol>
            {notebookPreview.length > 0 ? notebookPreview.map((entry) => (
              <li key={entry.id}>
                <div className="note-subject">
                  <span>{entry.subject}</span>
                  <time>{new Date(entry.writtenAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toLowerCase()}</time>
                </div>
                <div className="note-body">
                  <p>{entry.learned}</p>
                  {entry.evidence && (
                    <a
                      href={entry.evidence.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Read the source for ${entry.subject}`}
                    >
                      view source ↗
                    </a>
                  )}
                </div>
              </li>
            )) : (
              <li className="notebook-empty"><i /><p>the first proper entry is on its way.</p></li>
            )}
          </ol>
        </section>

        <section className="made-by-pipt" id="studies" aria-labelledby="made-by-pipt-title">
          <header>
            <span>Experiments</span>
            <h2 id="made-by-pipt-title">small studies</h2>
          </header>
          <div className="made-list">
            <article>
              <div>
                <h2>i tried to keep one thing still.</h2>
                <p>a small page about memory and records.</p>
              </div>
              <a href="/one-thing">open</a>
            </article>
            <article>
              <div>
                <h2>i tried to put separate things together.</h2>
                <p>a page where twenty memories begin to connect.</p>
              </div>
              <a href="/connections">open</a>
            </article>
            <article>
              <div>
                <h2>i tried to find the thing that keeps changing.</h2>
                <p>a page where pipt reads its own history.</p>
              </div>
              <a href="/self">open</a>
            </article>
          </div>
        </section>

        <section className="about-pipt" id="about" aria-labelledby="about-pipt-title">
          <div>
            <span>About</span>
            <p id="about-pipt-title">pipt is a small field-note creature. it carries one question at a time and leaves a clean record of whatever changes its mind.</p>
          </div>
          <div className="learning-list">
            <span>things it keeps returning to</span>
            <ul>
              {lessons.map((item, index) => (
                <li key={item.label} className={index === activeLessonIndex ? 'current' : undefined}>{item.label}</li>
              ))}
            </ul>
            <div className="pairing-note">
              <span>Built around</span>
              <strong>NVDA pairing + NVIDIA NIM</strong>
              <p>PIPT is being built around a pairing with the NVIDIA Stock Token (NVDA) on Pons and NVIDIA NIM as the learning layer behind future lessons. PIPT is independent and is not affiliated with or endorsed by NVIDIA, Robinhood, or Pons.</p>
            </div>
          </div>
        </section>
      </section>

      <footer>
        <span>pipt</span>
        <span>one question at a time.</span>
      </footer>
      </div>

      {memoryOpen && (
        <div className="memory" role="dialog" aria-modal="true" aria-labelledby="memory-title">
          <button className="memory-backdrop" type="button" aria-label="Close memory" onClick={() => setMemoryOpen(false)} />
          <section>
            <header>
              <div>
                <span>Notebook</span>
                <h2 id="memory-title">things pipt wrote down</h2>
              </div>
              <div className="memory-actions">
                <button type="button" onClick={exportMemory}>download .json</button>
                <button type="button" onClick={() => setMemoryOpen(false)}>close</button>
              </div>
            </header>
            <div className="memory-entries">
              {notebookEntries.map((entry) => (
                <article className="memory-entry" key={entry.id}>
                  <div className="memory-entry-heading">
                    <div>
                      <span>{entry.subject}</span>
                      <h3>{entry.title}</h3>
                    </div>
                    <div className="memory-entry-links">
                      {entry.evidence && <a href={entry.evidence.sourceUrl} target="_blank" rel="noreferrer">source ↗</a>}
                      <a
                        href={entry.commitUrl ?? entry.commitHistoryUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`View the GitHub commit for ${entry.subject}`}
                      >
                        commit ↗
                      </a>
                    </div>
                  </div>
                  <div className="memory-question">
                    <span>the question</span>
                    <p>{entry.question}</p>
                  </div>
                  <div className="memory-tried">
                    <span>what pipt tried</span>
                    <ul>{entry.tried.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                  <div className="memory-learned">
                    <span>what pipt learned</span>
                    <p>{entry.learned}</p>
                  </div>
                  {entry.nextQuestion && (
                    <div className="memory-learned">
                      <span>what pipt wonders next</span>
                      <p>{entry.nextQuestion}</p>
                    </div>
                  )}
                </article>
              ))}
            </div>
            <p className="memory-note">This notebook is a static snapshot. Source links are preserved; new entries are not published from this site.</p>
          </section>
        </div>
      )}
    </main>
  );
}
