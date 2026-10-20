import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { CERTIFICATE_FILE, chainHead } from '../export/contents';
import { ensureDeviceKey } from '../integrity/deviceKey';
import { loadSealed } from '../locker/records';
import { fileLocker } from '../locker/store';
import { type CertificateDetails, certificateHtml, emptyDetails } from './html';

function detailsFile(): File {
  return new File(Paths.document, 'evidence', 'certificate-details.json');
}

/** The details typed for the last certificate, kept only on this phone. */
export function loadDetails(): CertificateDetails {
  try {
    const file = detailsFile();
    return file.exists ? { ...emptyDetails, ...JSON.parse(file.textSync()) } : emptyDetails;
  } catch {
    return emptyDetails;
  }
}

export function saveDetails(details: CertificateDetails): void {
  const dir = new Directory(Paths.document, 'evidence');
  if (!dir.exists) dir.create({ intermediates: true });
  const file = detailsFile();
  if (!file.exists) file.create();
  file.writeSync(JSON.stringify(details));
}

/** Makes certificate-part-a.pdf (Part A and the hash report) in the session folder; returns its URI. */
export async function makeCertificate(sessionId: string, details: CertificateDetails): Promise<string> {
  const sealed = loadSealed(fileLocker, sessionId);
  if (!sealed.length) throw new Error('Nothing in this session has been sealed yet');
  const records = sealed.map((entry) => entry.bundled);
  const key = await ensureDeviceKey(fileLocker);
  const now = new Date();

  const html = certificateHtml({
    details,
    records,
    chainHead: chainHead(records)!,
    keyId: key.keyId,
    sessionId,
    generatedAt: now,
  });
  // A4 at 72 points per inch.
  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });

  const destination = new File(fileLocker.sessionFileUri(sessionId, CERTIFICATE_FILE));
  if (destination.exists) destination.delete();
  new File(uri).moveSync(destination);

  const session = fileLocker.readSession(sessionId);
  if (session) {
    fileLocker.writeSession({ ...session, certificate: { file: CERTIFICATE_FILE, createdAt: now.toISOString() } });
  }
  return destination.uri;
}

export async function shareCertificate(sessionId: string, dialogTitle: string): Promise<void> {
  await Sharing.shareAsync(fileLocker.sessionFileUri(sessionId, CERTIFICATE_FILE), {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle,
  });
}
