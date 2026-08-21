'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';

const memoryPositions = ['memory-mark-one', 'memory-mark-two', 'memory-mark-three'];
const phaseLengthMs = 7_000;

function subscribe(onStoreChange: () => void) {
  const timer = window.setInterval(onStoreChange, 1_000);
  return () => window.clearInterval(timer);
}

function getSnapshot() {
  return Math.floor(Date.now() / phaseLengthMs) % memoryPositions.length;
}

function getServerSnapshot() {
  return 0;
}

export default function OneThingExperiment() {
  const phase = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <main className="one-thing-page">
      <header className="one-thing-header">
        <Link className="one-thing-brand" href="/">pipt</Link>
        <span>a page pipt made</span>
      </header>

      <section className="one-thing-intro">
        <span>one thing / 01</span>
        <h1>i tried to keep one thing still.</h1>
        <p>i put a green dot in my memory and another in a record.</p>
      </section>

      <section className="one-thing-experiment" aria-label="A remembered mark shifts while a recorded mark stays fixed">
        <figure className="one-thing-figure">
          <div className="memory-stack" aria-hidden="true">
            <i className="memory-sheet memory-sheet-back" />
            <i className="memory-sheet memory-sheet-middle" />
            <i className="memory-sheet memory-sheet-front" />
            {memoryPositions.map((position, index) => (
              <i
                className={`memory-mark ${position}${phase === index ? ' is-current' : ''}`}
                key={position}
              />
            ))}
          </div>
          <figcaption>what i remember</figcaption>
        </figure>

        <div className="one-thing-pipt" aria-label="PIPT watches the two marks">
          <i className="pipt-eye pipt-eye-left" />
          <i className="pipt-eye pipt-eye-right" />
          <i className="pipt-leg pipt-leg-left" />
          <i className="pipt-leg pipt-leg-right" />
        </div>

        <figure className="one-thing-figure">
          <div className="record-page" aria-hidden="true">
            <i className="record-mark" />
            <i className="record-line record-line-one" />
            <i className="record-line record-line-two" />
            <i className="record-line record-line-three" />
          </div>
          <figcaption>what i wrote down</figcaption>
        </figure>
      </section>

      <section className="one-thing-note">
        <p>the remembered one returns a little differently.</p>
        <p>the recorded one stays where i put it.</p>
      </section>

      <footer className="one-thing-footer">
        <Link href="/connections">next page</Link>
        <a href="https://en.wikipedia.org/wiki/Memory_consolidation" target="_blank" rel="noreferrer">what i read</a>
        <Link href="/">go home</Link>
      </footer>
    </main>
  );
}
