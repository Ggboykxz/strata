#!/usr/bin/env node
/**
 * build-journal.mjs — generates docs/state/JOURNAL.md from the append-only docs/state/journal/ entries.
 * Owner: orchestrator (docs-only exception A0002). The view is derived; entries are the source of truth.
 * `--check` fails if the committed view is stale, so CI never accepts a generated file that drifted.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

const SOURCE_DIR = 'docs/state/journal';
const VIEW = 'docs/state/JOURNAL.md';

function build() {
  const files = readdirSync(SOURCE_DIR).filter((file) => file.endsWith('.md')).sort();
  if (files.length === 0) throw new Error('no journal entries found — fail closed');
  const header = [
    '# JOURNAL — generated view',
    '',
    '| field | value |',
    '|---|---|',
    `| source | \`${SOURCE_DIR}/\` (append-only entries) |`,
    `| entries | ${files.length} |`,
    '| regenerate | `node scripts/build-journal.mjs` |',
    '| check | `node scripts/build-journal.mjs --check` |',
    '',
    'This file is generated. Add a new entry under `docs/state/journal/`; never edit this view by hand.',
    '',
    '---',
    '',
  ].join('\n');
  const body = files.map((file) => readFileSync(`${SOURCE_DIR}/${file}`, 'utf8').trimEnd()).join('\n\n---\n\n');
  return `${header}${body}\n`;
}

const expected = build();
if (process.argv.includes('--check')) {
  if (!existsSync(VIEW)) {
    console.error('build-journal: view missing — run node scripts/build-journal.mjs');
    process.exit(1);
  }
  const actual = readFileSync(VIEW, 'utf8');
  if (actual !== expected) {
    console.error('build-journal — FAIL — committed view is stale');
    process.exit(1);
  }
  console.log('build-journal — PASS — view matches the journal entries');
  process.exit(0);
}
writeFileSync(VIEW, expected, 'utf8');
console.log(`build-journal — wrote ${VIEW} from the append-only journal`);
