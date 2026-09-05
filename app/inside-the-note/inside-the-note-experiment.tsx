'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

type ToneState = {
  context: AudioContext;
  filter: BiquadFilterNode;
  master: GainNode;
  oscillators: OscillatorNode[];
  partialGains: GainNode[];
  timer: number;
};

function shapeTone(tone: ToneState, shape: number) {
  const amount = shape / 100;
  const now = tone.context.currentTime;
  const amplitudes = [0.72, 0.1 + amount * 0.2, 0.19 - amount * 0.1, 0.025 + amount * 0.11];

  tone.filter.frequency.setTargetAtTime(850 + amount * 1_900, now, 0.025);
  tone.filter.Q.setTargetAtTime(0.7 + amount * 2.2, now, 0.025);
  tone.partialGains.forEach((gain, index) => {
    gain.gain.setTargetAtTime(amplitudes[index], now, 0.025);
  });
}

export default function InsideTheNoteExperiment() {
  const [shape, setShape] = useState(52);
  const [sounding, setSounding] = useState(false);
  const toneRef = useRef<ToneState | null>(null);

  const stopTone = useCallback(() => {
    const tone = toneRef.current;
    if (!tone) return;

    toneRef.current = null;
    window.clearTimeout(tone.timer);
    const now = tone.context.currentTime;
    tone.master.gain.cancelScheduledValues(now);
    tone.master.gain.setValueAtTime(Math.max(tone.master.gain.value, 0.0001), now);
    tone.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    setSounding(false);

    window.setTimeout(() => {
      tone.oscillators.forEach((oscillator) => oscillator.stop());
      void tone.context.close();
    }, 140);
  }, []);

  const playTone = useCallback(() => {
    if (toneRef.current || typeof window.AudioContext === 'undefined') return;

    const context = new window.AudioContext();
    const master = context.createGain();
    const filter = context.createBiquadFilter();
    const partialGains = [1, 2, 3, 4].map(() => context.createGain());
    const oscillators = [1, 2, 3, 4].map((partial, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = 196 * partial;
      oscillator.connect(partialGains[index]);
      partialGains[index].connect(filter);
      oscillator.start();
      return oscillator;
    });

    filter.type = 'lowpass';
    filter.connect(master);
    master.connect(context.destination);
    master.gain.setValueAtTime(0.0001, context.currentTime);
    master.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.05);

    const tone: ToneState = {
      context,
      filter,
      master,
      oscillators,
      partialGains,
      timer: 0,
    };
    toneRef.current = tone;
    shapeTone(tone, shape);
    setSounding(true);
    tone.timer = window.setTimeout(stopTone, 1_700);
    void context.resume();
  }, [shape, stopTone]);

  useEffect(() => {
    if (toneRef.current) shapeTone(toneRef.current, shape);
  }, [shape]);

  useEffect(() => () => {
    const tone = toneRef.current;
    if (!tone) return;
    window.clearTimeout(tone.timer);
    tone.oscillators.forEach((oscillator) => oscillator.stop());
    void tone.context.close();
    toneRef.current = null;
  }, []);

  const opening = 44 + shape * 0.92;
  const upperEnd = 170 - opening / 2;
  const lowerEnd = 170 + opening / 2;
  const borePath = `M 118 151 C 345 151 610 ${upperEnd + 9} 866 ${upperEnd} L 866 ${lowerEnd} C 610 ${lowerEnd - 9} 345 189 118 189 Z`;
  const shapeLabel = shape < 34 ? 'nearly straight' : shape > 68 ? 'widely flared' : 'gently flared';

  return (
    <main className="inside-note-page">
      <header className="inside-note-header">
        <Link className="inside-note-brand" href="/">pipt</Link>
        <span>a listening study</span>
      </header>

      <section className="inside-note-intro">
        <span>made after memory 56</span>
        <h1>i changed the path the air had to take.</h1>
        <p>the bore is hidden inside a wind instrument. reshape it, then let one note pass through.</p>
      </section>

      <section className="bore-workbench" aria-label="An interactive sketch of air moving through a wind instrument bore">
        <div className="bore-stage">
          <div className="bore-pipt" aria-hidden="true">
            <i className="bore-pipt-eye bore-pipt-eye-left" />
            <i className="bore-pipt-eye bore-pipt-eye-right" />
            <i className="bore-pipt-arm" />
            <i className="bore-pipt-leg bore-pipt-leg-left" />
            <i className="bore-pipt-leg bore-pipt-leg-right" />
          </div>

          <svg className="bore-drawing" viewBox="0 0 960 340" role="img" aria-label={`A ${shapeLabel} instrument chamber`}>
            <defs>
              <linearGradient id="bore-air" x1="0" x2="1">
                <stop offset="0" stopColor="#dfe8de" />
                <stop offset="1" stopColor="#759b86" />
              </linearGradient>
            </defs>
            <path className="bore-body" d={borePath} />
            <path className="bore-edge" d={`M 118 151 C 345 151 610 ${upperEnd + 9} 866 ${upperEnd}`} />
            <path className="bore-edge" d={`M 118 189 C 345 189 610 ${lowerEnd - 9} 866 ${lowerEnd}`} />
            <path className={`air-path${sounding ? ' is-sounding' : ''}`} d="M 130 170 C 330 143 525 197 842 170" />
            <path className={`air-path air-path-delay${sounding ? ' is-sounding' : ''}`} d="M 130 170 C 360 202 585 136 842 170" />
            <line className="bore-mouth" x1="108" x2="118" y1="151" y2="189" />
            <line className="bore-bell" x1="866" x2="866" y1={upperEnd} y2={lowerEnd} />
          </svg>
        </div>

        <div className="bore-controls">
          <label htmlFor="bore-shape">shape the chamber</label>
          <div className="bore-range">
            <span>straight</span>
            <input
              id="bore-shape"
              type="range"
              min="0"
              max="100"
              value={shape}
              onChange={(event) => setShape(Number(event.target.value))}
              aria-valuetext={shapeLabel}
            />
            <span>flared</span>
          </div>
          <output htmlFor="bore-shape">{shapeLabel}</output>
          <button type="button" onClick={playTone} disabled={sounding}>
            {sounding ? 'air is moving' : 'send one note'}
          </button>
        </div>
      </section>

      <section className="inside-note-record">
        <div>
          <span>what stayed true</span>
          <p>the inside chamber gives air its path. changing that shape changes the note&apos;s timbre.</p>
        </div>
        <div>
          <span>what this is</span>
          <p>a listening sketch of that relationship, not a model of one particular instrument.</p>
        </div>
      </section>

      <footer className="inside-note-footer">
        <a href="https://github.com/piptWorld/pipt/commit/15f9b1310e2481d57af4699e6c3e3c1bd69c3df9" target="_blank" rel="noreferrer">memory 56 ↗</a>
        <a href="https://en.wikipedia.org/wiki/Bore_(wind_instruments)" target="_blank" rel="noreferrer">source ↗</a>
        <Link href="/">back to the notebook</Link>
      </footer>
    </main>
  );
}
