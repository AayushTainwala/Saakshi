#!/usr/bin/env node
// Checks the owner's features-by-build table (docs/spec/features-by-build.json) against the
// spec (docs/SPEC.md), which is the master.
//
//   node tools/features-table/check.mjs                 the data is well formed; every row
//                                                        points at a heading that exists in the
//                                                        spec; every feature heading in the spec
//                                                        has at least one row
//   node tools/features-table/check.mjs --base <ref>    also: if docs/SPEC.md changed since
//                                                        <ref>, the table's data and the change
//                                                        log must have changed too
//   node tools/features-table/check.mjs --changed-files a,b,c
//                                                        the same rule, given the list of files a
//                                                        pull request changes
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const TABLE = 'docs/spec/features-by-build.json';
export const SPEC = 'docs/SPEC.md';
export const CHANGELOG = 'docs/SPEC_CHANGELOG.md';

const BUILDS = ['r1', 'r2', 'beta', 'public', 'later'];
const MARKS = ['new', 'changed', 'same', 'none'];

// Headings of the spec that describe no feature of their own, so need no row in the table.
const NO_ROW_NEEDED = new Set([
  'Saakshi v1 Spec',
  'How to read this',
  '1. What it is',
  '4. Evidence',
  '5. SOS, Pocket recording and "My phone is being taken"',
  '6. Guides and help',
  '10. Open with the owner',
]);

/** The spec's headings, and the lettered items of section 6 (**G3. Helplines.** and so on). */
export function specAnchors(markdown) {
  const anchors = new Set();
  for (const line of markdown.split('\n')) {
    const heading = /^#{1,4} (.+?)\s*$/.exec(line);
    if (heading) {
      anchors.add(heading[1]);
      continue;
    }
    const item = /^\*\*((?:[A-Z]\d+(?: \(v[\d.]+\))?\. )?[^*]+?)\.?\*\*/.exec(line);
    if (item && /^(?:[A-Z]\d+(?: \(v[\d.]+\))?\. |Unlawful detention$)/.test(item[1])) anchors.add(item[1]);
  }
  return anchors;
}

/** Every problem with the table, as plain sentences. An empty list means it is sound. */
export function problems(table, specMarkdown) {
  const out = [];
  const anchors = specAnchors(specMarkdown);
  const ids = (table.builds ?? []).map((b) => b.id);
  if (ids.join() !== BUILDS.join()) out.push(`"builds" must be exactly: ${BUILDS.join(', ')}.`);
  for (const mark of MARKS) if (!table.marks?.[mark]) out.push(`"marks" has no words for "${mark}".`);

  const seen = new Set();
  const used = new Set();
  for (const group of table.groups ?? []) {
    if (!group.id || !group.title) out.push('A group has no id or no title.');
    for (const feature of group.features ?? []) {
      const where = `Row "${feature.id ?? feature.title}"`;
      if (!feature.id || !feature.title) out.push(`${where}: no id or no title.`);
      if (seen.has(feature.id)) out.push(`${where}: its id is used twice.`);
      seen.add(feature.id);
      if (!Array.isArray(feature.spec) || feature.spec.length === 0) out.push(`${where}: names no place in the spec.`);
      for (const ref of feature.spec ?? []) {
        used.add(ref);
        if (!anchors.has(ref)) out.push(`${where}: the spec has no heading "${ref}". Was it renamed or removed?`);
      }
      let shown = false;
      for (const build of BUILDS) {
        const cell = feature.builds?.[build];
        if (!cell) {
          out.push(`${where}: no box for "${build}".`);
          continue;
        }
        if (!MARKS.includes(cell.mark)) out.push(`${where}, ${build}: unknown mark "${cell.mark}".`);
        const points = cell.points ?? [];
        if (cell.mark === 'same') {
          if (!shown) out.push(`${where}, ${build}: "same" needs an earlier box to be the same as.`);
          if (points.length) out.push(`${where}, ${build}: a "same" box carries no text of its own.`);
        } else if (points.length === 0 || points.some((p) => typeof p !== 'string' || !p.trim())) {
          out.push(`${where}, ${build}: needs at least one line of text.`);
        }
        if (cell.adds && cell.mark !== 'changed') out.push(`${where}, ${build}: "adds" belongs on a "changed" box.`);
        if (cell.adds && !shown) out.push(`${where}, ${build}: "adds" needs an earlier box to add to.`);
        for (const work of cell.by ?? []) {
          if (!table.work?.[work]) out.push(`${where}, ${build}: unknown work "${work}".`);
        }
        shown = true;
      }
    }
  }
  for (const anchor of anchors) {
    if (!NO_ROW_NEEDED.has(anchor) && !used.has(anchor)) {
      out.push(`The spec's "${anchor}" has no row in the table.`);
    }
  }
  return out;
}

/** The files a spec change must bring with it but did not. */
export function missingCompanions(changedFiles) {
  if (!changedFiles.includes(SPEC)) return [];
  return [TABLE, CHANGELOG].filter((file) => !changedFiles.includes(file));
}

function main() {
  const table = JSON.parse(readFileSync(join(ROOT, TABLE), 'utf8'));
  const found = problems(table, readFileSync(join(ROOT, SPEC), 'utf8'));
  const listAt = process.argv.indexOf('--changed-files');
  const baseAt = process.argv.indexOf('--base');
  let changed = null;
  if (listAt !== -1) {
    changed = (process.argv[listAt + 1] ?? '').split(',').filter(Boolean);
  } else if (baseAt !== -1) {
    changed = execFileSync('git', ['diff', '--name-only', `${process.argv[baseAt + 1]}...HEAD`], { cwd: ROOT, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
  }
  if (changed) {
    for (const file of missingCompanions(changed)) {
      found.push(`${SPEC} changed, but ${file} did not. A change to the spec updates the table and the change log in the same pull request.`);
    }
  }
  if (found.length) {
    console.error(found.map((p) => `- ${p}`).join('\n'));
    process.exit(1);
  }
  const rows = table.groups.reduce((n, g) => n + g.features.length, 0);
  console.log(`The features-by-build table is sound: ${table.groups.length} groups, ${rows} rows.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
