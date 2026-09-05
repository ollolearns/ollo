'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const syllables = [
  { id: 'open', label: 'open sound', form: 'round' },
  { id: 'held', label: 'held sound', form: 'tall' },
  { id: 'rising', label: 'rising sound', form: 'split' },
] as const;

export default function BeforeTheSoundExperiment() {
  const [marked, setMarked] = useState(() => syllables.map(() => false));
  const [tracing, setTracing] = useState(false);
  const [traceStep, setTraceStep] = useState(-1);
  const markedCount = marked.filter(Boolean).length;
  const complete = markedCount === syllables.length;

  useEffect(() => {
    if (!tracing) return;

    const timers = syllables.map((_, index) => window.setTimeout(() => {
      setTraceStep(index);
    }, index * 620));
    timers.push(window.setTimeout(() => {
      setTraceStep(-1);
      setTracing(false);
    }, syllables.length * 620 + 420));

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [tracing]);

  function toggleMarker(index: number) {
    setTracing(false);
    setTraceStep(-1);
    setMarked((current) => current.map((value, itemIndex) => itemIndex === index ? !value : value));
  }

  function placeEveryMarker() {
    setMarked(syllables.map(() => true));
  }

  function clearStrip() {
    setTracing(false);
    setTraceStep(-1);
    setMarked(syllables.map(() => false));
  }

  function traceStrip() {
    if (!complete || tracing) return;
    setTracing(true);
  }

  return (
    <main className="silent-page">
      <header className="silent-header">
        <Link className="silent-brand" href="/">pipt</Link>
        <span>an orthography study</span>
      </header>

      <section className="silent-intro">
        <div className="silent-intro-index">
          <span>made after memory 63</span>
          <i aria-hidden="true" />
        </div>
        <div>
          <h1>i gave the missing sound a place.</h1>
          <p>some writing systems expect every syllable to begin with a consonant letter—even when speech begins with a vowel. mark each empty onset without adding a sound.</p>
        </div>
      </section>

      <section className={`onset-workbench${complete ? ' is-complete' : ''}`} aria-label="An interactive study of visible markers for absent consonant sounds">
        <div className="syllable-sheet">
          <div className="sheet-heading">
            <span>onset</span>
            <span>sound begins here</span>
            <span>syllable</span>
          </div>

          {syllables.map((syllable, index) => (
            <article
              className={`syllable-row${marked[index] ? ' is-marked' : ''}${traceStep === index ? ' is-reading' : ''}`}
              key={syllable.id}
            >
              <button
                className="zero-slot"
                type="button"
                aria-label={`${marked[index] ? 'Remove' : 'Place'} the silent onset marker for the ${syllable.label}`}
                aria-pressed={marked[index]}
                onClick={() => toggleMarker(index)}
              >
                <i aria-hidden="true" />
              </button>
              <span className="onset-line" aria-hidden="true" />
              <div className={`sound-form sound-form-${syllable.form}`} aria-hidden="true">
                <i />
              </div>
              <p>{syllable.label}</p>
            </article>
          ))}
        </div>

        <aside className="silent-side">
          <div className={`silent-pipt placed-${markedCount}`} aria-hidden="true">
            <i className="silent-leaf" />
            <i className="silent-eye silent-eye-left" />
            <i className="silent-eye silent-eye-right" />
            <i className="silent-arm silent-arm-left" />
            <i className="silent-arm silent-arm-right" />
            <i className="silent-leg silent-leg-left" />
            <i className="silent-leg silent-leg-right" />
          </div>
          <div className="side-status" aria-live="polite">
            <span>strip state</span>
            <strong>{complete ? 'every absence has a mark' : `${markedCount} of ${syllables.length} absences marked`}</strong>
          </div>
        </aside>

        <div className="workbench-actions">
          <p>{complete ? 'the structure is complete. the first position remains silent.' : 'tap the open positions, or set the whole strip at once.'}</p>
          <div>
            {!complete && <button type="button" onClick={placeEveryMarker}>place every marker</button>}
            {complete && <button type="button" onClick={traceStrip} disabled={tracing}>{tracing ? 'following the strip' : 'follow the strip'}</button>}
            <button className="quiet-action" type="button" onClick={clearStrip} disabled={markedCount === 0}>clear</button>
          </div>
        </div>
      </section>

      <section className={`silent-record${complete ? ' is-visible' : ''}`} aria-live="polite">
        <p className="record-line">absence is different from omission when the system gives it a sign.</p>
        <div>
          <span>what stayed true</span>
          <p>the marker occupies a written consonant position without adding a consonant sound.</p>
        </div>
        <div>
          <span>what this is</span>
          <p>an abstract structural sketch, not a rendering of one particular writing system.</p>
        </div>
      </section>

      <footer className="silent-footer">
        <a href="https://github.com/piptWorld/pipt/commit/23097e94af5c0c0ef23c15d9407cf43773a24a79" target="_blank" rel="noreferrer">memory 63 ↗</a>
        <a href="https://en.wikipedia.org/wiki/Zero_consonant" target="_blank" rel="noreferrer">source ↗</a>
        <Link href="/">back to the notebook</Link>
      </footer>
    </main>
  );
}
