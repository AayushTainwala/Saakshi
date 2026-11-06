/**
 * "I need help" (SPEC 5.2; round 2, group 1.4): one alert to the people ticked for SOS alerts, with
 * the time, the battery level, the current-location map link and the live-location link, and live
 * location starts for the Settings length. The alert waits for the live link only as long as it
 * waits for the position (up to 8 seconds); if the link comes later, it is texted on its own (the
 * calm message, with the battery level) to the people ticked for live location. When the alert did
 * carry it, those ticked for live location but not for SOS alerts still get it on its own.
 */
export type HelpDeps = {
  /** Starts live location without texting the link; resolves to the link. */
  startLive: () => Promise<string>;
  /** Sends the alert, with the live link if it comes in time; resolves to the link it carried. */
  alert: (liveLink: Promise<string | null>) => Promise<string | null>;
  /** Texts the link on its own to the people ticked for live location (all, or those not alerted). */
  textLink: (to: 'all' | 'not-alerted') => Promise<void>;
};

export type HelpResult = { live: 'started' | 'failed'; liveError: string | null };

export async function needHelp(deps: HelpDeps): Promise<HelpResult> {
  let liveError: string | null = null;
  const live = deps.startLive().then(
    (link) => link,
    (error) => {
      liveError = error instanceof Error ? error.message : String(error);
      return null;
    },
  );
  const carried = await deps.alert(live);
  const link = await live;
  if (link) await deps.textLink(carried ? 'not-alerted' : 'all').catch(() => undefined);
  return { live: link ? 'started' : 'failed', liveError };
}
