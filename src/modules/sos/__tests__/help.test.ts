import { needHelp } from '../alert/help';

function deps(link: { value: string | null; afterMs: number; fails?: boolean }, waitMs = 50) {
  const texted: string[] = [];
  return {
    texted,
    deps: {
      startLive: jest.fn(
        () =>
          new Promise<string>((resolve, reject) =>
            setTimeout(() => (link.fails ? reject(new Error('no signal')) : resolve(link.value as string)), link.afterMs),
          ),
      ),
      // As the alert controller does: waits for the link as long as it waits for the position.
      alert: jest.fn(async (liveLink: Promise<string | null>) =>
        Promise.race([liveLink, new Promise<null>((resolve) => setTimeout(() => resolve(null), waitMs))]),
      ),
      textLink: jest.fn(async (to: 'all' | 'not-alerted') => void texted.push(to)),
    },
  };
}

describe('"I need help" (SPEC 5.2; round 2, group 1.4)', () => {
  it('starts live location, and the link joins the alert when it is ready in time', async () => {
    const { deps: d, texted } = deps({ value: 'https://live/#tok', afterMs: 5 });
    expect(await needHelp(d)).toEqual({ live: 'started', liveError: null });
    expect(d.startLive).toHaveBeenCalledTimes(1);
    expect(d.alert).toHaveBeenCalledTimes(1);
    // Those ticked for live location but not for SOS alerts still get the link.
    expect(texted).toEqual(['not-alerted']);
  });

  it('sends the alert without a slow link, and texts the link on its own when it comes', async () => {
    const { deps: d, texted } = deps({ value: 'https://live/#late', afterMs: 120 }, 20);
    expect(await needHelp(d)).toEqual({ live: 'started', liveError: null });
    expect(texted).toEqual(['all']);
  });

  it('still sends the alert when live location can’t start', async () => {
    const { deps: d, texted } = deps({ value: null, afterMs: 5, fails: true });
    expect(await needHelp(d)).toEqual({ live: 'failed', liveError: 'no signal' });
    expect(d.alert).toHaveBeenCalledTimes(1);
    expect(texted).toEqual([]);
  });
});
