/**
 * MRUNEEL Local General Knowledge & Fact Engine
 * Provides immediate, accurate answers to common factual and general knowledge questions
 * in Marathi, Hindi, and English without requiring any internet connection.
 */

export interface GeneralKnowledgeResult {
  question: string;
  answer: string;
  topic: string;
}

interface FactEntry {
  patterns: RegExp[];
  mr: string;
  hi: string;
  en: string;
  topic: string;
}

const LOCAL_FACTS: FactEntry[] = [
  // 1. Capitals
  {
    patterns: [
      /(?:भारताची|भारत की|india'?s?)\s*(?:राजधानी|capital)/i,
      /(?:capital of india)/i
    ],
    mr: 'भारताची राजधानी "नवी दिल्ली" (New Delhi) आहे.',
    hi: 'भारत की राजधानी "नई दिल्ली" (New Delhi) है।',
    en: 'The capital of India is New Delhi.',
    topic: 'geography'
  },
  {
    patterns: [
      /(?:महाराष्ट्राची|महाराष्ट्र की|maharashtra'?s?)\s*(?:राजधानी|capital)/i,
      /(?:capital of maharashtra)/i
    ],
    mr: 'महाराष्ट्राची राजधानी "मुंबई" (Mumbai) आहे, जी भारताची आर्थिक राजधानीदेखील आहे.',
    hi: 'महाराष्ट्र की राजधानी "मुंबई" है।',
    en: 'The capital of Maharashtra is Mumbai.',
    topic: 'geography'
  },
  {
    patterns: [
      /(?:महाराष्ट्राची|महाराष्ट्र की)\s*(?:उपराजधानी|उप-राजधानी|second capital|winter capital)/i
    ],
    mr: 'महाराष्ट्राची उपराजधानी "नागपूर" (Nagpur) आहे.',
    hi: 'महाराष्ट्र की उपराजधानी "नागपुर" है।',
    en: 'The winter or sub-capital of Maharashtra is Nagpur.',
    topic: 'geography'
  },

  // 2. National Symbols of India
  {
    patterns: [
      /(?:राष्ट्रीय प्राणी|national animal)/i
    ],
    mr: 'भारताचा राष्ट्रीय प्राणी "वाघ" (Royal Bengal Tiger) आहे.',
    hi: 'भारत का राष्ट्रीय पशु "बाघ" (Royal Bengal Tiger) है।',
    en: 'The national animal of India is the Royal Bengal Tiger.',
    topic: 'national_symbol'
  },
  {
    patterns: [
      /(?:राष्ट्रीय पक्षी|national bird)/i
    ],
    mr: 'भारताचा राष्ट्रीय पक्षी "मोर" (Peacock) आहे.',
    hi: 'भारत का राष्ट्रीय पक्षी "मोर" (Peacock) है।',
    en: 'The national bird of India is the Peacock.',
    topic: 'national_symbol'
  },
  {
    patterns: [
      /(?:राष्ट्रीय फूल|national flower)/i
    ],
    mr: 'भारताचे राष्ट्रीय फूल "कमळ" (Lotus) आहे.',
    hi: 'भारत का राष्ट्रीय फूल "कमल" है।',
    en: 'The national flower of India is the Lotus.',
    topic: 'national_symbol'
  },
  {
    patterns: [
      /(?:राष्ट्रीय फळ|national fruit)/i
    ],
    mr: 'भारताचे राष्ट्रीय फळ "आंबा" (Mango) आहे.',
    hi: 'भारत का राष्ट्रीय फल "आम" है।',
    en: 'The national fruit of India is Mango.',
    topic: 'national_symbol'
  },
  {
    patterns: [
      /(?:राष्ट्रगीत|national anthem)/i
    ],
    mr: 'भारताचे राष्ट्रगीत "जन गण मन" आहे, ज्याची रचना नोबेल विजेते गुरुदेव रवींद्रनाथ टागोर यांनी केली आहे.',
    hi: 'भारत का राष्ट्रगान "जन गण मन" है, जिसकी रचना रवींद्रनाथ टैगोर ने की है।',
    en: 'The national anthem of India is "Jana Gana Mana", composed by Rabindranath Tagore.',
    topic: 'national_symbol'
  },
  {
    patterns: [
      /(?:राष्ट्रीय गीत|national song)/i
    ],
    mr: 'भारताचे राष्ट्रीय गीत "वंदे मातरम्" आहे, ज्याची रचना बंकिमचंद्र चटर्जी यांनी केली आहे.',
    hi: 'भारत का राष्ट्रीय गीत "वंदे मातरम्" है, जिसकी रचना बंकिमचंद्र चटर्जी ने की थी।',
    en: 'The national song of India is "Vande Mataram", authored by Bankim Chandra Chatterjee.',
    topic: 'national_symbol'
  },

  // 3. Leaders & Historic Figures
  {
    patterns: [
      /(?:भारताचे पंतप्रधान|पंतप्रधान कोण|prime minister of india)/i
    ],
    mr: 'भारताचे विद्यमान पंतप्रधान "श्री नरेंद्र मोदी" आहेत.',
    hi: 'भारत के वर्तमान प्रधानमंत्री "श्री नरेंद्र मोदी" हैं।',
    en: 'The Prime Minister of India is Shri Narendra Modi.',
    topic: 'politics'
  },
  {
    patterns: [
      /(?:भारताचे राष्ट्रपती|राष्ट्रपती कोण|president of india)/i
    ],
    mr: 'भारताच्या राष्ट्रपती "श्रीमती द्रौपदी मुर्मू" आहेत.',
    hi: 'भारत की राष्ट्रपति "श्रीमती द्रौपदी मुर्मू" हैं।',
    en: 'The President of India is Smt. Droupadi Murmu.',
    topic: 'politics'
  },
  {
    patterns: [
      /(?:संविधानाचे जनक|राज्यघटनेचे शिल्पकार|father of indian constitution|dr ambedkar)/i
    ],
    mr: 'भारतीय राज्यघटनेचे शिल्पकार आणि मसुदा समितीचे अध्यक्ष "भारतरत्न डॉ. बाबासाहेब आंबेडकर" आहेत.',
    hi: 'भारतीय संविधान के निर्माता "भारत रत्न डॉ. भीमराव अंबेडकर" हैं।',
    en: 'The chief architect of the Indian Constitution is Bharat Ratna Dr. B. R. Ambedkar.',
    topic: 'history'
  },
  {
    patterns: [
      /(?:छत्रपती शिवाजी महाराज|shivaji maharaj|शिवाजी महाराजां)/i
    ],
    mr: 'छत्रपती शिवाजी महाराज हे मराठा हिंदवी स्वराज्याचे संस्थापक, महान रणनीतिकार, प्रजाहितदक्ष आणि आदर्श राजे होते.',
    hi: 'छत्रपति शिवाजी महाराज मराठा साम्राज्य के महान संस्थापक और कुशल शासक थे।',
    en: 'Chhatrapati Shivaji Maharaj was the visionary founder of the Maratha Empire and an iconic warrior king.',
    topic: 'history'
  },

  // 4. Important Days
  {
    patterns: [
      /(?:मराठी भाषा(?:\s*गौरव)?\s*दिन|मराठी राजभाषा दिन|मराठी गौरव दिन)/i
    ],
    mr: 'मराठी भाषा गौरव दिन दरवर्षी "२७ फेब्रुवारी" रोजी ज्ञानपीठ पुरस्कार विजेते ज्येष्ठ कवी वि. वा. शिरवाडकर (कविवर्य कुसुमाग्रज) यांच्या जन्मदिनी साजरा केला जातो.',
    hi: 'मराठी भाषा गौरव दिवस हर साल २७ फरवरी को मनाया जाता है।',
    en: 'Marathi Language Pride Day is celebrated annually on February 27th, commemorating poet Kusumagraj.',
    topic: 'culture'
  },
  {
    patterns: [
      /(?:महाराष्ट्र दिन|कामगार दिन|maharashtra day)/i
    ],
    mr: '"१ मे" हा महाराष्ट्र दिन आणि आंतरराष्ट्रीय कामगार दिन म्हणून साजरा केला जातो. १ मे १९६० रोजी संयुक्त महाराष्ट्र राज्याची स्थापना झाली.',
    hi: '१ मई को महाराष्ट्र दिवस और अंतर्राष्ट्रीय मजदूर दिवस मनाया जाता है।',
    en: 'May 1st marks Maharashtra Day and International Labour Day, commemorating the state formation in 1960.',
    topic: 'history'
  },
  {
    patterns: [
      /(?:स्वातंत्र्य दिन|independence day)/i
    ],
    mr: 'भारताचा स्वातंत्र्य दिन "१५ ऑगस्ट" रोजी साजरा केला जातो. १५ ऑगस्ट १९४७ रोजी भारताला ब्रिटिश राजवटीपासून स्वातंत्र्य मिळाले.',
    hi: 'भारत का स्वतंत्रता दिवस १५ अगस्त को मनाया जाता है।',
    en: 'India celebrates its Independence Day on August 15th.',
    topic: 'history'
  },
  {
    patterns: [
      /(?:प्रजासत्ताक दिन|republic day)/i
    ],
    mr: 'भारताचा प्रजासत्ताक दिन "२६ जानेवारी" रोजी साजरा केला जातो. २६ जानेवारी १९५० रोजी भारतीय संविधान अधिकृतपणे लागू झाले.',
    hi: 'भारत का गणतंत्र दिवस २६ जनवरी को मनाया जाता है।',
    en: 'India celebrates Republic Day on January 26th, commemorating the enforcement of the Constitution in 1950.',
    topic: 'history'
  },

  // 5. Science & Planetary Facts
  {
    patterns: [
      /(?:पाण्याचे रासायनिक सूत्र|chemical formula of water|formula of water)/i
    ],
    mr: 'पाण्याचे रासायनिक सूत्र "H₂O" (दोन हायड्रोजन आणि एक ऑक्सिजन अणू) आहे.',
    hi: 'पानी का रासायनिक सूत्र "H₂O" है।',
    en: 'The chemical formula of water is H₂O.',
    topic: 'science'
  },
  {
    patterns: [
      /(?:प्रकाशाचा वेग|speed of light)/i
    ],
    mr: 'प्रकाशाचा वेग निर्वातात सुमारे "३,००,००० किलोमीटर प्रति सेकंद" (तंतोतंत २,९९,७९२ किमी/सेकंद) असतो.',
    hi: 'प्रकाश की गति लगभग ३,००,००० किलोमीटर प्रति सेकंड है।',
    en: 'The speed of light in vacuum is approximately 300,000 kilometers per second (299,792 km/s).',
    topic: 'science'
  },
  {
    patterns: [
      /(?:मानवी शरीरात किती हाडे|किती हाडे असतात|bones in human body|human bones)/i
    ],
    mr: 'एका प्रौढ मानवी शरीरात एकूण "२०६ हाडे" असतात.',
    hi: 'एक वयस्क मानव शरीर में कुल २०६ हड्डियां होती हैं।',
    en: 'An adult human skeleton consists of 206 bones.',
    topic: 'science'
  },
  {
    patterns: [
      /(?:सर्वात मोठा ग्रह|largest planet)/i
    ],
    mr: 'आपल्या सूर्यमालेतील सर्वात मोठा ग्रह "गुरू" (Jupiter) आहे.',
    hi: 'हमारे सौरमंडल का सबसे बड़ा ग्रह "बृहस्पति" (Jupiter) है।',
    en: 'The largest planet in our solar system is Jupiter.',
    topic: 'astronomy'
  },
  {
    patterns: [
      /(?:सूर्याच्या सर्वात जवळचा ग्रह|closest planet to sun|सर्वात लहान ग्रह|smallest planet)/i
    ],
    mr: 'सूर्यमालेतील सर्वात लहान आणि सूर्याच्या सर्वात जवळचा ग्रह "बुध" (Mercury) आहे.',
    hi: 'सूर्य के सबसे निकट और सबसे छोटा ग्रह "बुध" (Mercury) है।',
    en: 'The smallest planet and closest to the Sun is Mercury.',
    topic: 'astronomy'
  },
  {
    patterns: [
      /(?:संगणकाचा जनक|father of computer)/i
    ],
    mr: 'संगणकाचे जनक "चार्ल्स बॅबेज" (Charles Babbage) यांना मानले जाते.',
    hi: 'कंप्यूटर का जनक "चार्ल्स बैबेज" (Charles Babbage) को कहा जाता है।',
    en: 'Charles Babbage is universally recognized as the Father of the Computer.',
    topic: 'technology'
  },
  {
    patterns: [
      /(?:गुरुत्वाकर्षणाचा शोध|who discovered gravity|law of gravity)/i
    ],
    mr: 'गुरुत्वाकर्षणाचा शोध प्रख्यात शास्त्रज्ञ "सर आयझॅक न्यूटन" (Sir Isaac Newton) यांनी लावला.',
    hi: 'गुरुत्वाकर्षण के नियमों की खोज "सर आइजैक न्यूटन" ने की थी।',
    en: 'The law of universal gravitation was formulated by Sir Isaac Newton.',
    topic: 'science'
  },
  {
    patterns: [
      /(?:सर्वात उंच पर्वत|सर्वात उंच शिखर|highest mountain|highest peak|mount everest)/i
    ],
    mr: 'जगातील सर्वात उंच पर्वतशिखर "माउंट एव्हरेस्ट" (Mount Everest) आहे, ज्याची उंची ८,८४८.८६ मीटर आहे.',
    hi: 'दुनिया की सबसे ऊंची पर्वत चोटी "माउंट एवरेस्ट" है (ऊंचाई ८,८४८.८६ मीटर)।',
    en: 'The highest mountain peak in the world is Mount Everest, standing at 8,848.86 meters.',
    topic: 'geography'
  },
  {
    patterns: [
      /(?:महाराष्ट्रातील सर्वात लांब नदी|longest river in maharashtra|गोदावरी नदी)/i
    ],
    mr: 'महाराष्ट्रातील सर्वात लांब आणि प्रमुख नदी "गोदावरी" आहे. हिचा उगम नाशिक जिल्ह्यातील त्र्यंबकेश्वर येथे होतो आणि हिला दक्षिण गंगा म्हणतात.',
    hi: 'महाराष्ट्र की सबसे लंबी नदी "गोदावरी" है।',
    en: 'The longest river in Maharashtra is the Godavari, originating from Trimbakeshwar in Nashik.',
    topic: 'geography'
  },
  {
    patterns: [
      /(?:भारतातील सर्वात लांब नदी|longest river in india|गंगा नदी)/i
    ],
    mr: 'भारतातील सर्वात लांब नदी "गंगा" (२,५२५ किमी) आहे.',
    hi: 'भारत की सबसे लंबी नदी "गंगा" (२,५२५ किमी) है।',
    en: 'The longest river running entirely within India is the Ganga (2,525 km).',
    topic: 'geography'
  }
];

/**
 * Searches local facts database and returns matching answer if found
 */
export function getLocalGeneralKnowledge(
  text: string,
  preferredLanguage: 'mr-IN' | 'hi-IN' | 'en-US' = 'mr-IN',
  honorific: string = 'सर'
): GeneralKnowledgeResult | null {
  const clean = text.trim();

  for (const entry of LOCAL_FACTS) {
    const isMatch = entry.patterns.some(pattern => pattern.test(clean));
    if (isMatch) {
      let ansText = entry.mr;
      if (preferredLanguage === 'hi-IN') ansText = entry.hi;
      else if (preferredLanguage === 'en-US') ansText = entry.en;

      const fullAnswer = `${honorific}, ${ansText}`;
      return {
        question: text,
        answer: fullAnswer,
        topic: entry.topic
      };
    }
  }

  return null;
}
