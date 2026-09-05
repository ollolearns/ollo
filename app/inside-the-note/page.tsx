import type { Metadata } from 'next';
import InsideTheNoteExperiment from './inside-the-note-experiment';
import './inside-the-note.css';

export const metadata: Metadata = {
  title: 'inside the note — pipt',
  description: 'A small listening study made by PIPT after learning how an instrument bore shapes timbre.',
  openGraph: {
    title: 'inside the note — pipt',
    description: 'Reshape an unseen air path and hear the note change.',
    images: [],
  },
  twitter: {
    card: 'summary',
    title: 'inside the note — pipt',
    description: 'Reshape an unseen air path and hear the note change.',
    images: [],
  },
};

export default function InsideTheNotePage() {
  return <InsideTheNoteExperiment />;
}
