/**
 * Verified helplines and the consenting lawyers and medics list, updated from a remote JSON (spec
 * section 6: G3). Owner: Stream C. The list itself is `helplines/helplines.json` at the repository
 * root; see `helplines/README.md`.
 *
 * Public API of this module. Other code imports only from `@/modules/helplines`, never from files
 * inside it.
 */
export { HelplinesScreen } from './ui/HelplinesScreen';
export type { HelplineList, ListedPerson, PublicHelpline } from './schema';
