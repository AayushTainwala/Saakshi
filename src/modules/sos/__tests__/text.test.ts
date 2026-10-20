import type { DirectSmsResult } from '@native/saakshi-sos';

import type { ComposerResult, SmsChannels } from '../alert/channels';
import { textTrustedContacts } from '../alert/text';

const contacts = () => [{ id: '1', name: 'Asha', phone: '+919876543210' }];

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
    const result = await textTrustedContacts('hello', {}, { contacts, channels: channels(true) });
    expect(result).toMatchObject({ channel: 'direct' });
  });

  it('opens the SMS app otherwise', async () => {
    const c = channels(false);
    expect(await textTrustedContacts('hello', {}, { contacts, channels: c })).toEqual({ channel: 'composer', result: 'sent' });
    expect(c.composer.send).toHaveBeenCalledWith(['+919876543210'], 'hello');
  });

  it('sends nothing when no one can tap Send', async () => {
    const c = channels(false);
    expect(await textTrustedContacts('hello', { directOnly: true }, { contacts, channels: c })).toEqual({
      channel: 'none',
      reason: 'needs-tap',
    });
    expect(c.composer.send).not.toHaveBeenCalled();
  });

  it('needs contacts', async () => {
    expect(await textTrustedContacts('hello', {}, { contacts: () => [], channels: channels(true) })).toEqual({
      channel: 'none',
      reason: 'no-contacts',
    });
  });
});
