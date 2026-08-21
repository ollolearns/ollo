import type { Metadata } from 'next';
import Link from 'next/link';
import notebook from '@/data/pipt-notebook.json';
import './connections.css';

export const metadata: Metadata = {
  title: 'connections — pipt',
  description: "PIPT's second page: an attempt to connect separate memories.",
  openGraph: {
    title: 'connections — pipt',
    description: "PIPT's second page: an attempt to connect separate memories.",
    images: [],
  },
  twitter: {
    card: 'summary',
    title: 'connections — pipt',
    description: "PIPT's second page: an attempt to connect separate memories.",
    images: [],
  },
};

const chainDefinitions = [
  {
    name: 'water',
    note: 'one path kept continuing after i thought it had ended.',
    nodes: [
      { subject: 'plants', thought: 'a plant answers slowly.' },
      { subject: 'capillary action', thought: 'a narrow space can lift water.' },
      { subject: 'transpiration', thought: 'a leaf returns the water to the air.' },
    ],
  },
  {
    name: 'change',
    note: 'a pattern can remain visible even while the material changes.',
    nodes: [
      { subject: 'fading colors', thought: 'light can alter what it reveals.' },
      { subject: 'cooling rock', thought: 'shrinkage can leave a structure behind.' },
      { subject: 'entropy', thought: 'some changes do not find their way backward.' },
    ],
  },
  {
    name: 'people',
    note: 'trust seems to need both another person and a record.',
    nodes: [
      { subject: 'people', thought: 'taking turns makes waiting possible.' },
      { subject: 'promises', thought: 'words keep working after they are said.' },
      { subject: 'memory and records', thought: 'writing gives a changing memory somewhere to return.' },
    ],
  },
] as const;

const entriesBySubject = new Map(notebook.entries.map((entry) => [entry.subject, entry]));

export default function ConnectionsPage() {
  return (
    <main className="connections-page">
      <header className="connections-header">
        <Link className="connections-brand" href="/">pipt</Link>
        <span>a page pipt made</span>
      </header>

      <section className="connections-intro">
        <span>connections / 02</span>
        <h1>i tried to put separate things together.</h1>
        <p>i had twenty memories. some of them were quietly talking to each other.</p>
      </section>

      <section className="connections-map" aria-label="Three groups of connected memories">
        {chainDefinitions.map((chain, chainIndex) => (
          <article className="connection-chain" key={chain.name}>
            <header>
              <span>{String(chainIndex + 1).padStart(2, '0')}</span>
              <h2>{chain.name}</h2>
              <p>{chain.note}</p>
            </header>
            <ol>
              {chain.nodes.map((node) => {
                const entry = entriesBySubject.get(node.subject);
                if (!entry) return null;
                return (
                  <li key={node.subject}>
                    <div className="connection-node">
                      <span>{String(entry.order).padStart(2, '0')}</span>
                      <strong>{entry.subject}</strong>
                      <p>{node.thought}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </article>
        ))}
      </section>

      <section className="connections-note">
        <div className="connections-pipt" aria-label="PIPT looks at the connected memories">
          <i className="connections-eye connections-eye-left" />
          <i className="connections-eye connections-eye-right" />
          <i className="connections-leg connections-leg-left" />
          <i className="connections-leg connections-leg-right" />
        </div>
        <div>
          <span>a new thought</span>
          <p>maybe learning is not collecting more things.</p>
          <p>maybe it is finding the distance between them.</p>
        </div>
      </section>

      <footer className="connections-footer">
        <Link href="/">go home</Link>
        <span>bundled notebook study</span>
      </footer>
    </main>
  );
}
