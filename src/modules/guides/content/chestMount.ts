import type { Guide } from './types';

/**
 * G4. Chest mount, and wearing the phone in body-cam mode (SPEC section 4, "Body-cam mode"; section
 * 6, G4). Mounts and models from docs/research/open-source-and-licences.md, section 5. The DIY
 * methods are untested and carry `needsTesting` until someone has tried them.
 */
export const chestMount: Guide = {
  id: 'chest-mount',
  title: {
    en: 'Wear your phone: chest mount',
    hi: 'फ़ोन पहनकर रिकॉर्ड करें: चेस्ट माउंट',
  },
  summary: {
    en: 'Record with your hands free and the camera steady, using body-cam mode.',
    hi: 'बॉडी-कैम मोड के साथ, हाथ ख़ाली रखकर और कैमरा स्थिर रखकर रिकॉर्ड करें।',
  },
  sections: [
    {
      id: 'why',
      heading: { en: 'Why wear it', hi: 'पहनें क्यों' },
      blocks: [
        {
          kind: 'paragraph',
          text: {
            en: 'A phone worn on your chest records what is in front of you while your hands stay free. It is steadier than a phone held up in your hand. Use it with body-cam mode, below, which keeps recording with the screen dark.',
            hi: 'सीने पर लगा फ़ोन आपके सामने जो हो रहा है, उसे रिकॉर्ड करता है, और आपके हाथ ख़ाली रहते हैं। हाथ में उठाए फ़ोन से यह ज़्यादा स्थिर रहता है। इसे नीचे बताए बॉडी-कैम मोड के साथ इस्तेमाल करें, जिसमें स्क्रीन अँधेरी रहती है और रिकॉर्डिंग चलती रहती है।',
          },
        },
      ],
    },
    {
      id: 'body-cam',
      heading: { en: 'Using it with body-cam mode', hi: 'बॉडी-कैम मोड के साथ इस्तेमाल' },
      blocks: [
        {
          kind: 'steps',
          items: [
            {
              en: 'Start body-cam mode before you put the phone in the mount. The screen goes dark and stops responding to touch, and recording carries on.',
              hi: 'फ़ोन को माउंट में लगाने से पहले बॉडी-कैम मोड शुरू करें। स्क्रीन अँधेरी हो जाती है और छूने पर कुछ नहीं होता, पर रिकॉर्डिंग चलती रहती है।',
            },
            {
              en: 'When the app asks, turn on Battery Saver (Android) or Low Power Mode (iPhone).',
              hi: 'जब ऐप कहे, तो बैटरी सेवर (Android) या लो पावर मोड (iPhone) चालू करें।',
            },
            {
              en: 'To unlock the screen, press volume-down twice. The locked screen does not say which buttons to press, so that someone who picks up your phone is not shown how. Remember it, and practise it once at home.',
              hi: 'स्क्रीन खोलने के लिए वॉल्यूम कम करने वाला बटन दो बार दबाएँ। लॉक स्क्रीन पर यह नहीं लिखा होता कि कौन-से बटन दबाने हैं, ताकि आपका फ़ोन उठाने वाले को पता न चले। इसे याद रखें, और घर पर एक बार आज़मा लें।',
            },
            {
              en: 'Video is saved in short pieces as it records, and each piece is fingerprinted and signed as it is saved. In this version, the pieces stay on your phone. You find them in the Record tab.',
              hi: 'रिकॉर्ड होते-होते वीडियो छोटे-छोटे हिस्सों में सेव होता है, और हर हिस्से का फ़िंगरप्रिंट और हस्ताक्षर सेव होते ही बन जाता है। इस वर्ज़न में ये हिस्से आपके फ़ोन पर ही रहते हैं। ये आपको रिकॉर्ड टैब में मिलेंगे।',
            },
          ],
        },
        {
          kind: 'bullets',
          items: [
            {
              en: 'Android: recording carries on with the screen off, and while you take calls or use other apps.',
              hi: 'Android: स्क्रीन बंद होने पर भी, और कॉल लेते समय या दूसरे ऐप चलाते समय भी, रिकॉर्डिंग चलती रहती है।',
            },
            {
              en: 'iPhone: video records only while Saakshi is on the screen. If you leave the app, or a call comes in, sound keeps recording and video starts again when you come back. Every gap is noted in the record.',
              hi: 'iPhone: वीडियो तभी रिकॉर्ड होता है जब साक्षी स्क्रीन पर खुला हो। अगर आप ऐप से बाहर जाएँ या कॉल आए, तो आवाज़ रिकॉर्ड होती रहती है, और लौटने पर वीडियो फिर शुरू हो जाता है। हर रुकावट रिकॉर्ड में दर्ज होती है।',
            },
            {
              en: 'Recording for a long time uses a lot of battery and storage. Carry a power bank and a short cable, free up space before you go, and keep the phone out of strong sun where you can, because a hot phone may stop recording.',
              hi: 'देर तक रिकॉर्ड करने में बैटरी और जगह (स्टोरेज) बहुत लगती है। पावर बैंक और छोटी केबल साथ रखें, निकलने से पहले फ़ोन में जगह ख़ाली कर लें, और हो सके तो फ़ोन को तेज़ धूप से बचाएँ, क्योंकि गर्म फ़ोन रिकॉर्डिंग रोक सकता है।',
            },
          ],
        },
      ],
    },
    {
      id: 'harness',
      needsTesting: true,
      heading: { en: 'Option 1: chest harness and phone clamp', hi: 'तरीक़ा 1: चेस्ट हार्नेस और फ़ोन क्लैंप' },
      blocks: [
        {
          kind: 'paragraph',
          text: {
            en: 'The sturdiest way, with no tools. Chest harnesses made for action cameras, and phone clamps that fit them, are sold online in India.',
            hi: 'सबसे मज़बूत तरीक़ा, बिना किसी औज़ार के। ऐक्शन कैमरे के लिए बने चेस्ट हार्नेस, और उनमें लगने वाले फ़ोन क्लैंप, भारत में ऑनलाइन मिलते हैं।',
          },
        },
        {
          kind: 'steps',
          items: [
            {
              en: 'Get a chest harness for action cameras and a phone clamp that fits its mount. Check that the clamp opens wide enough for your phone with its case on.',
              hi: 'ऐक्शन कैमरे वाला चेस्ट हार्नेस और उसके माउंट में लगने वाला फ़ोन क्लैंप लें। देख लें कि क्लैंप कवर लगे फ़ोन जितना चौड़ा खुलता है।',
            },
            {
              en: 'Wear the harness high on your chest, and tighten the straps so the mount does not bounce when you walk.',
              hi: 'हार्नेस को सीने पर ऊपर की ओर पहनें, और पट्टे इतने कसें कि चलते समय माउंट उछले नहीं।',
            },
            {
              en: 'Clamp the phone by its sides, clear of the buttons. A clamp pressing a volume button can unlock body-cam mode or change the volume.',
              hi: 'फ़ोन को किनारों से क्लैंप करें, बटनों से हटकर। अगर क्लैंप वॉल्यूम बटन दबाए, तो बॉडी-कैम मोड खुल सकता है या आवाज़ बदल सकती है।',
            },
            {
              en: 'Tilt the phone so the camera points straight ahead. Then record for 30 seconds while walking, and watch it back to check what it shows.',
              hi: 'फ़ोन को ऐसे झुकाएँ कि कैमरा सीधा सामने देखे। फिर चलते हुए 30 सेकंड रिकॉर्ड करें, और वापस देखकर जाँच लें कि क्या-क्या दिख रहा है।',
            },
            {
              en: "Tie the phone to the harness with a short cord through the case's lanyard hole or loop, so it does not fall if the clamp slips.",
              hi: 'कवर के डोरी वाले छेद या लूप से एक छोटी डोरी डालकर फ़ोन को हार्नेस से बाँध दें, ताकि क्लैंप फिसले तो फ़ोन गिरे नहीं।',
            },
          ],
        },
      ],
    },
    {
      id: 'lanyard',
      needsTesting: true,
      heading: { en: 'Option 2: lanyard, no tools', hi: 'तरीक़ा 2: डोरी (लैनयार्ड), बिना औज़ार' },
      blocks: [
        {
          kind: 'paragraph',
          text: {
            en: 'Cheaper than a harness, but the picture is shakier.',
            hi: 'हार्नेस से सस्ता, पर वीडियो ज़्यादा हिलता है।',
          },
        },
        {
          kind: 'steps',
          items: [
            {
              en: 'Use a phone case with a lanyard hole, or stick a lanyard loop onto the back of your case.',
              hi: 'ऐसा फ़ोन कवर लें जिसमें डोरी का छेद हो, या कवर के पीछे चिपकने वाला डोरी का लूप लगाएँ।',
            },
            {
              en: 'Use a breakaway lanyard: one that comes apart when it is pulled hard.',
              hi: 'ब्रेकअवे डोरी लें: ऐसी डोरी जो ज़ोर से खिंचने पर खुल जाए।',
            },
            {
              en: 'Hang the phone in the middle of your chest with the back camera facing out. Put a wide elastic band or strap round your chest, over the phone, so it does not swing or turn round.',
              hi: 'फ़ोन को सीने के बीच में लटकाएँ, पीछे वाला कैमरा बाहर की ओर। फिर सीने के चारों ओर, फ़ोन के ऊपर से, एक चौड़ा इलास्टिक या पट्टा लगाएँ, ताकि फ़ोन झूले या घूमे नहीं।',
            },
            {
              en: 'Record for 30 seconds while walking, and watch it back.',
              hi: 'चलते हुए 30 सेकंड रिकॉर्ड करें, और वापस देख लें।',
            },
          ],
        },
        {
          kind: 'warning',
          text: {
            en: 'Never use a cord that does not break away. In a crowd, a cord round your neck can be grabbed or pulled tight.',
            hi: 'ऐसी डोरी कभी न लें जो खिंचने पर खुले नहीं। भीड़ में गले की डोरी कोई पकड़ सकता है या वह कस सकती है।',
          },
        },
      ],
    },
    {
      id: 'strap-clip',
      needsTesting: true,
      heading: { en: 'Option 3: backpack strap clip', hi: 'तरीक़ा 3: बैग के पट्टे पर क्लिप' },
      blocks: [
        {
          kind: 'paragraph',
          text: {
            en: "If you carry a backpack, a phone holder that clips or straps onto a shoulder strap holds the phone at chest height. Check that it holds the phone firmly, and tie the phone to the strap as well.",
            hi: 'अगर आप पीठ पर बैग रखते हैं, तो कंधे के पट्टे पर लगने वाला फ़ोन होल्डर फ़ोन को सीने की ऊँचाई पर रखता है। देख लें कि वह फ़ोन को मज़बूती से पकड़े, और फ़ोन को डोरी से पट्टे से भी बाँध दें।',
          },
        },
      ],
    },
    {
      id: 'print',
      heading: { en: 'If you have a 3D printer', hi: 'अगर आपके पास 3D प्रिंटर है' },
      blocks: [
        {
          kind: 'paragraph',
          text: {
            en: 'These designs are made and shared by other people on their own sites. Saakshi only links to them, and has not tested them. Check the licence on each page before you print, change or share a file.',
            hi: 'ये डिज़ाइन दूसरे लोगों ने बनाकर अपनी साइट पर दिए हैं। साक्षी सिर्फ़ इनका लिंक देता है, और इन्हें आज़माया नहीं है। कोई फ़ाइल प्रिंट करने, बदलने या शेयर करने से पहले उस पेज पर उसका लाइसेंस देख लें।',
          },
        },
        {
          kind: 'link',
          label: { en: 'Phone chest mount (parametric), by Bent Derailleur', hi: 'फ़ोन चेस्ट माउंट (पैरामेट्रिक), Bent Derailleur का' },
          url: 'https://www.printables.com/model/1752840-phone-chest-mount-parametric',
          licence: 'CC BY-ND',
          note: {
            en: 'Straps onto backpack shoulder straps; sized to your phone. You may share it unchanged, but not share a changed version.',
            hi: 'बैग के कंधे वाले पट्टों पर बँधता है; आपके फ़ोन के नाप का बनता है। इसे बिना बदले शेयर कर सकते हैं, पर बदला हुआ रूप शेयर नहीं कर सकते।',
          },
        },
        {
          kind: 'link',
          label: { en: 'GoPro smartphone clamp, by PurchenZuPoden', hi: 'GoPro स्मार्टफ़ोन क्लैंप, PurchenZuPoden का' },
          url: 'https://www.thingiverse.com/thing:2426538',
          licence: 'CC BY-NC',
          note: {
            en: 'A phone clamp that fits action-camera chest harnesses. Made for phones of about 4.5–5.5 inches; larger phones are untested.',
            hi: 'ऐक्शन कैमरे के चेस्ट हार्नेस में लगने वाला फ़ोन क्लैंप। लगभग 4.5–5.5 इंच के फ़ोन के लिए बना; बड़े फ़ोन पर आज़माया नहीं गया।',
          },
        },
        {
          kind: 'link',
          label: { en: 'Hands-free smartphone holder, by Kryator', hi: 'हैंड्स-फ़्री स्मार्टफ़ोन होल्डर, Kryator का' },
          url: 'https://makerworld.com/en/models/1545573',
          licence: 'MakerWorld Standard Digital File License',
          note: {
            en: 'A chest harness with an arm, printed in flexible plastic (TPU). Print it for yourself only: the licence does not allow sharing or changing the file.',
            hi: 'लचीले प्लास्टिक (TPU) से प्रिंट होने वाला, बाँह वाला चेस्ट हार्नेस। सिर्फ़ अपने लिए प्रिंट करें: इसका लाइसेंस फ़ाइल शेयर करने या बदलने की इजाज़त नहीं देता।',
          },
        },
      ],
    },
  ],
};
