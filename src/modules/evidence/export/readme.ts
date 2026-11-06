import { FORMAT_VERSION } from '../constants';
import { CERTIFICATE_NAME, HASH_REPORT_NAME, MEDIA_FOLDER, RECORDS_FOLDER } from './layout';

/**
 * README.txt, for a reader with no technical background, in English and then Hindi (fix round 1,
 * group 9): what each file and folder is, why it is there, and how a lawyer or expert checks the
 * bundle. It is not an app screen, so it is not in the i18n files: every bundle carries both
 * languages, whatever the app's language. The steps are section 10 of docs/spec/evidence-bundle.md.
 *
 * NEEDS OWNER REVIEW: the whole text (it tells a court reader what the bundle proves), the Hindi,
 * and the closing lines on section 63(4)(c).
 */
export function readme(input: {
  /** "2026-11-05 10-40 IST Body-cam". */
  name: string;
  /** The bundle's file name, for the command that checks it. */
  fileName: string;
  /** A record and a file of this bundle, for the example commands. */
  exampleRecord: string;
  exampleMedia: string;
}): string {
  const { name, fileName, exampleRecord, exampleMedia } = input;
  // A byte-order mark and Windows line ends, so that Notepad on an older PC shows the Hindi and the
  // lines as they are; other readers ignore both.
  return `\ufeffSAAKSHI EVIDENCE BUNDLE / साक्षी सबूत बंडल
Record / रिकॉर्ड: ${name}
Format / फ़ॉर्मैट: ${FORMAT_VERSION}

English first; हिन्दी नीचे है।

======================================================================
ENGLISH
======================================================================

WHAT THIS IS

This is a recording made with the Saakshi app on a phone, kept so that it can be checked later.
It holds the recording exactly as the phone saved it, and proof, made at the time, that it has not
been changed since.

WHAT IS IN IT

  ${MEDIA_FOLDER}/
      The photos, videos and sound recordings, exactly as the phone saved them. Nothing in them
      has been edited, cut or converted. Each name says when the file started (India time) and
      which file it is, for example "video 1".

  ${RECORDS_FOLDER}/
      One record for each file (.json) and its digital signature (.json.sig). A record says when,
      where and on which phone its file was made, and gives the file's fingerprint (SHA-256).
      Records whose names say "checkpoint" were signed every 10 seconds while a long recording was
      still going on, so that even if it was cut off, what had been recorded until then can be
      checked. The number at the start of each name is the record's place in the chain (below).

  ${HASH_REPORT_NAME}
      A table of every file: its size, its fingerprints (SHA-256, SHA-1 and MD5) and its record.
      This is the hash report that the certificate's form asks to be enclosed.

  ${CERTIFICATE_NAME}   (only if one was made)
      Part A of the certificate under section 63(4)(c) of the Bharatiya Sakshya Adhiniyam, 2023,
      filled in by the app, for the phone's owner to sign.

  device-key.json
      The phone's public key, which checks the signatures, and, if the phone could make one, an
      attestation: a statement signed through Google or Apple about the key and the app.

  manifest.json
      A list of everything in the bundle, for software. It also gives each file's name inside the
      app, which is the name in its record ("file.name").

  README.txt
      This file.

HOW THE PROOF WORKS

A fingerprint (SHA-256) is a long number worked out from every byte of a file. If even one byte of
the file changes, the fingerprint changes. Each record holds its file's fingerprint and is signed
with the phone's own key, which Saakshi keeps on the phone and never sends anywhere. Each record
also holds the fingerprint of the record before it, so the records form a chain: a record cannot
be changed, added, or taken out of the middle without it showing. The fingerprint of the last
record, the "chain head", stands for the whole recording. Records taken off the end don't show
from the bundle alone; they show against a chain head that someone else holds. If a witness
message was sent, the trusted contacts who received it hold the chain head as it was then;
${HASH_REPORT_NAME} lists the witness messages.

HOW A LAWYER OR EXPERT CHECKS IT

Keep this bundle as it is, and check a copy.

The quick way: with Node.js, run tools/verify-bundle.mjs from the Saakshi repository
(https://github.com/AayushTainwala/Saakshi):

    node verify-bundle.mjs "${fileName}"

It prints "OK" if every signature, file, checkpoint and the chain check out, and says what is
wrong if not. It lists each file it checked, and the chain head to compare with any witness
message.

By hand, with standard tools (the full steps are in docs/spec/evidence-bundle.md, section 10, in
the same repository):

  1. Save the "publicKeyPem" value from device-key.json as key.pem.
  2. For each record, check its signature. For example:
         openssl dgst -sha256 -verify key.pem -signature "${exampleRecord}.sig" "${exampleRecord}"
     It must print "Verified OK".
  3. For each file, its SHA-256 must equal "file.sha256" in its record. For example:
         sha256sum "${exampleMedia}"
     ${HASH_REPORT_NAME} shows which record goes with which file.
  4. For each checkpoint record, the SHA-256 of the first "file.size" bytes of its file must equal
     its "file.sha256":  head -c <file.size> "<file>" | sha256sum
     Its file is the one whose record has the same "recording".
  5. Each record's "previous.recordSha256" must equal the SHA-256 of the record before it (the
     numbers at the start of the names give the order). The SHA-256 of the last record is the
     chain head: compare it with any witness message.

THE CERTIFICATE

A certificate under section 63(4)(c) of the Bharatiya Sakshya Adhiniyam, 2023 needs Part A (signed
by the person in charge of the device) and Part B (signed by an expert). "${CERTIFICATE_NAME}", if
present, is Part A, filled in by the app. The app cannot provide Part B.

======================================================================
हिन्दी
======================================================================

यह क्या है

यह साक्षी (Saakshi) ऐप से फ़ोन पर की गई एक रिकॉर्डिंग है, जिसे इस तरह रखा गया है कि बाद में उसकी जाँच हो
सके। इसमें रिकॉर्डिंग ठीक वैसी है जैसी फ़ोन ने सेव की थी, और उसी समय बना सबूत है कि तब से उसमें कोई
बदलाव नहीं हुआ।

इसमें क्या है

  ${MEDIA_FOLDER}/
      फ़ोटो, वीडियो और आवाज़ की रिकॉर्डिंग, ठीक वैसी जैसी फ़ोन ने सेव कीं। इनमें कुछ भी एडिट नहीं
      किया गया, काटा नहीं गया और बदला नहीं गया। हर नाम बताता है कि फ़ाइल कब शुरू हुई (भारतीय समय)
      और वह कौन-सी फ़ाइल है, जैसे "video 1" (वीडियो 1)।

  ${RECORDS_FOLDER}/
      हर फ़ाइल का एक रिकॉर्ड (.json) और उसका डिजिटल हस्ताक्षर (.json.sig)। रिकॉर्ड बताता है कि
      उसकी फ़ाइल कब, कहाँ और किस फ़ोन पर बनी, और फ़ाइल का फ़िंगरप्रिंट (SHA-256) देता है। जिन
      रिकॉर्ड के नाम में "checkpoint" है, उन पर लंबी रिकॉर्डिंग चलते समय हर 10 सेकंड पर हस्ताक्षर
      हुए, ताकि रिकॉर्डिंग बीच में कट जाए तब भी उस समय तक जितना रिकॉर्ड हुआ था उसकी जाँच हो सके।
      हर नाम की शुरुआत की संख्या बताती है कि रिकॉर्ड कड़ी (नीचे देखें) में किस जगह पर है।

  ${HASH_REPORT_NAME}
      हर फ़ाइल की तालिका: उसका आकार, उसके फ़िंगरप्रिंट (SHA-256, SHA-1 और MD5) और उसका रिकॉर्ड।
      यह वह हैश रिपोर्ट है जिसे सर्टिफ़िकेट का फ़ॉर्म साथ लगाने को कहता है।

  ${CERTIFICATE_NAME}   (सिर्फ़ अगर बनाया गया हो)
      भारतीय साक्ष्य अधिनियम, 2023 की धारा 63(4)(c) के सर्टिफ़िकेट का भाग A, जिसे ऐप ने भरा है और
      जिस पर फ़ोन के मालिक को हस्ताक्षर करना है।

  device-key.json
      फ़ोन की पब्लिक की (public key), जिससे हस्ताक्षरों की जाँच होती है, और अगर फ़ोन बना सका तो
      एक attestation: Google या Apple के ज़रिए हस्ताक्षरित बयान, उस की और ऐप के बारे में।

  manifest.json
      बंडल में जो कुछ है उसकी सूची, सॉफ़्टवेयर के लिए। इसमें हर फ़ाइल का ऐप के अंदर का नाम भी है,
      जो उसके रिकॉर्ड में लिखा नाम है ("file.name")।

  README.txt
      यही फ़ाइल।

सबूत कैसे काम करता है

फ़िंगरप्रिंट (SHA-256) एक लंबी संख्या है जो फ़ाइल के हर बाइट से निकाली जाती है। फ़ाइल का एक भी बाइट
बदले तो फ़िंगरप्रिंट बदल जाता है। हर रिकॉर्ड में उसकी फ़ाइल का फ़िंगरप्रिंट होता है, और उस पर फ़ोन की
अपनी की से हस्ताक्षर होता है, जिसे साक्षी फ़ोन में ही रखता है और कहीं नहीं भेजता। हर रिकॉर्ड में
उससे पहले वाले रिकॉर्ड का फ़िंगरप्रिंट भी होता है, इसलिए रिकॉर्ड एक कड़ी (chain) बनाते हैं: कोई
रिकॉर्ड बदला, जोड़ा या बीच में से हटाया जाए तो पता चल जाता है। आख़िरी रिकॉर्ड का फ़िंगरप्रिंट, यानी
"chain head", पूरी रिकॉर्डिंग की पहचान है। आख़िर से हटाए गए रिकॉर्ड सिर्फ़ बंडल से पता नहीं चलते;
वे किसी और के पास रखे chain head से मिलाने पर पता चलते हैं। अगर गवाह मैसेज भेजा गया था, तो जिन
भरोसेमंद लोगों को वह मिला उनके पास उस समय का chain head है; ${HASH_REPORT_NAME} में गवाह मैसेज की
सूची है।

वकील या विशेषज्ञ इसकी जाँच कैसे करें

इस बंडल को जैसा है वैसा रखें, और जाँच उसकी कॉपी पर करें।

आसान तरीका: Node.js से साक्षी (Saakshi) की रिपॉज़िटरी (https://github.com/AayushTainwala/Saakshi) का
tools/verify-bundle.mjs चलाएँ:

    node verify-bundle.mjs "${fileName}"

अगर हर हस्ताक्षर, फ़ाइल, checkpoint और कड़ी सही है तो यह "OK" लिखता है, और नहीं तो बताता है कि क्या
ग़लत है। यह हर जाँची गई फ़ाइल की सूची देता है, और chain head भी, ताकि उसे किसी गवाह मैसेज से मिलाया
जा सके।

हाथ से, आम टूल से (पूरे क़दम उसी रिपॉज़िटरी में docs/spec/evidence-bundle.md के सेक्शन 10 में हैं):

  1. device-key.json में "publicKeyPem" की वैल्यू को key.pem नाम से सेव करें।
  2. हर रिकॉर्ड का हस्ताक्षर जाँचें। उदाहरण:
         openssl dgst -sha256 -verify key.pem -signature "${exampleRecord}.sig" "${exampleRecord}"
     इसे "Verified OK" लिखना चाहिए।
  3. हर फ़ाइल का SHA-256 उसके रिकॉर्ड के "file.sha256" के बराबर होना चाहिए। उदाहरण:
         sha256sum "${exampleMedia}"
     ${HASH_REPORT_NAME} बताती है कि कौन-सा रिकॉर्ड किस फ़ाइल का है।
  4. हर checkpoint रिकॉर्ड के लिए, उसकी फ़ाइल के पहले "file.size" बाइट का SHA-256 उसके
     "file.sha256" के बराबर होना चाहिए:  head -c <file.size> "<फ़ाइल>" | sha256sum
     उसकी फ़ाइल वह है जिसके रिकॉर्ड में वही "recording" है।
  5. हर रिकॉर्ड का "previous.recordSha256" उससे पहले वाले रिकॉर्ड के SHA-256 के बराबर होना चाहिए
     (नामों की शुरुआत की संख्याएँ क्रम बताती हैं)। आख़िरी रिकॉर्ड का SHA-256 chain head है: इसे
     किसी भी गवाह मैसेज से मिलाएँ।

सर्टिफ़िकेट

भारतीय साक्ष्य अधिनियम, 2023 की धारा 63(4)(c) के सर्टिफ़िकेट के दो भाग चाहिए: भाग A (डिवाइस के
प्रभारी व्यक्ति के हस्ताक्षर से) और भाग B (एक विशेषज्ञ के हस्ताक्षर से)। "${CERTIFICATE_NAME}", अगर
है, तो भाग A है, जिसे ऐप ने भरा है। भाग B ऐप नहीं दे सकता।
`.replace(/\n/g, '\r\n');
}
