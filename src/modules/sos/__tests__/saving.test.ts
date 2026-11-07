import { initI18n } from '@/i18n';

import { lowBatterySaving } from '../alert/saving';

const mockShare = { current: { shareId: 'share-1' } as { shareId: string } | null };
const mockSetSaving = jest.fn(async (_on: boolean) => undefined);
jest.mock('@/modules/location', () => ({
  liveShare: { setSaving: (on: boolean) => mockSetSaving(on), getShare: () => mockShare.current },
}));
const mockText = jest.fn(async (_message: string, _options: unknown) => ({ channel: 'direct', results: [] }));
jest.mock('../alert/text', () => ({ textTrustedContacts: (message: string, options: unknown) => mockText(message, options) }));

describe('saving mode for live location (round 2, group 1.5)', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('tells the people ticked for live location once, where the phone sends with no tap', async () => {
    await lowBatterySaving(true);
    await lowBatterySaving(false);
    await lowBatterySaving(true);
    expect(mockSetSaving.mock.calls).toEqual([[true], [false], [true]]);
    expect(mockText).toHaveBeenCalledTimes(1);
    expect(mockText).toHaveBeenCalledWith(
      'Saakshi: my battery is at 5%. To save power, my location now updates every 5 minutes.',
      { use: 'live', directOnly: true },
    );
  });

  it('tells nobody when no location is being shared', async () => {
    mockShare.current = null;
    mockText.mockClear();
    await lowBatterySaving(true);
    expect(mockText).not.toHaveBeenCalled();
  });
});
