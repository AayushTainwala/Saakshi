import type { ExpoConfig } from 'expo/config';

const withSaakshiSos: ((config: ExpoConfig) => ExpoConfig) & {
  autoSendEnabled: (env: Record<string, string | undefined>) => boolean;
} = jest.requireActual('../app.plugin.js');

const base = (): ExpoConfig => ({ name: 'Saakshi', slug: 'saakshi' });

describe('saakshi-sos config plugin', () => {
  const saved = process.env.SAAKSHI_SMS_AUTOSEND;
  afterEach(() => {
    if (saved === undefined) delete process.env.SAAKSHI_SMS_AUTOSEND;
    else process.env.SAAKSHI_SMS_AUTOSEND = saved;
  });

  it('reads the build flag', () => {
    expect(withSaakshiSos.autoSendEnabled({ SAAKSHI_SMS_AUTOSEND: '1' })).toBe(true);
    expect(withSaakshiSos.autoSendEnabled({ SAAKSHI_SMS_AUTOSEND: 'TRUE' })).toBe(true);
    expect(withSaakshiSos.autoSendEnabled({ SAAKSHI_SMS_AUTOSEND: '0' })).toBe(false);
    expect(withSaakshiSos.autoSendEnabled({})).toBe(false);
  });

  it('declares SEND_SMS in the APK build', () => {
    process.env.SAAKSHI_SMS_AUTOSEND = '1';
    const config = withSaakshiSos(base());
    expect(config.android?.permissions).toContain('android.permission.SEND_SMS');
  });

  it('keeps SEND_SMS out of every other build', () => {
    delete process.env.SAAKSHI_SMS_AUTOSEND;
    const config = withSaakshiSos({ ...base(), android: { permissions: ['android.permission.SEND_SMS'] } });
    expect(config.android?.permissions ?? []).not.toContain('android.permission.SEND_SMS');
  });
});
