import { fireEvent, render, screen } from '@testing-library/react-native';

import { initI18n } from '@/i18n';
import { PreferencesProvider } from '@/preferences/PreferencesProvider';

import { triggerSettings } from '../settings';
import { CodePad } from '../ui/CodePad';

jest.mock('../settings', () => {
  const { useSyncExternalStore } = jest.requireActual('react');
  const { TriggerSettingsStore } = jest.requireActual('../settings');
  let text: string | null = null;
  const store = new TriggerSettingsStore({ read: () => text, write: (value: string) => void (text = value) });
  return { triggerSettings: store, useTriggerSettings: () => useSyncExternalStore(store.subscribe, store.get) };
});

const mockStart = jest.fn(async () => undefined);
jest.mock('@/modules/sos', () => ({ alertController: { start: (...args: unknown[]) => mockStart(...(args as [])) } }));

const mockConfiscation = jest.fn(async () => undefined);
jest.mock('../instance', () => ({ startConfiscationMode: () => mockConfiscation() }));

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args), canGoBack: () => false, back: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View };
});

async function type(digits: string) {
  for (const digit of digits) await fireEvent.press(screen.getByRole('button', { name: digit }));
}

function pad() {
  return render(
    <PreferencesProvider initial={{ language: 'en', theme: 'dark' }}>
      <CodePad />
    </PreferencesProvider>,
  );
}

describe('code pad', () => {
  beforeAll(() => initI18n('en'));
  beforeEach(() => {
    jest.clearAllMocks();
    triggerSettings.setAction('alert');
    triggerSettings.setCode('473');
  });

  it('sends the alert on the third correct digit, with no countdown', async () => {
    await pad();
    await type('47');
    expect(mockStart).not.toHaveBeenCalled();
    await type('3');
    expect(mockStart).toHaveBeenCalledWith({ immediate: true });
    expect(mockReplace).toHaveBeenCalledWith('/sos');
  });

  it('does nothing on a wrong code', async () => {
    await pad();
    await type('479');
    expect(mockStart).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByLabelText('0 of 3 entered')).toBeTruthy();
  });

  it('starts confiscation mode when that is what the code does', async () => {
    triggerSettings.setAction('confiscation');
    await pad();
    await type('473');
    expect(mockConfiscation).toHaveBeenCalled();
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('asks for a code to be set first', async () => {
    triggerSettings.clearCode();
    await pad();
    expect(screen.getByRole('button', { name: 'Set a code' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '1' })).toBeNull();
  });

  it('keeps 112 one tap away', async () => {
    await pad();
    expect(screen.getByRole('button', { name: 'Call 112' })).toBeTruthy();
  });
});
