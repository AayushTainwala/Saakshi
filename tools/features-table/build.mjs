#!/usr/bin/env node
// Makes the owner's features-by-build page from its data.
//
//   node tools/features-table/build.mjs <output.html>
//
// The page is one self-contained HTML file: template.html with docs/spec/features-by-build.json
// placed inside it. The review session publishes it at the same address each time the data changes.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');

export function buildPage(template, table) {
  // "<" is written as < so that no text in the data can end the script element early.
  const data = JSON.stringify(table).replace(/</g, '\\u003c');
  if (!template.includes('__DATA__')) throw new Error('template.html has no __DATA__ marker.');
  return template.replace('__DATA__', () => data);
}

function main() {
  const out = process.argv[2];
  if (!out) {
    console.error('Usage: node tools/features-table/build.mjs <output.html>');
    process.exit(2);
  }
  const table = JSON.parse(readFileSync(join(ROOT, 'docs/spec/features-by-build.json'), 'utf8'));
  writeFileSync(out, buildPage(readFileSync(join(HERE, 'template.html'), 'utf8'), table));
  console.log(`Wrote ${out}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
