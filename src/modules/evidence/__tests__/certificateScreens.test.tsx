import { fireEvent, render, screen } from '@testing-library/react-native';

import { initI18n } from '@/i18n';
import { PreferencesProvider } from '@/preferences/PreferencesProvider';

import { type CertificateDetails, emptyDetails } from '../certificate/html';
import { CertificateForm } from '../ui/CertificateForm';
import { CertificateProfile } from '../ui/CertificateProfile';

let mockStored: CertificateDetails = emptyDetails;
const mockSaved: CertificateDetails[] = [];
const mockMade: string[] = [];

jest.mock('../certificate/generate', () => ({
  loadDetails: () => mockStored,
  saveDetails: (details: CertificateDetails) => {
    mockStored = details;
    mockSaved.push(details);
  },
  makeCertificate: async (sessionId: string) => {
    mockMade.push(sessionId);
    return 'file:///cert.pdf';
  },
  shareCertificate: async () => undefined,
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    router: { push: (...args: unknown[]) => mockPush(...args), back: jest.fn() },
    useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]),
  };
});

function wrap(children: React.ReactNode) {
  return <PreferencesProvider initial={{ language: 'en', theme: 'light' }}>{children}</PreferencesProvider>;
}

const complete: CertificateDetails = {
  ...emptyDetails,
  name: 'Asha Rao',
  relativeName: 'Ravi Rao',
  address: '12 Marine Drive, Mumbai',
  imei: '356938035643809',
  ownership: ['operated', 'owned'],
};

describe('certificate: one profile, no form (fix round 1, group 8)', () => {
  beforeAll(() => {
    initI18n('en');
  });

  beforeEach(() => {
    mockStored = emptyDetails;
    mockSaved.length = 0;
    mockMade.length = 0;
    mockPush.mockClear();
  });

  it('says the details are incomplete, and opens them', async () => {
    await render(wrap(<CertificateForm sessionId="s1" />));
    expect(screen.getByText('Your details for certificates aren’t complete yet. Part A needs them.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Make certificate' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Fill in your details' }));
    expect(mockPush).toHaveBeenCalledWith('/record/certificate-profile');
  });

  it('says whom Part A is for, and makes it with one tap', async () => {
    mockStored = complete;
    await render(wrap(<CertificateForm sessionId="s1" />));
    expect(screen.getByText('Part A will be made for Asha Rao, who owns and operates this phone (IMEI 356938035643809).')).toBeTruthy();
    expect(screen.queryByText('Your full name')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Make certificate' }));
    expect(mockMade).toEqual(['s1']);
  });

  it('keeps the profile on the phone as it is typed', async () => {
    await render(wrap(<CertificateProfile />));
    await fireEvent.changeText(screen.getByLabelText('Your full name'), 'Asha Rao');
    expect(mockSaved.at(-1)?.name).toBe('Asha Rao');
    expect(mockStored.name).toBe('Asha Rao');
  });
});
