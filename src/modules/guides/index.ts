/**
 * Guides content: chest mount, digital safety and preparedness, offline communication (spec
 * section 6: G4, G5, O1). Owner: Stream C. The content is structured data in `content/`, in English
 * and Hindi; interface strings are in the `guides` i18n namespace.
 *
 * Public API of this module. Other code imports only from `@/modules/guides`, never from files
 * inside it.
 */
export { AVAILABLE_FEATURES, findGuide, GUIDES, type Guide, type GuideId } from './content';
export { GuideDetail } from './ui/GuideDetail';
export { GuideList } from './ui/GuideList';
