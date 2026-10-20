import { chestMount } from './chestMount';
import { digitalSafety } from './digitalSafety';
import { offline } from './offline';
import type { Feature, Guide, GuideId, Section } from './types';

export type { Block, Feature, Guide, GuideId, Localized, Section } from './types';

/** In the order the Guides tab lists them. */
export const GUIDES: readonly Guide[] = [digitalSafety, chestMount, offline];

/**
 * Features that guide sections may describe, and whether this build has them. Confiscation mode
 * arrives with Stream B's R2 work; set it to true in the same pull request.
 */
export const AVAILABLE_FEATURES: Record<Feature, boolean> = {
  confiscationMode: false,
};

export function findGuide(id: string): Guide | undefined {
  return GUIDES.find((guide) => guide.id === (id as GuideId));
}

export function visibleSections(guide: Guide, features = AVAILABLE_FEATURES): Section[] {
  return guide.sections.filter((section) => !section.requires || features[section.requires]);
}
