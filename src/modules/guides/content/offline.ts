import type { Guide } from './types';

/**
 * O1. Offline communication (SPEC section 6, O1). Briar for Android only: it is the best-audited
 * option and has no iPhone app. No mesh app is recommended for iPhone, because none audited is
 * available in India (docs/research/open-source-and-licences.md, section 2).
 */
export const offline: Guide = {
  id: 'offline',
  title: {
    en: 'If the network goes down',
    hi: 'अगर नेटवर्क बंद हो जाए',
  },
  summary: {
    en: 'Make a plan with your people before you go out: meeting points, check-in times and SMS.',
    hi: 'निकलने से पहले अपने लोगों के साथ योजना बनाएँ: मिलने की जगह, ख़बर देने का समय, और SMS।',
  },
  sections: [
    {
      id: 'plan',
      heading: { en: 'A plan for everyone', hi: 'सबके लिए एक योजना' },
      blocks: [
        {
          kind: 'paragraph',
          text: {
            en: 'Mobile internet can be slow where many people gather, and is sometimes switched off in an area. No app fully makes up for that, so the plan you agree in person before you go is the one you can count on.',
            hi: 'जहाँ बहुत लोग जमा हों, वहाँ मोबाइल इंटरनेट धीमा हो सकता है, और कभी-कभी किसी इलाक़े में बंद भी कर दिया जाता है। कोई ऐप इसकी पूरी भरपाई नहीं कर सकता, इसलिए निकलने से पहले आमने-सामने तय की गई योजना ही सबसे भरोसेमंद है।',
          },
        },
        {
          kind: 'steps',
          items: [
            {
              en: "Agree a meeting point, and a second one in case you can't reach the first. Choose places that are easy to find and away from the crowd.",
              hi: 'मिलने की एक जगह तय करें, और एक दूसरी भी, अगर पहली तक न पहुँच सकें। ऐसी जगहें चुनें जो आसानी से मिल जाएँ और भीड़ से दूर हों।',
            },
            {
              en: 'Agree check-in times: for example, a message every hour, and one when you are home. Agree what your contact will do if you miss one, and how long they will wait first.',
              hi: 'ख़बर देने का समय तय करें: जैसे, हर घंटे एक मैसेज, और घर पहुँचने पर एक। यह भी तय करें कि अगर आपकी ख़बर न आए तो आपका साथी क्या करेगा, और कितनी देर इंतज़ार करेगा।',
            },
            {
              en: 'Make an SMS plan. SMS often gets through when mobile internet does not. Agree short messages in advance, such as "OK", "Leaving now" and "Need help", and who sends them to whom.',
              hi: 'SMS की योजना बनाएँ। जब मोबाइल इंटरनेट न चले, तब भी SMS अक्सर पहुँच जाता है। छोटे मैसेज पहले से तय कर लें, जैसे "ठीक हूँ", "निकल रहा/रही हूँ" और "मदद चाहिए", और यह भी कि कौन किसे भेजेगा।',
            },
            {
              en: 'Write the plan and the phone numbers on paper too.',
              hi: 'योजना और फ़ोन नंबर काग़ज़ पर भी लिख लें।',
            },
          ],
        },
        {
          kind: 'warning',
          text: {
            en: 'If the mobile network is shut down completely, calls and SMS stop too. Then only the meeting point and time you agreed will work.',
            hi: 'अगर मोबाइल नेटवर्क पूरी तरह बंद हो जाए, तो कॉल और SMS भी बंद हो जाते हैं। तब सिर्फ़ पहले से तय मिलने की जगह और समय ही काम आएँगे।',
          },
        },
      ],
    },
    {
      id: 'briar',
      heading: { en: 'Android: Briar', hi: 'Android: Briar' },
      blocks: [
        {
          kind: 'paragraph',
          text: {
            en: 'Briar is a free messaging app for Android. When there is no internet, it can pass messages directly between nearby phones over Bluetooth or Wi-Fi. Its security has been checked by independent auditors. It is made by others and is separate from Saakshi.',
            hi: 'Briar, Android के लिए एक मुफ़्त मैसेजिंग ऐप है। इंटरनेट न हो, तब भी यह पास के फ़ोनों के बीच ब्लूटूथ या वाई-फ़ाई से सीधे मैसेज पहुँचा सकता है। इसकी सुरक्षा की जाँच बाहर के स्वतंत्र जाँचकर्ता कर चुके हैं। इसे दूसरे लोगों ने बनाया है, और यह साक्षी से अलग ऐप है।',
          },
        },
        {
          kind: 'steps',
          items: [
            {
              en: 'Install it before you go out, from the Briar website.',
              hi: 'निकलने से पहले इसे Briar की वेबसाइट से इंस्टॉल कर लें।',
            },
            {
              en: "Add your contacts while you are together, by scanning each other's codes in the app.",
              hi: 'साथ रहते हुए ही अपने लोगों को जोड़ लें, ऐप में एक-दूसरे का कोड स्कैन करके।',
            },
            {
              en: 'Without internet it reaches only phones nearby, and only people who have Briar. It uses a lot of battery, so carry a power bank.',
              hi: 'इंटरनेट के बिना यह सिर्फ़ पास के फ़ोनों तक, और सिर्फ़ उन लोगों तक पहुँचता है जिनके पास Briar है। इसमें बैटरी ज़्यादा लगती है, इसलिए पावर बैंक साथ रखें।',
            },
          ],
        },
        {
          kind: 'link',
          label: { en: 'Briar website', hi: 'Briar की वेबसाइट' },
          url: 'https://briarproject.org/',
        },
      ],
    },
    {
      id: 'iphone',
      heading: { en: 'iPhone', hi: 'iPhone' },
      blocks: [
        {
          kind: 'paragraph',
          text: {
            en: "Briar has no iPhone app, and we don't recommend any other phone-to-phone messaging app for iPhone, because we haven't found one whose security has been independently checked and that is available in India. Use the plan above.",
            hi: 'Briar का iPhone ऐप नहीं है, और हम iPhone के लिए फ़ोन-से-फ़ोन मैसेज भेजने वाला कोई और ऐप नहीं सुझाते, क्योंकि हमें ऐसा कोई ऐप नहीं मिला जिसकी सुरक्षा की स्वतंत्र जाँच हुई हो और जो भारत में मिलता हो। ऊपर दी गई योजना अपनाएँ।',
          },
        },
      ],
    },
  ],
};
