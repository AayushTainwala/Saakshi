import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

import i18n, { initI18n } from '@/i18n';
import { PreferencesProvider } from '@/preferences/PreferencesProvider';

import { type LockAdminApi, LockSetting } from '../lockScreen';
import { PhoneTakenStatus } from '../ui/PhoneTaken';
import { LockSettings, LockSettingsCard } from '../ui/LockSettings';

/** Android's device admin, faked: `admin.on` is what Android says. */
function fakeAdmin(overrides: Partial<LockAdminApi> = {}) {
  const admin = { on: false, accept: true };
  const api: LockAdminApi = {
    supported: jest.fn(() => true),
    active: jest.fn(() => admin.on),
    request: jest.fn(async () => {
      if (admin.accept) admin.on = true;
      return admin.on;
    }),
    remove: jest.fn(async () => {
      admin.on = false;
      return false;
    }),
    lockNow: jest.fn(async () => admin.on),
    ...overrides,
  };
  return { admin, api };
}

describe('the lock setting (round 2, group 1.7)', () => {
  it('is not offered on iPhone or on a phone without device admin', async () => {
    const none = new LockSetting(null);
    expect(none.getState()).toEqual({ supported: false, on: false, busy: false, failed: false });
    expect(await none.lockNow()).toBe(false);
    expect(await none.switchOn('why')).toBe(false);

    const { api } = fakeAdmin({ supported: jest.fn(() => false) });
    const unsupported = new LockSetting(api);
    expect(unsupported.getState().supported).toBe(false);
    expect(await unsupported.switchOn('why')).toBe(false);
    expect(api.request).not.toHaveBeenCalled();
    expect(await unsupported.lockNow()).toBe(false);
    expect(api.lockNow).not.toHaveBeenCalled();
  });

  it('switches on through Android\'s screen, with the explanation, and off in one step', async () => {
    const { api } = fakeAdmin();
    const setting = new LockSetting(api);
    expect(setting.getState()).toMatchObject({ supported: true, on: false });

    expect(await setting.switchOn('The explanation')).toBe(true);
    expect(api.request).toHaveBeenCalledWith('The explanation');
    expect(setting.getState()).toMatchObject({ on: true, busy: false, failed: false });

    expect(await setting.switchOff()).toBe(false);
    expect(api.remove).toHaveBeenCalledTimes(1);
    expect(setting.getState()).toMatchObject({ on: false, busy: false });
  });

  it('stays off if the user cancels Android\'s screen, and says so if it went wrong', async () => {
    const { admin, api } = fakeAdmin();
    admin.accept = false;
    const setting = new LockSetting(api);
    expect(await setting.switchOn('why')).toBe(false);
    expect(setting.getState()).toMatchObject({ on: false, failed: false });

    (api.request as jest.Mock).mockRejectedValueOnce(new Error('no device admin screen'));
    expect(await setting.switchOn('why')).toBe(false);
    expect(setting.getState()).toMatchObject({ on: false, failed: true, busy: false });
  });

  it('shows what Android says, whatever was answered', async () => {
    const { admin, api } = fakeAdmin({ request: jest.fn(async () => false) });
    const setting = new LockSetting(api);
    (api.request as jest.Mock).mockImplementationOnce(async () => {
      admin.on = true;
      return false;
    });
    expect(await setting.switchOn('why')).toBe(true);
    expect(setting.getState().on).toBe(true);
  });

  it('notices when it was switched off in Android\'s settings', async () => {
    const { admin, api } = fakeAdmin();
    admin.on = true;
    const setting = new LockSetting(api);
    const listener = jest.fn();
    setting.subscribe(listener);
    expect(setting.getState().on).toBe(true);

    admin.on = false;
    setting.refresh();
    expect(setting.getState().on).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
    setting.refresh();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('locks the screen only while it is on', async () => {
    const { admin, api } = fakeAdmin();
    const setting = new LockSetting(api);
    expect(await setting.lockNow()).toBe(false);
    expect(api.lockNow).not.toHaveBeenCalled();

    admin.on = true;
    // Switched on (or back on) outside this screen: the real state is read first.
    expect(await setting.lockNow()).toBe(true);
    expect(api.lockNow).toHaveBeenCalledTimes(1);

    admin.on = false;
    expect(await setting.lockNow()).toBe(false);
    expect(api.lockNow).toHaveBeenCalledTimes(1);

    admin.on = true;
    (api.lockNow as jest.Mock).mockRejectedValueOnce(new Error('SecurityException'));
    expect(await setting.lockNow()).toBe(false);
  });

  it('reads the state again when Saakshi comes back to the screen', () => {
    const native = { on: true };
    jest.isolateModules(() => {
      // This registry has its own react-native: the platform and AppState are set on it.
      const RN = jest.requireActual('react-native') as typeof import('react-native');
      Object.defineProperty(RN.Platform, 'OS', { value: 'android', configurable: true });
      const listeners: ((state: string) => void)[] = [];
      jest.spyOn(RN.AppState, 'addEventListener').mockImplementation((_type, listener) => {
        listeners.push(listener as (state: string) => void);
        return { remove: jest.fn() } as unknown as ReturnType<typeof RN.AppState.addEventListener>;
      });
      jest.doMock('@native/saakshi-sos', () => ({
        __esModule: true,
        default: {
          lockAdminSupported: () => true,
          lockAdminActive: () => native.on,
          lockAdminRequest: jest.fn(),
          lockAdminRemove: jest.fn(),
          lockNow: jest.fn(),
        },
      }));
      const { lockSetting } = jest.requireActual('../lockScreenInstance') as typeof import('../lockScreenInstance');
      expect(lockSetting.getState()).toMatchObject({ supported: true, on: true });
      native.on = false;
      for (const listener of listeners) listener('background');
      expect(lockSetting.getState().on).toBe(true);
      for (const listener of listeners) listener('active');
      expect(lockSetting.getState().on).toBe(false);
    });
  });
});

const ROOT = join(__dirname, '../../../..');
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');
const ANDROID = 'modules/saakshi-sos/android/src/main';

describe('the device admin in the native module (round 2, group 1.7)', () => {
  it('declares the force-lock policy and nothing else', () => {
    const policy = read(`${ANDROID}/res/xml/saakshi_lock_admin.xml`).replace(/<!--[\s\S]*?-->/g, '');
    const inside = policy.match(/<uses-policies>([\s\S]*)<\/uses-policies>/)?.[1] ?? '';
    expect(inside.match(/<[a-z-]+/g)).toEqual(['<force-lock']);
    expect(policy).not.toMatch(/wipe-data|reset-password|limit-password|watch-login|expire-password|encrypted-storage|disable-camera|disable-keyguard/);
  });

  it('registers the receiver for the system only, and requests no permission for it', () => {
    const manifest = read(`${ANDROID}/AndroidManifest.xml`).replace(/<!--[\s\S]*?-->/g, '');
    const receiver = manifest.match(/<receiver[^>]*LockAdminReceiver[\s\S]*?<\/receiver>/)?.[0] ?? '';
    expect(receiver).toContain('android:permission="android.permission.BIND_DEVICE_ADMIN"');
    expect(receiver).toContain('android:name="android.app.device_admin"');
    expect(receiver).toContain('android:resource="@xml/saakshi_lock_admin"');
    expect(receiver).toContain('android.app.action.DEVICE_ADMIN_ENABLED');
    // The permissions the module asked for before group 1.7, and no more.
    expect([...manifest.matchAll(/<uses-permission android:name="([^"]+)"/g)].map((m) => m[1]).sort()).toEqual([
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MICROPHONE',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.WAKE_LOCK',
    ]);
    for (const path of [`${ANDROID}/AndroidManifest.xml`, 'app.json', 'app.config.ts']) {
      expect(read(path)).not.toMatch(/LOCK_DEVICE|MANAGE_DEVICE_POLICY/);
    }
  });

  it('passes the explanation to Android\'s screen, switches off with removeActiveAdmin, and only locks', () => {
    const kotlin = read(`${ANDROID}/java/expo/modules/saakshisos/LockAdmin.kt`);
    expect(kotlin).toContain('DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN');
    expect(kotlin).toContain('DevicePolicyManager.EXTRA_ADD_EXPLANATION, input.explanation');
    expect(kotlin).toContain('removeActiveAdmin(component(context))');
    expect(kotlin).toContain('?.lockNow()');
    expect(kotlin).toContain('class LockAdminReceiver : DeviceAdminReceiver()');
    expect(kotlin).not.toMatch(/wipeData|resetPassword|setPassword|setCameraDisabled|setKeyguardDisabled/);
    const swift = read('modules/saakshi-sos/ios/SaakshiSosModule.swift');
    for (const name of ['lockAdminSupported', 'lockAdminActive', 'lockAdminRequest', 'lockAdminRemove', 'lockNow']) {
      expect(swift).toContain(`"${name}"`);
    }
  });
});

// The setting with a fake Android device admin, for the screens.
jest.mock('../lockScreenInstance', () => {
  const { useSyncExternalStore } = jest.requireActual('react');
  const { LockSetting: Setting } = jest.requireActual('../lockScreen');
  const admin = { on: false };
  const api = {
    supported: () => true,
    active: () => admin.on,
    request: jest.fn(async () => (admin.on = true)),
    remove: jest.fn(async () => (admin.on = false)),
    lockNow: jest.fn(async () => admin.on),
  };
  const lockSetting = new Setting(api);
  return { admin, api, lockSetting, useLockSetting: () => useSyncExternalStore(lockSetting.subscribe, lockSetting.getState) };
});

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...args: unknown[]) => mockPush(...args) } }));

