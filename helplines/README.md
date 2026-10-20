# Helpline list

`helplines.json` is the list the Help tab shows (SPEC G3). The app ships with the copy that was here when it was built, and on opening the Help tab fetches the current copy from

https://raw.githubusercontent.com/AayushTainwala/Saakshi/main/helplines/helplines.json

so a change merged to `main` reaches phones without a new release. The app keeps whichever list has the later `updated` date, and ignores a fetched file that fails the schema. The request is a plain GET and sends nothing of the user's.

The schema is checked by `src/modules/helplines/schema.ts`, and CI runs `src/modules/helplines/__tests__/helplines.test.tsx`, which fails if this file doesn't pass. Any field the schema doesn't know is an error.

## Changing the list

1. Edit `helplines.json` and set `updated` to today (YYYY-MM-DD). The app only takes a fetched list whose `updated` is the same as or later than its own.
2. Run `npx jest src/modules/helplines`.
3. Open a pull request. The owner reviews every change: a wrong number here reaches every phone.

Bump `schema` only for a change older apps can't read; they will then keep their own copy.

## Public numbers (`public`)

Each one must be checked against an official government page (`gov.in` or `nic.in`), recorded in `sources` with the date and how it was checked:

- `page-read`: the page itself was opened and read;
- `search-extract`: only a search engine's extract of the page was seen, because the page couldn't be reached. Re-check these by opening the page, then change them to `page-read`.

`number` is digits only (an optional leading `+`), so that the `tel:` link dials exactly that.

## Lawyers and medics (`people`)

Empty until someone agrees to be listed. Before adding anyone:

- get their **written** consent to show, publicly on GitHub and in the app, the name, phone number, city, state and languages they give, and keep that consent outside this repository;
- check their registration (Bar Council enrolment number, or state medical council registration number) and record it in `registration`;
- set `consented` to the date of the consent and `listedUntil` to when it should be renewed. The app stops showing an entry after `listedUntil`, without a release.

To remove someone, delete their entry and update `updated`. Their entry stays in the repository's history: tell them so before listing them.
