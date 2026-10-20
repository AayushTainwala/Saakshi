import type { Guide } from './types';

/**
 * G5. Digital safety and preparedness (SPEC section 6, G5; section 5, confiscation mode). Adapted
 * from EFF's Surveillance Self-Defense, "Attending a Protest" (CC BY 4.0), rewritten for India and
 * for this app; the attribution is shown with the guide and kept in THIRD_PARTY_NOTICES.md.
 */
export const digitalSafety: Guide = {
  id: 'digital-safety',
  title: {
    en: 'Phone safety before you go out',
    hi: 'बाहर जाने से पहले फ़ोन की सुरक्षा',
  },
  summary: {
    en: 'Lock your phone with a passcode, know how to lock it in a moment, and set up Saakshi in advance.',
    hi: 'फ़ोन पर पासकोड लगाएँ, पल भर में लॉक करना सीखें, और साक्षी को पहले से तैयार रखें।',
  },
  attribution: {
    text: {
      en: 'Adapted from Surveillance Self-Defense by the Electronic Frontier Foundation (ssd.eff.org), licensed CC BY 4.0. Changes: rewritten and shortened for India and for Saakshi, and translated into Hindi.',
      hi: 'इलेक्ट्रॉनिक फ़्रंटियर फ़ाउंडेशन (EFF) की Surveillance Self-Defense (ssd.eff.org) से लिया गया, लाइसेंस CC BY 4.0। बदलाव: भारत और साक्षी के लिए दोबारा लिखा और छोटा किया गया, और हिंदी में अनुवाद किया गया।',
    },
    url: 'https://ssd.eff.org/module/attending-protest',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
  },
  sections: [
    {
      id: 'passcode',
      heading: { en: 'Use a passcode, not your face or finger', hi: 'चेहरा या उँगली नहीं, पासकोड लगाएँ' },
      blocks: [
        {
          kind: 'paragraph',
          text: {
            en: 'Face and fingerprint unlock are quick, but whoever is holding your phone can unlock it by holding it up to your face or pressing your finger on it. A passcode has to come from you. Before you go out, turn off face and fingerprint unlock, and use a passcode of at least six digits.',
            hi: 'चेहरे और फ़िंगरप्रिंट से फ़ोन जल्दी खुलता है, पर जिसके हाथ में आपका फ़ोन हो, वह उसे आपके चेहरे के सामने रखकर या आपकी उँगली लगाकर खोल सकता है। पासकोड तो आपको ही बताना होगा। बाहर जाने से पहले चेहरे और फ़िंगरप्रिंट से खुलना बंद करें, और कम से कम छह अंकों का पासकोड लगाएँ।',
          },
        },
        {
          kind: 'bullets',
          items: [
            {
              en: 'iPhone: Settings → Face ID & Passcode (or Touch ID & Passcode) → turn off iPhone Unlock.',
              hi: 'iPhone: Settings → Face ID & Passcode (या Touch ID & Passcode) → iPhone Unlock बंद करें।',
            },
            {
              en: 'Android: Settings → Security (or Biometrics, or Security and privacy) → turn off face and fingerprint unlock, or delete your saved face and fingerprints. The names differ between phone makers.',
              hi: 'Android: Settings → Security (या Biometrics, या Security and privacy) → चेहरे और फ़िंगरप्रिंट से खोलना बंद करें, या सेव किया हुआ चेहरा और फ़िंगरप्रिंट हटा दें। अलग-अलग कंपनियों के फ़ोन में नाम अलग हो सकते हैं।',
            },
          ],
        },
        {
          kind: 'paragraph',
          text: {
            en: 'You can turn them back on when you are home.',
            hi: 'घर लौटकर आप इन्हें फिर से चालू कर सकते हैं।',
          },
        },
      ],
    },
    {
      id: 'lock-now',
      heading: { en: 'Make it passcode-only in a moment', hi: 'पल भर में सिर्फ़ पासकोड से खुलने वाला बनाएँ' },
      blocks: [
        {
          kind: 'paragraph',
          text: {
            en: 'If face or fingerprint unlock is still on, you can make the phone need its passcode in a second, without looking at the screen. Practise this at home.',
            hi: 'अगर चेहरे या फ़िंगरप्रिंट से खुलना अब भी चालू है, तो आप एक सेकंड में, स्क्रीन देखे बिना, फ़ोन को ऐसा बना सकते हैं कि वह सिर्फ़ पासकोड से खुले। इसे घर पर आज़मा लें।',
          },
        },
        {
          kind: 'bullets',
          items: [
            {
              en: 'iPhone: press and hold the side button and either volume button together for about 2 seconds, until the sliders appear. Then let go and tap Cancel. The phone now needs your passcode to unlock.',
              hi: 'iPhone: साइड बटन और कोई भी एक वॉल्यूम बटन एक साथ लगभग 2 सेकंड दबाकर रखें, जब तक स्लाइडर न दिखें। फिर बटन छोड़ें और Cancel दबाएँ। अब फ़ोन सिर्फ़ पासकोड से खुलेगा।',
            },
            {
              en: 'Android: press and hold the power button (on some phones, power and volume-up together) and tap Lockdown. The phone then needs your PIN, pattern or password, and hides notifications on the lock screen. Lockdown lasts until you next unlock, so do it again each time.',
              hi: 'Android: पावर बटन दबाकर रखें (कुछ फ़ोन में पावर और वॉल्यूम बढ़ाने वाला बटन एक साथ) और Lockdown दबाएँ। अब फ़ोन आपके PIN, पैटर्न या पासवर्ड से ही खुलेगा, और लॉक स्क्रीन पर नोटिफ़िकेशन नहीं दिखेंगे। Lockdown अगली बार फ़ोन खोलने तक ही रहता है, इसलिए हर बार दोबारा करें।',
            },
            {
              en: "If you don't see Lockdown, look in Settings → Lock screen for \"Show lockdown option\" and turn it on. Some phones don't have it: then turn off face and fingerprint unlock before you go out.",
              hi: 'अगर Lockdown न दिखे, तो Settings → Lock screen में "Show lockdown option" ढूँढकर चालू करें। कुछ फ़ोन में यह होता ही नहीं: तब बाहर जाने से पहले चेहरे और फ़िंगरप्रिंट से खुलना बंद कर दें।',
            },
          ],
        },
        {
          kind: 'warning',
          text: {
            en: 'On iPhone, do not keep holding the buttons. After a few more seconds the iPhone starts a countdown and calls emergency services. If the countdown starts by mistake, let go of the buttons.',
            hi: 'iPhone पर बटन दबाए न रखें। कुछ और सेकंड बाद iPhone उलटी गिनती शुरू करके इमरजेंसी सेवा को कॉल कर देता है। अगर ग़लती से गिनती शुरू हो जाए, तो बटन छोड़ दें।',
          },
        },
      ],
    },
    {
      id: 'carry',
      heading: { en: 'What to take, and what to leave at home', hi: 'क्या साथ लें, और क्या घर पर छोड़ें' },
      blocks: [
        {
          kind: 'bullets',
          items: [
            {
              en: 'Take your phone fully charged, with a power bank and cable.',
              hi: 'फ़ोन पूरा चार्ज करके ले जाएँ, साथ में पावर बैंक और केबल।',
            },
            {
              en: 'Write a few important numbers on paper, such as a trusted contact and a lawyer, in case your phone is taken or its battery dies.',
              hi: 'कुछ ज़रूरी नंबर काग़ज़ पर लिख लें, जैसे किसी भरोसेमंद व्यक्ति और वकील का, ताकि फ़ोन छिन जाए या बैटरी ख़त्म हो जाए तो भी काम आएँ।',
            },
            {
              en: 'Take some cash, water, and any medicines you need.',
              hi: 'थोड़े नक़द पैसे, पानी, और अपनी ज़रूरी दवाइयाँ साथ रखें।',
            },
            {
              en: "Leave at home what you don't need and would not want lost or looked through: a laptop, extra bank cards, papers you won't need.",
              hi: 'जिसकी ज़रूरत न हो और जिसका खोना या किसी का उसे खंगालना आप न चाहें, उसे घर पर छोड़ दें: लैपटॉप, फ़ालतू बैंक कार्ड, ऐसे काग़ज़ जिनकी ज़रूरत नहीं।',
            },
            {
              en: 'If you have a second phone with less of your life on it, think about taking that instead. Set up Saakshi on it first.',
              hi: 'अगर आपके पास कोई दूसरा फ़ोन है जिसमें आपकी निजी चीज़ें कम हैं, तो उसे ले जाने के बारे में सोचें। पहले उस पर साक्षी तैयार कर लें।',
            },
          ],
        },
      ],
    },
    {
      id: 'set-up',
      heading: { en: 'Set up Saakshi before you go', hi: 'निकलने से पहले साक्षी तैयार करें' },
      blocks: [
        {
          kind: 'steps',
          items: [
            {
              en: 'Add your trusted contacts in the SOS tab. Tell them what an alert from you means, and what you would like them to do.',
              hi: 'SOS टैब में अपने भरोसेमंद लोगों को जोड़ें। उन्हें बताएँ कि आपका अलर्ट आए तो उसका क्या मतलब है, और आप चाहते हैं कि वे क्या करें।',
            },
            {
              en: 'Agree a plan with them in case the network goes down: see the guide "If the network goes down".',
              hi: 'नेटवर्क बंद होने की हालत के लिए उनके साथ एक योजना तय करें: "अगर नेटवर्क बंद हो जाए" वाली गाइड देखें।',
            },
            {
              en: 'Try the evidence camera and body-cam mode once at home, including unlocking with the buttons.',
              hi: 'सबूत कैमरा और बॉडी-कैम मोड को घर पर एक बार आज़मा लें, बटन से स्क्रीन खोलना भी।',
            },
            {
              en: 'Free up storage space: video fills it quickly.',
              hi: 'फ़ोन में जगह (स्टोरेज) ख़ाली कर लें: वीडियो से यह जल्दी भर जाती है।',
            },
          ],
        },
      ],
    },
    {
      id: 'confiscation',
      requires: 'confiscationMode',
      heading: { en: 'If your phone may be taken: confiscation mode', hi: 'अगर फ़ोन लिया जा सकता है: ज़ब्ती मोड' },
      blocks: [
        {
          kind: 'paragraph',
          text: {
            en: 'Confiscation mode alerts your trusted contacts, shares your live location with them and starts recording sound, all at once, before you hand your phone over. Set it up and try it with your contacts in advance, so that you know its few taps by heart.',
            hi: 'फ़ोन सौंपने से पहले, ज़ब्ती मोड एक साथ आपके भरोसेमंद लोगों को अलर्ट भेजता है, उन्हें आपकी लाइव लोकेशन दिखाता है, और आवाज़ रिकॉर्ड करना शुरू करता है। इसे पहले से तैयार करें और अपने लोगों के साथ आज़मा लें, ताकि इसके कुछ टैप आपको याद रहें।',
          },
        },
      ],
    },
  ],
};
