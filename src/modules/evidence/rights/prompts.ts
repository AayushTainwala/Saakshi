/**
 * Prompts shown over the camera preview while recording (spec E6). The words are in the `record`
 * namespace under `rights.<id>`. Every legal statement comes from docs/research/law.md, with the
 * pinpoints and links below. NEEDS OWNER REVIEW before release, in English and Hindi.
 */
export type RightsPrompt = {
  id: 'grounds' | 'name' | 'inform' | 'lawyer' | 'bail' | 'calm' | 'statement';
  /** "say": words to say to the officer. "do": a reminder for the user. */
  kind: 'say' | 'do';
  /** Where the legal statement comes from (law.md section and row), for review. Empty if none. */
  authority: { cite: string; url: string; lawMd: string }[];
};

export const RIGHTS_PROMPTS: readonly RightsPrompt[] = [
  {
    id: 'grounds',
    kind: 'say',
    authority: [
      { cite: 'Constitution of India, Art. 22(1)', url: 'https://indiankanoon.org/doc/581566/', lawMd: '2B' },
      { cite: 'BNSS 2023, s.47(1)', url: 'https://indiankanoon.org/doc/91117739/', lawMd: '2A' },
      {
        cite: 'Mihir Rajesh Shah v. State of Maharashtra, Crl. A. 2195/2025 (SC, 06.11.2025), para 56(i)–(iii)',
        url: 'https://indiankanoon.org/doc/75521991/',
        lawMd: '2C',
      },
    ],
  },
  {
    id: 'name',
    kind: 'say',
    authority: [{ cite: 'BNSS 2023, s.36(a)', url: 'https://indiankanoon.org/doc/91117739/', lawMd: '2A' }],
  },
  {
    id: 'inform',
    kind: 'say',
    authority: [{ cite: 'BNSS 2023, s.48(1)–(4)', url: 'https://indiankanoon.org/doc/91117739/', lawMd: '2A' }],
  },
  {
    id: 'lawyer',
    kind: 'say',
    authority: [
      { cite: 'Constitution of India, Art. 22(1)', url: 'https://indiankanoon.org/doc/581566/', lawMd: '2B' },
      { cite: 'BNSS 2023, s.38', url: 'https://indiankanoon.org/doc/91117739/', lawMd: '2A' },
    ],
  },
  {
    id: 'bail',
    kind: 'say',
    authority: [{ cite: 'BNSS 2023, s.47(2)', url: 'https://indiankanoon.org/doc/91117739/', lawMd: '2A' }],
  },
  {
    id: 'calm',
    kind: 'do',
    authority: [
      { cite: 'BNS 2023, s.221', url: 'https://indiankanoon.org/doc/149679501/', lawMd: '2F' },
      { cite: 'BNS 2023, s.262', url: 'https://indiankanoon.org/doc/149679501/', lawMd: '2F' },
    ],
  },
  { id: 'statement', kind: 'do', authority: [] },
];
