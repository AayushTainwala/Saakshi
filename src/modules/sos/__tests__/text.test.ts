import type { DirectSmsResult } from '@native/saakshi-sos';

import type { ComposerResult, SmsChannels } from '../alert/channels';
import { textTrustedContacts } from '../alert/text';

const all = { sos: true, live: true, witness: true };
const contacts = () => [{ id: '1', name: 'Asha', phone: '+919876543210', uses: all, method: 'sms' as const }];

function channels(direct: boolean): SmsChannels & { composer: { send: jest.Mock } } {
  return {
    direct: {
      supported: () => direct,
      allowed: async () => direct,
      send: jest.fn(async (phones: string[]): Promise<DirectSmsResult[]> =>
        phones.map((phone) => ({ phone, status: 'sent', errorCode: null, error: null })),
      ),
    },
    composer: { available: async () => true, send: jest.fn(async (): Promise<ComposerResult> => 'sent') },
  };
}

describe('textTrustedContacts', () => {
  it('sends with no tap where it can', async () => {
    const result = await textTrustedContacts('hello', { use: 'sos' }, { contacts, channels: channels(true) });
    expect(result).toMatchObject({ channel: 'direct' });
  });

  it('opens the SMS app otherwise', async () => {
    const c = channels(false);
    expect(await textTrustedContacts('hello', { use: 'sos' }, { contacts, channels: c })).toEqual({ channel: 'composer', result: 'sent' });
    expect(c.composer.send).toHaveBeenCalledWith(['+919876543210'], 'hello');
  });

  it('sends nothing when no one can tap Send', async () => {
    const c = channels(false);
    expect(await textTrustedContacts('hello', { use: 'witness', directOnly: true }, { contacts, channels: c })).toEqual({
      channel: 'none',
      reason: 'needs-tap',
    });
    expect(c.composer.send).not.toHaveBeenCalled();
  });

  it('needs contacts', async () => {
    expect(await textTrustedContacts('hello', { use: 'sos' }, { contacts: () => [], channels: channels(true) })).toEqual({
      channel: 'none',
      reason: 'no-contacts',
    });
  });

  it('texts only the people ticked for what is being sent (fix round 1, group 6)', async () => {
    const people = () => [
      { id: '1', name: 'Asha', phone: '+919876543210', uses: all, method: 'sms' as const },
      { id: '2', name: 'Ravi', phone: '+919812345678', uses: { sos: true, live: false, witness: false }, method: 'sms' as const },
      { id: '3', name: 'Meera', phone: '+919900011122', uses: { sos: false, live: true, witness: true }, method: 'sms' as const },
    ];
    const c = channels(false);
    await textTrustedContacts('live', { use: 'live' }, { contacts: people, channels: c });
    expect(c.composer.send).toHaveBeenLastCalledWith(['+919876543210', '+919900011122'], 'live');
    await textTrustedContacts('sos', { use: 'sos' }, { contacts: people, channels: c });
    expect(c.composer.send).toHaveBeenLastCalledWith(['+919876543210', '+919812345678'], 'sos');
    // Live location's link to those the alert (which carried it) didn't reach.
    await textTrustedContacts('link', { use: 'live', except: 'sos' }, { contacts: people, channels: c });
    expect(c.composer.send).toHaveBeenLastCalledWith(['+919900011122'], 'link');
    expect(await textTrustedContacts('w', { use: 'witness' }, { contacts: () => [people()[1]], channels: c })).toEqual({
      channel: 'none',
      reason: 'no-contacts',
    });
  });
});
