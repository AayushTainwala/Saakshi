import { render } from '@testing-library/react-native';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Platform } from 'react-native';

import { useQuickTriggers } from '../listener';
import { OLD_TRIGGER_FILE, removeOldCodePadSetting } from '../migrate';

const ROOT = join(__dirname, '../../../..');
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

const mockNavigate = jest.fn();
jest.mock('expo-router', () => ({ router: { navigate: (...args: unknown[]) => mockNavigate(...args) } }));

jest.mock('@native/saakshi-sos', () => {
  const native = {
    consumeSosRequest: jest.fn(() => false),
    quickNotificationEnabled: jest.fn(() => false),
    quickNotificationShow: jest.fn(),
    listeners: [] as (() => void)[],
    addListener: jest.fn((_name: string, listener: () => void) => {
      native.listeners.push(listener);
      return { remove: jest.fn() };
    }),
  };
  return { __esModule: true, default: native };
});
const mockNative = (
  jest.requireMock('@native/saakshi-sos') as {
    default: {
      consumeSosRequest: jest.Mock;
      addListener: jest.Mock;
      listeners: (() => void)[];
    };
  }
).default;

function Triggers() {
  useQuickTriggers();
  return null;
}

describe('the quick trigger opens the SOS screen (round 2)', () => {
  const realOS = Platform.OS;
  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: realOS, configurable: true });
    mockNavigate.mockClear();
    mockNative.listeners = [];
  });

  it('iPhone: a control, the Action Button or Back Tap opens /sos, even from a cold start', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    mockNative.consumeSosRequest.mockReturnValueOnce(true);
    await render(<Triggers />);
    expect(mockNavigate).toHaveBeenCalledWith('/sos');
    expect(mockNative.addListener).toHaveBeenCalledWith('onOpenSos', expect.any(Function));
    mockNative.listeners[0]();
    expect(mockNavigate).toHaveBeenCalledTimes(2);
  });

  it('the native triggers open saakshi://sos, and nothing opens the code pad any more', () => {
    // Android's widget and notification, and iPhone's widget, open the SOS tab by its link.
    expect(read('modules/saakshi-sos/android/src/main/java/expo/modules/saakshisos/QuickTrigger.kt')).toContain('"saakshi://sos"');
    expect(read('targets/widget/QuickAlert.swift')).toContain('"saakshi://sos"');
    // saakshi://sos is the SOS tab's route.
    expect(existsSync(join(ROOT, 'src/app/(tabs)/sos/index.tsx'))).toBe(true);
    // The code pad's route and its native names are gone.
    expect(existsSync(join(ROOT, 'src/app/codepad.tsx'))).toBe(false);
    for (const file of [
      'modules/saakshi-sos/android/src/main/java/expo/modules/saakshisos/QuickTrigger.kt',
      'modules/saakshi-sos/ios/SaakshiSosModule.swift',
      'targets/widget/QuickAlert.swift',
      'targets/widget/_shared/OpenCodePadIntent.swift',
      'modules/saakshi-sos/src/SaakshiSosModule.ts',
    ]) {
      expect(read(file)).not.toMatch(/saakshi:\/\/codepad|consumeCodePadRequest|onOpenCodePad/);
    }
    // Pocket recording's Live Activity opens its new place, on the Record page.
    expect(read('targets/widget/BugModeLiveActivity.swift')).toContain('saakshi://record/pocket');
    expect(existsSync(join(ROOT, 'src/app/(tabs)/record/pocket.tsx'))).toBe(true);
  });

  it('the trigger module no longer offers the code pad or confiscation mode', () => {
    const api = read('src/modules/trigger/index.ts');
    for (const gone of ['CodePad', 'ConfiscationCard', 'startConfiscationMode', 'triggerSettings', 'REFUSED_CODES', 'CODE_LENGTH']) {
      expect(api).not.toMatch(new RegExp(`\\b${gone}\\b`));
    }
    for (const file of ['code.ts', 'confiscation.ts', 'settings.ts', 'ui/CodePad.tsx', 'ui/ConfiscationCard.tsx']) {
      expect(existsSync(join(ROOT, 'src/modules/trigger', file))).toBe(false);
    }
  });
});

describe('removing the old code pad setting', () => {
  it('deletes the file that held the old 3-digit code, once', () => {
    const files = new Set([OLD_TRIGGER_FILE, 'sos-contacts.json', 'preferences.json']);
    const fake = { exists: (name: string) => files.has(name), remove: (name: string) => void files.delete(name) };
    expect(removeOldCodePadSetting(fake)).toBe(true);
    expect([...files].sort()).toEqual(['preferences.json', 'sos-contacts.json']);
    expect(removeOldCodePadSetting(fake)).toBe(false);
  });

  it('never stops the app starting if the file can’t be removed', () => {
    const broken = {
      exists: () => true,
      remove: () => {
        throw new Error('read-only');
      },
    };
    expect(removeOldCodePadSetting(broken)).toBe(false);
  });
});
