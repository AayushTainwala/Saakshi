import type { DirectSmsResult } from '@native/saakshi-sos';

import type { FixResult } from '@/modules/location';

import type { ComposerResult, SmsChannels } from '../alert/channels';
import { AlertController, type AlertDeps } from '../alert/controller';
import type { TrustedContact } from '../contacts/store';

const asha: TrustedContact = { id: '1', name: 'Asha', phone: '+919876543210' };
const ravi: TrustedContact = { id: '2', name: 'Ravi', phone: '+919123456789' };

const fixed: FixResult = {
  status: 'fixed',
  fix: { latitude: 19.076, longitude: 72.8777, accuracyMeters: 10, fixedAt: '2026-10-20T09:01:00Z' },
};

function setup(options: { direct?: boolean; contacts?: TrustedContact[]; where?: FixResult } = {}) {
  const channels = {
    direct: {
      supported: jest.fn(() => !!options.direct),
      allowed: jest.fn(async () => !!options.direct),
      send: jest.fn(
        async (phones: string[]): Promise<DirectSmsResult[]> =>
          phones.map((phone) => ({ phone, status: 'sent', errorCode: null, error: null })),
      ),
    },
    composer: {
      available: jest.fn(async (): Promise<boolean> => true),
      send: jest.fn(async (): Promise<ComposerResult> => 'sent'),
    },
  } satisfies SmsChannels;
  const deps: AlertDeps = {
    contacts: () => options.contacts ?? [asha, ravi],
    locate: jest.fn(async () => options.where ?? fixed),
    now: () => new Date('2026-10-20T09:02:00Z'),
    channels,
    labels: () => ({ title: 'Alert', location: 'Location', noLocation: 'No location', sent: 'Sent', live: 'Live location' }),
  };
  return { controller: new AlertController(deps), channels, deps };
}

/** Lets pending promises settle while fake timers are on. */
async function settle() {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

describe('AlertController', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('opens the SMS app with every contact and the message where it cannot send by itself', async () => {
    const { controller, channels } = setup();
    await controller.start();
    expect(channels.direct.send).not.toHaveBeenCalled();
    expect(channels.composer.send).toHaveBeenCalledWith(
      ['+919876543210', '+919123456789'],
      expect.stringContaining('https://maps.google.com/?q=19.07600,72.87770'),
    );
    expect(controller.state).toEqual({
      phase: 'done',
      outcome: { channel: 'composer', result: 'sent', recipients: 2, located: true },
    });
  });

  it('sends by itself after a 3-second countdown in the Android APK', async () => {
    jest.useFakeTimers();
    const { controller, channels } = setup({ direct: true });
    await controller.start();
    expect(controller.state).toEqual({ phase: 'countdown', secondsLeft: 3 });

    jest.advanceTimersByTime(1000);
    expect(controller.state).toEqual({ phase: 'countdown', secondsLeft: 2 });
    jest.advanceTimersByTime(2000);
    await settle();

    expect(channels.direct.send).toHaveBeenCalledTimes(1);
    expect(channels.composer.send).not.toHaveBeenCalled();
    expect(controller.state).toEqual({
      phase: 'done',
      outcome: { channel: 'direct', sent: [asha, ravi], unknown: [], failed: [], located: true },
    });
  });

  it('sends nothing when the countdown is cancelled', async () => {
    jest.useFakeTimers();
    const { controller, channels } = setup({ direct: true });
    await controller.start();
    controller.cancel();
    jest.advanceTimersByTime(5000);
    await settle();
    expect(controller.state).toEqual({ phase: 'idle' });
    expect(channels.direct.send).not.toHaveBeenCalled();
    expect(channels.composer.send).not.toHaveBeenCalled();
  });

  it('sends at once on "Send now"', async () => {
    jest.useFakeTimers();
    const { controller, channels } = setup({ direct: true });
    await controller.start();
    await controller.sendNow();
    expect(channels.direct.send).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(5000);
    await settle();
    expect(channels.direct.send).toHaveBeenCalledTimes(1);
  });

  it('offers the SMS app for contacts the network did not confirm', async () => {
    const { channels } = setup({ direct: true });
    channels.direct.send.mockResolvedValueOnce([
      { phone: asha.phone, status: 'sent', errorCode: null, error: null },
      { phone: ravi.phone, status: 'failed', errorCode: 4, error: null },
    ]);
    const noCountdown = new AlertController({ ...setupDeps(channels), countdownSeconds: 0 });
    await noCountdown.start();
    expect(noCountdown.state).toMatchObject({ phase: 'done', outcome: { sent: [asha], failed: [ravi] } });

    await noCountdown.sendRestByComposer();
    expect(channels.composer.send).toHaveBeenCalledWith([ravi.phone], expect.stringContaining('Alert'));
  });

  it('falls back to the SMS app if sending by itself throws', async () => {
    const { channels } = setup({ direct: true });
    channels.direct.send.mockRejectedValueOnce(new Error('SEND_SMS has not been granted'));
    const controller = new AlertController({ ...setupDeps(channels), countdownSeconds: 0 });
    await controller.start();
    expect(channels.composer.send).toHaveBeenCalledTimes(1);
    expect(controller.state).toMatchObject({ phase: 'done', outcome: { channel: 'composer' } });
  });

  it('still alerts without a location, and says so', async () => {
    const { controller, channels } = setup({ where: { status: 'unavailable', fix: null } });
    await controller.start();
    expect(channels.composer.send).toHaveBeenCalledWith(expect.any(Array), expect.stringContaining('No location'));
    expect(controller.state).toMatchObject({ phase: 'done', outcome: { located: false } });
  });

  it('needs at least one contact', async () => {
    const { controller, deps } = setup({ contacts: [] });
    await controller.start();
    expect(controller.state).toEqual({ phase: 'failed', error: 'no-contacts' });
    expect(deps.locate).not.toHaveBeenCalled();
  });

  it('reports a phone that cannot text', async () => {
    const { controller, channels } = setup();
    channels.composer.available.mockResolvedValueOnce(false);
    await controller.start();
    expect(controller.state).toEqual({ phase: 'failed', error: 'no-sms' });
  });

  it('ignores a second start while one is under way', async () => {
    jest.useFakeTimers();
    const { controller, deps } = setup({ direct: true });
    await controller.start();
    await controller.start();
    expect(deps.locate).toHaveBeenCalledTimes(1);
  });
});

function setupDeps(channels: SmsChannels): AlertDeps {
  return {
    contacts: () => [asha, ravi],
    locate: async () => fixed,
    now: () => new Date('2026-10-20T09:02:00Z'),
    channels,
    labels: () => ({ title: 'Alert', location: 'Location', noLocation: 'No location', sent: 'Sent', live: 'Live location' }),
  };
}