const fake = jest.requireMock('../lockScreenInstance') as {
  admin: { on: boolean };
  api: { request: jest.Mock; remove: jest.Mock };
  lockSetting: LockSetting;
};

function wrap(children: React.ReactNode) {
  return <PreferencesProvider initial={{ language: 'en', theme: 'light' }}>{children}</PreferencesProvider>;
}

describe('Settings → Lock the phone (Android)', () => {
  beforeAll(() => {
    initI18n('en');
  });

  afterEach(async () => {
    await act(() => i18n.changeLanguage('en'));
  });

  it('explains it plainly before Android\'s screen, and hands Android the same explanation', async () => {
    fake.admin.on = false;
    fake.lockSetting.refresh();
    await render(wrap(<LockSettings />));
    expect(screen.getByText('Lock the phone when "My phone is being taken" starts')).toBeTruthy();
    expect(screen.getByText(/it can't erase your phone or change your screen lock/)).toBeTruthy();
    expect(screen.getByText('While it is on, Android asks for it to be switched off before Saakshi can be deleted.')).toBeTruthy();
    expect(screen.getByText(/You can switch it off here at any time, in one tap/)).toBeTruthy();
    expect(screen.getByText(/^Off\./)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Switch on' }));
    const explanation = fake.api.request.mock.calls[0][0] as string;
    expect(explanation.split('\n\n')).toHaveLength(4);
    expect(explanation).toContain('Android asks for it to be switched off before Saakshi can be deleted');
    expect(explanation).toContain('nothing else');
    expect(await screen.findByText(/^On\./)).toBeTruthy();

    // Switching off is a button in the same place.
    await fireEvent.press(screen.getByRole('button', { name: 'Switch off' }));
    expect(fake.api.remove).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/^Off\./)).toBeTruthy();
  });

  it('shows it as off when it was switched off in Android\'s settings', async () => {
    fake.admin.on = true;
    fake.lockSetting.refresh();
    await render(wrap(<LockSettingsCard />));
    expect(screen.getByText(/^On\./)).toBeTruthy();
    fake.admin.on = false;
    await act(async () => fake.lockSetting.refresh());
    expect(screen.getByText(/^Off\./)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Open' }));
    expect(mockPush).toHaveBeenCalledWith('/settings/lock');
  });

  it('is in Hindi too', async () => {
    await act(() => i18n.changeLanguage('hi'));
    fake.admin.on = false;
    fake.lockSetting.refresh();
    await render(wrap(<LockSettings />));
    expect(screen.getByText('“मेरा फ़ोन लिया जा रहा है” शुरू होने पर फ़ोन लॉक करें')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'चालू करें' })).toBeTruthy();
  });
});

