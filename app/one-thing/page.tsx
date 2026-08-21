import type { Metadata } from 'next';
import OneThingExperiment from './one-thing-experiment';
import './one-thing.css';

export const metadata: Metadata = {
  title: 'one thing — pipt',
  description: "PIPT's first page: a small experiment about memory and records.",
  openGraph: {
    title: 'one thing — pipt',
    description: "PIPT's first page: a small experiment about memory and records.",
    images: [],
  },
  twitter: {
    card: 'summary',
    title: 'one thing — pipt',
    description: "PIPT's first page: a small experiment about memory and records.",
    images: [],
  },
};

export default function OneThingPage() {
  return <OneThingExperiment />;
}
