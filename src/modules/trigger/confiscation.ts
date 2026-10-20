/** How long live location runs in confiscation mode unless stopped sooner. */
export const CONFISCATION_LIVE_HOURS = 8;
/** Confiscation mode won't hold up the alert longer than this waiting for the live link. */
const LIVE_WAIT_MS = 8000;

export type PartResult = 'started' | 'failed';

export type ConfiscationResult = {
  bug: PartResult;
  live: PartResult;
  alert: PartResult;
  errors: string[];
};

export type ConfiscationDeps = {
  startBug: () => Promise<void>;
  /** Starts live location without texting the link; resolves to the link and its invite text. */
  startLive: (hours: number) => Promise<{ link: string; invite: string }>;
  /** Texts contacts on its own, for a live link that came after the alert had gone. */
  text: (message: string) => Promise<void>;
  /** Sends the SOS alert at once, with the live link if there is one. */
  alert: (liveLink?: string) => Promise<void>;
  liveWaitMs?: number;
};

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Confiscation mode (spec section 5): one action, before the phone is handed over, that starts bug
 * mode and live location, then sends the SOS alert with the live link in it. Each part starts even
 * if another fails. The alert never waits more than a few seconds for the link; a link that comes
 * later is texted on its own.
 */
export async function startConfiscation(deps: ConfiscationDeps): Promise<ConfiscationResult> {
  const errors: string[] = [];
  const bug = deps.startBug().then(
    (): PartResult => 'started',
    (error): PartResult => {
      errors.push(`bug: ${message(error)}`);
      return 'failed';
    },
  );

  let started: { link: string; invite: string } | null = null;
  let live: PartResult = 'failed';
  const liveStart = deps.startLive(CONFISCATION_LIVE_HOURS).then(
    (value) => {
      started = value;
      live = 'started';
    },
    (error) => {
      errors.push(`live: ${message(error)}`);
    },
  );
  await Promise.race([liveStart, new Promise((resolve) => setTimeout(resolve, deps.liveWaitMs ?? LIVE_WAIT_MS))]);
  const inAlert = started as { link: string; invite: string } | null;

  let alert: PartResult = 'started';
  try {
    await deps.alert(inAlert?.link);
  } catch (error) {
    alert = 'failed';
    errors.push(`alert: ${message(error)}`);
  }

  await liveStart;
  const late = started as { link: string; invite: string } | null;
  if (late && !inAlert) await deps.text(late.invite).catch((error) => errors.push(`live link: ${message(error)}`));
  return { bug: await bug, live, alert, errors };
}