// "Now lock your phone" on the running card, with a stand-in controller.
jest.mock('../phoneTakenInstance', () => {
  const { useSyncExternalStore } = jest.requireActual('react');
  const { PhoneTakenController } = jest.requireActual('../phoneTaken');
  let text: string | null = null;
  const parts = { lockScreen: jest.fn(async () => false) };
  const phoneTaken = new PhoneTakenController({
    storage: { read: () => text, write: (value: string) => void (text = value) },
    codeIsSet: async () => true,
    requireCode: async () => true,
    startPocket: async () => undefined,
    stopPocket: async () => undefined,
    startLive: async () => ({ link: 'https://live/#tok', invite: 'invite' }),
    stopLive: async () => undefined,
    alert: async () => undefined,
    textLink: async () => undefined,
    heartbeat: { start: () => undefined, stop: () => undefined },
    lockScreen: (...args: []) => parts.lockScreen(...args),
    inForeground: () => true,
    now: () => new Date('2026-11-09T05:10:00Z'),
    liveWaitMs: 10,
  });
  return { phoneTaken, parts, usePhoneTaken: () => useSyncExternalStore(phoneTaken.subscribe, phoneTaken.getState) };
});
jest.mock('@/modules/bugmode', () => ({ useBugMode: () => ({ running: true }) }));
jest.mock('@/modules/location', () => ({ useLiveShare: () => ({ shareId: 's' }) }));
jest.mock('@/modules/secretcode', () => ({ openCodeScreen: jest.fn(async () => true) }));

