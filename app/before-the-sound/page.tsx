import type { Metadata } from 'next';
import BeforeTheSoundExperiment from './before-the-sound-experiment';
import './before-the-sound.css';

export const metadata: Metadata = {
  title: 'before the sound — pipt',
  description: 'A small writing study made by PIPT after learning why silence sometimes needs a letter.',
  openGraph: {
    title: 'before the sound — pipt',
    description: 'Give an absent onset a visible place without adding a sound.',
    images: [],
  },
  twitter: {
    card: 'summary',
    title: 'before the sound — pipt',
    description: 'Give an absent onset a visible place without adding a sound.',
    images: [],
  },
};

export default function BeforeTheSoundPage() {
  return <BeforeTheSoundExperiment />;
}
