#!/usr/bin/env node
// Writes the GitHub Release notes for an APK: what it is, plain install steps in English and Hindi,
// and the two fingerprints that tell our build from a tampered copy.
//
//   node tools/release-notes.mjs --version 1.0.0 --build 7 --apk Saakshi-1.0.0.apk \
//     --sha256 <64 hex> --cert-sha256 <64 hex> --repo owner/name [--testflight URL] [--mirror URL]...
//
// Used by .github/workflows/release.yml. Prints Markdown to stdout.

import { parseArgs } from 'node:util';

const HEX64 = /^[0-9a-f]{64}$/;

/** "0a1b..." → "0A:1B:..." (the form Android tools and the Play Console show). */
export function colonHex(hex) {
  return hex.toUpperCase().match(/.{2}/g).join(':');
}

export function releaseNotes(o) {
  const cert = colonHex(o.certSha256);
  const releases = `https://github.com/${o.repo}/releases`;
  const lines = [
    `Saakshi ${o.version} (build ${o.build}) for Android.`,
    '',
    'Saakshi helps you protect yourself and your rights: record photos and video for your own records, fingerprinted and signed on your phone; alert your trusted contacts with your location; and know what to do, in English and Hindi. It does not call emergency services. **In an emergency, call 112.**',
    '',
    '## Check that this is the real app',
    '',
    'Only install a file whose fingerprints match these. Anyone can copy and change an app; a changed copy cannot match.',
    '',
    `- **File:** \`${o.apk}\``,
    `- **SHA-256 of the file:** \`${o.sha256}\``,
    `- **Signing certificate SHA-256:** \`${cert}\``,
    '',
    'Every Saakshi release is signed with the same certificate. If Android refuses to install an update over Saakshi ("App not installed" or "conflicts with an existing package"), the file was not signed by us: delete it.',
    '',
    'To check the file on a computer:',
    '',
    `- Linux: \`sha256sum ${o.apk}\``,
    `- Mac: \`shasum -a 256 ${o.apk}\``,
    `- Windows: \`certutil -hashfile ${o.apk} SHA256\``,
    `- Signing certificate, with Android's build tools: \`apksigner verify --print-certs ${o.apk}\``,
    '',
    '## Install on Android',
    '',
    `1. On your phone, open this page in Chrome and tap **${o.apk}** under **Assets** to download it.`,
    '2. Open the downloaded file. Android will say it is not allowed to install unknown apps from Chrome. Tap **Settings**, turn on **Allow from this source**, and go back.',
    '3. Tap **Install**. If Google Play Protect offers to scan the app, let it.',
    '4. Open Saakshi. It asks for each permission only when you first use the feature that needs it.',
    '5. You can now turn **Allow from this source** off again for Chrome (Settings → Apps → Special app access → Install unknown apps).',
    '',
    `To update, download the new APK from ${releases} and install it over this one. Your recordings stay on the phone.`,
    '',
  ];

  if (o.testflight) {
    lines.push('## iPhone', '', `Install TestFlight from the App Store, then open ${o.testflight} on your iPhone.`, '');
  }

  if (o.mirrors.length > 0) {
    lines.push('## If GitHub is not reachable', '', 'The same files, with the same fingerprints, are also at:', '');
    for (const m of o.mirrors) lines.push(`- ${m}`);
    lines.push('');
  }

  lines.push(
    '---',
    '',
    `साक्षी ${o.version} (बिल्ड ${o.build}), Android के लिए।`,
    '',
    'साक्षी आपकी और आपके अधिकारों की हिफ़ाज़त में मदद करता है: अपने रिकॉर्ड के लिए फ़ोटो और वीडियो बनाइए, जिनकी पहचान (फ़िंगरप्रिंट) और हस्ताक्षर आपके फ़ोन पर ही होते हैं; अपने भरोसे के लोगों को अपनी जगह के साथ ख़बर भेजिए; और जानिए कि क्या करना है, अंग्रेज़ी और हिंदी में। यह इमरजेंसी सेवा को कॉल नहीं करता। **इमरजेंसी में 112 पर कॉल करें।**',
    '',
    '## जाँचें कि ऐप असली है',
    '',
    'वही फ़ाइल इंस्टॉल करें जिसके फ़िंगरप्रिंट ऊपर लिखे फ़िंगरप्रिंट से मिलते हों। कोई भी ऐप की कॉपी बनाकर उसे बदल सकता है, पर बदली हुई कॉपी के फ़िंगरप्रिंट नहीं मिलेंगे।',
    '',
    'साक्षी की हर रिलीज़ पर एक ही सर्टिफ़िकेट से हस्ताक्षर होते हैं। अगर Android साक्षी के ऊपर अपडेट इंस्टॉल न करे ("App not installed" या "conflicts with an existing package"), तो वह फ़ाइल हमारी नहीं है: उसे डिलीट कर दें।',
    '',
    '## Android पर इंस्टॉल करें',
    '',
    `1. फ़ोन पर यह पेज Chrome में खोलें और **Assets** के नीचे **${o.apk}** पर टैप करके डाउनलोड करें।`,
    '2. डाउनलोड हुई फ़ाइल खोलें। Android कहेगा कि Chrome से अनजान ऐप इंस्टॉल करने की इजाज़त नहीं है। **Settings** पर टैप करें, **Allow from this source** चालू करें, और वापस आएँ।',
    '3. **Install** पर टैप करें। अगर Google Play Protect ऐप को स्कैन करने को कहे, तो स्कैन होने दें।',
    '4. साक्षी खोलें। कोई भी इजाज़त (परमिशन) वह तभी माँगता है जब आप पहली बार वह सुविधा इस्तेमाल करते हैं जिसे उसकी ज़रूरत है।',
    '5. अब आप Chrome के लिए **Allow from this source** फिर से बंद कर सकते हैं (Settings → Apps → Special app access → Install unknown apps)।',
    '',
    `अपडेट के लिए नई APK ${releases} से डाउनलोड करें और इसी के ऊपर इंस्टॉल करें। आपकी रिकॉर्डिंग फ़ोन पर ही रहती हैं।`,
    '',
  );

  if (o.testflight) {
    lines.push('## iPhone', '', `App Store से TestFlight इंस्टॉल करें, फिर अपने iPhone पर ${o.testflight} खोलें।`, '');
  }

  return lines.join('\n');
}

function main() {
  const { values } = parseArgs({
    options: {
      version: { type: 'string' },
      build: { type: 'string' },
      apk: { type: 'string' },
      sha256: { type: 'string' },
      'cert-sha256': { type: 'string' },
      repo: { type: 'string' },
      testflight: { type: 'string' },
      mirror: { type: 'string', multiple: true },
    },
  });
  for (const k of ['version', 'build', 'apk', 'sha256', 'cert-sha256', 'repo']) {
    if (!values[k]) throw new Error(`--${k} is required`);
  }
  const sha256 = values.sha256.toLowerCase();
  const certSha256 = values['cert-sha256'].toLowerCase().replaceAll(':', '');
  if (!HEX64.test(sha256)) throw new Error('--sha256 must be 64 hex digits');
  if (!HEX64.test(certSha256)) throw new Error('--cert-sha256 must be 64 hex digits');
  process.stdout.write(
    releaseNotes({
      version: values.version,
      build: values.build,
      apk: values.apk,
      sha256,
      certSha256,
      repo: values.repo,
      testflight: values.testflight || '',
      mirrors: (values.mirror ?? []).filter(Boolean),
    }),
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (e) {
    console.error(`release-notes: ${e.message}`);
    process.exit(1);
  }
}
