import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const groundedSourceHosts = new Set(['astrobiology.nasa.gov', 'classics.mit.edu', 'en.wikipedia.org', 'pmc.ncbi.nlm.nih.gov', 'science.nasa.gov', 'www.archives.gov', 'www.grc.nasa.gov', 'www.red3d.com', 'www.usgs.gov']);
import process from 'node:process';

const root = process.cwd();
const curriculumPath = path.join(root, 'data', 'lessons.json');
const notebookPath = path.join(root, 'data', 'pipt-notebook.json');
const entriesDirectory = path.join(root, 'memory', 'entries');
const argumentsSet = new Set(process.argv.slice(2));
const jsonOutput = argumentsSet.has('--json');
const dryRun = argumentsSet.has('--dry-run');
const checkOnly = argumentsSet.has('--check');

function report(value) {
  process.stdout.write(jsonOutput ? `${JSON.stringify(value)}\n` : `${value.message}\n`);
}

function entryPathFor(lesson) {
  return `memory/entries/${String(lesson.order).padStart(2, '0')}-${lesson.slug}.md`;
}

function commitHistoryUrlFor(entryPath) {
  return `https://github.com/piptWorld/pipt/commits/main/${entryPath}`;
}

function renderEntry(lesson, writtenAt) {
  const entryPath = entryPathFor(lesson);
  return {
    id: `lesson-${String(lesson.order).padStart(2, '0')}-${lesson.slug}`,
    order: lesson.order,
    subject: lesson.label,
    title: `learning to ${lesson.sentence}`,
    question: lesson.question,
    tried: lesson.attempts.map((attempt) => attempt.replace(/^[^:]+:\s*/, '')),
    learned: lesson.learned,
    writtenAt,
    sourceMode: 'deterministic-curriculum',
    entryPath,
    commitHistoryUrl: commitHistoryUrlFor(entryPath),
  };
}

function renderMarkdown(entry) {
  const tried = entry.tried.map((item) => `- ${item}`).join('\n');
  return `# ${entry.subject}\n\n` +
    `> ${entry.question}\n\n` +
    `## what I tried\n\n${tried}\n\n` +
    `## what I learned\n\n${entry.learned}\n\n` +
    `---\n\n` +
    `Written at ${entry.writtenAt}. This entry was recorded from PIPT's versioned curriculum by the public notebook workflow. The autonomous model runner is not connected yet.\n`;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function checkNotebook(curriculum, notebook) {
  if (notebook.schema !== 'pipt.notebook.v1' || !Array.isArray(notebook.entries)) {
    throw new Error('The notebook index has an unsupported shape.');
  }
  if (
    notebook.writer?.repository !== 'https://github.com/piptWorld/pipt' ||
    typeof notebook.writer?.autonomousModelConnected !== 'boolean'
  ) {
    throw new Error('The notebook writer metadata is incomplete.');
  }

  const curriculumBySubject = new Map(curriculum.map((lesson) => [lesson.label, lesson]));
  const ids = new Set();

  for (const entry of notebook.entries) {
    if (ids.has(entry.id)) throw new Error(`Duplicate notebook entry: ${entry.id}`);
    ids.add(entry.id);

    const lesson = curriculumBySubject.get(entry.subject);
    if (entry.sourceMode === 'deterministic-curriculum') {
      if (!lesson) throw new Error(`Notebook subject is not in the curriculum: ${entry.subject}`);
      if (entry.learned !== lesson.learned) throw new Error(`Notebook reflection drifted for: ${entry.subject}`);
      if (entry.entryPath !== entryPathFor(lesson)) throw new Error(`Unexpected entry path for: ${entry.subject}`);
    } else if (['copilot-grounded-reading', 'codex-grounded-reading'].includes(entry.sourceMode)) {
      if (!entry.nextQuestion?.endsWith('?')) throw new Error(`Autonomous entry has no next question: ${entry.subject}`);
      if (!['paint', 'music', 'games', 'people', 'plants', 'promises', 'threading', 'memory', 'parallax', 'meanders', 'cooling', 'capillary', 'transpiration', 'entropy', 'local-order', 'energy-budget', 'cargo-tags', 'damage-signal', 'stress-filter', 'fusion-repair', 'fission-triage', 'shared-power', 'self-model', 'other-minds', 'joint-attention', 'word-reference', 'cross-situational', 'shape-bias', 'material-bias', 'syntax-cues', 'cue-weighting', 'prediction-error', 'latent-causes', 'compositionality', 'emergence', 'continuity', 'hysteresis', 'slow-recovery'].includes(entry.visualMode)) {
        throw new Error(`Autonomous entry has an invalid visual mode: ${entry.subject}`);
      }
      let sourceUrl;
      try {
        sourceUrl = new URL(entry.evidence?.sourceUrl);
      } catch {
        sourceUrl = null;
      }
      if (sourceUrl?.protocol !== 'https:' || !groundedSourceHosts.has(sourceUrl.hostname)) {
        throw new Error(`Autonomous entry has an invalid source: ${entry.subject}`);
      }
      if (!/^[a-f0-9]{64}$/.test(entry.evidence.sourceSha256 ?? '')) {
        throw new Error(`Autonomous entry has an invalid source hash: ${entry.subject}`);
      }
      const expectedModel = entry.sourceMode === 'codex-grounded-reading'
        ? 'gpt-5.6-sol'
        : 'github-copilot/automatic';
      if (entry.evidence.model !== expectedModel) {
        throw new Error(`Autonomous entry has an unexpected model: ${entry.subject}`);
      }
    } else {
      throw new Error(`Unsupported notebook source mode: ${entry.sourceMode}`);
    }
    if (entry.commitHistoryUrl !== commitHistoryUrlFor(entry.entryPath)) {
      throw new Error(`Unexpected commit link for: ${entry.subject}`);
    }

    const absoluteEntryPath = path.join(root, entry.entryPath);
    await access(absoluteEntryPath);
    const markdown = await readFile(absoluteEntryPath, 'utf8');
    if (!markdown.includes(entry.learned)) throw new Error(`Entry file does not contain its reflection: ${entry.subject}`);
  }

  return notebook.entries.length;
}

async function main() {
  const curriculum = await readJson(curriculumPath);
  const notebook = await readJson(notebookPath);

  if (checkOnly) {
    const count = await checkNotebook(curriculum, notebook);
    report({ ok: true, entries: count, message: `Notebook is consistent (${count} entries).` });
    return;
  }

  const recordedSubjects = new Set(notebook.entries.map((entry) => entry.subject));
  const lesson = curriculum.find((candidate) => !recordedSubjects.has(candidate.label));

  if (!lesson) {
    report({ created: false, message: 'No unrecorded lessons.' });
    return;
  }

  const writtenAt = new Date().toISOString();
  const entry = renderEntry(lesson, writtenAt);
  const nextNotebook = {
    ...notebook,
    updatedAt: writtenAt,
    entries: [...notebook.entries, entry].sort((left, right) => left.order - right.order),
  };

  if (!dryRun) {
    await mkdir(entriesDirectory, { recursive: true });
    await writeFile(path.join(root, entry.entryPath), renderMarkdown(entry), 'utf8');
    await writeFile(notebookPath, `${JSON.stringify(nextNotebook, null, 2)}\n`, 'utf8');
  }

  report({
    created: true,
    dryRun,
    subject: entry.subject,
    path: entry.entryPath,
    commitMessage: `learn: write down what PIPT learned about ${entry.subject}`,
    message: `${dryRun ? 'Would record' : 'Recorded'} ${entry.subject}.`,
  });
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
