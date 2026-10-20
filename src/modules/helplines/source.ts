import { File, Paths } from 'expo-file-system';

import bundledJson from '../../../helplines/helplines.json';

import { type HelplineList, newer, parseHelplineList } from './schema';

/**
 * The published list, served from this repository's `main` branch. It is a plain GET with no
 * cookies or identifiers; it sends nothing of the user's.
 */
export const REMOTE_URL = 'https://raw.githubusercontent.com/AayushTainwala/Saakshi/main/helplines/helplines.json';

const CACHE_FILE = 'helplines.json';
const TIMEOUT_MS = 15_000;

/** The list built into this release. The repository's tests check that it parses. */
export function bundledList(): HelplineList {
  const result = parseHelplineList(bundledJson);
  if (!result.ok) throw new Error(`Bundled helplines are invalid: ${result.errors.join('; ')}`);
  return result.list;
}

function cacheFile(): File {
  return new File(Paths.document, CACHE_FILE);
}

/** The bundled list, or the last fetched one if it is valid and newer. */
export function loadList(): HelplineList {
  const bundled = bundledList();
  try {
    const file = cacheFile();
    if (!file.exists) return bundled;
    const saved = parseHelplineList(JSON.parse(file.textSync()));
    return saved.ok ? newer(bundled, saved.list) : bundled;
  } catch {
    return bundled;
  }
}

function saveList(list: HelplineList): void {
  const file = cacheFile();
  if (!file.exists) file.create();
  file.writeSync(JSON.stringify(list));
}

/**
 * Fetches the published list and returns whichever of it and `current` is newer, saving a fetched
 * list that wins. A list that fails the schema is ignored. Throws if the fetch itself fails.
 */
export async function refreshList(
  current: HelplineList,
  fetchJson: (url: string) => Promise<unknown> = fetchWithTimeout,
  save: (list: HelplineList) => void = saveList,
): Promise<HelplineList> {
  const fetched = parseHelplineList(await fetchJson(REMOTE_URL));
  if (!fetched.ok) return current;
  const chosen = newer(current, fetched.list);
  if (chosen === fetched.list) save(chosen);
  return chosen;
}

async function fetchWithTimeout(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, credentials: 'omit', cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}