const taken = jest.requireMock('../phoneTakenInstance') as {
  phoneTaken: import('../phoneTaken').PhoneTakenController;
  parts: { lockScreen: jest.Mock };
};

describe('"Now lock your phone" (round 2, group 1.7)', () => {
  const realOS = Platform.OS;

  beforeAll(() => {
    initI18n('en');
  });

  afterEach(async () => {
    Object.defineProperty(Platform, 'OS', { value: realOS, configurable: true });
    await act(async () => {
      await taken.phoneTaken.stop();
    });
    await act(() => i18n.changeLanguage('en'));
  });

  const page = () =>
    wrap(
      <>
        <PhoneTakenStatus at="first" />
        <AppStateMarker />
        <PhoneTakenStatus at="normal" />
      </>,
    );

  it('on iPhone, shows the running card first and large, with the side button', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    taken.parts.lockScreen.mockResolvedValue(false);
    await render(page());
    await act(async () => {
      await taken.phoneTaken.start();
    });
    const order = screen.getAllByText(/Now lock your phone|\| marker \||"My phone is being taken" is on/).map((n) => n.props.children);
    expect(order).toEqual(['Now lock your phone', '"My phone is being taken" is on', '| marker |']);
    expect(screen.getByText('Press the side button.')).toBeTruthy();
    expect(screen.getByText('Sound recording and location sharing carry on with the screen locked.')).toBeTruthy();
    expect(screen.getByTestId('lock-reminder').props.accessibilityRole).toBe('alert');

    // Until the app goes to the background (the screen locked): then the card goes back to its place.
    await act(async () => taken.phoneTaken.appInBackground());
    expect(screen.queryByText('Now lock your phone')).toBeNull();
    const after = screen.getAllByText(/\| marker \||"My phone is being taken" is on/).map((n) => n.props.children);
    expect(after).toEqual(['| marker |', '"My phone is being taken" is on']);
  });

  it('on Android without the admin, names the power button', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    taken.parts.lockScreen.mockResolvedValue(false);
    await render(page());
    await act(async () => {
      await taken.phoneTaken.start();
    });
    expect(screen.getByText('Now lock your phone')).toBeTruthy();
    expect(screen.getByText('Press the power button.')).toBeTruthy();
  });

  it('on Android with the admin, shows no reminder: Saakshi locked the screen', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    taken.parts.lockScreen.mockResolvedValue(true);
    await render(page());
    await act(async () => {
      await taken.phoneTaken.start();
    });
    expect(screen.queryByText('Now lock your phone')).toBeNull();
    expect(screen.getByText('"My phone is being taken" is on')).toBeTruthy();
  });

  it('is in Hindi too', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    taken.parts.lockScreen.mockResolvedValue(false);
    await act(() => i18n.changeLanguage('hi'));
    await render(page());
    await act(async () => {
      await taken.phoneTaken.start();
    });
    expect(screen.getByText('अब अपना फ़ोन लॉक करें')).toBeTruthy();
    expect(screen.getByText('साइड बटन दबाएँ।')).toBeTruthy();
  });
});

/** Marks the page's middle (the swipes and the rest), between the two places the card can be. */
function AppStateMarker() {
  const { Text } = jest.requireActual('react-native') as typeof import('react-native');
  return <Text>| marker |</Text>;
}
