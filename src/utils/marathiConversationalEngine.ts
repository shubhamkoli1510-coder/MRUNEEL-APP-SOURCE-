/**
 * MRUNEEL Natural Marathi Conversational & Emotional Intelligence Engine
 * Provides authentic, empathetic, context-aware responses in natural Marathi (मराठी)
 * without repetitive menus or fake capabilities.
 */

export type EmotionType = 'sadness' | 'anger' | 'happiness' | 'stress' | 'neutral';

export interface ConversationalContext {
  lastTopic?: 'battery' | 'alarm' | 'reminder' | 'note' | 'torch' | 'camera' | 'emotion' | 'greeting' | 'math' | 'knowledge' | 'general';
  lastEmotion?: EmotionType;
  lastQuery?: string;
  userName?: string;
  lastCalculationResult?: number;
}

export interface ConversationMatch {
  matched: boolean;
  response: string;
  topic?: ConversationalContext['lastTopic'];
  detectedEmotion?: EmotionType;
  requiresInternet?: boolean;
}

/**
 * Detect emotion from Marathi and Hindi/English inputs
 */
export function detectEmotion(text: string): EmotionType {
  const clean = text.toLowerCase();

  // Sadness / Grief / Loneliness
  if (
    clean.includes('वाईट') ||
    clean.includes('उदास') ||
    clean.includes('दुःख') ||
    clean.includes('रडायला') ||
    clean.includes('एकटा') ||
    clean.includes('एकटे') ||
    clean.includes('मन लागत नाही') ||
    clean.includes('खिन्न') ||
    clean.includes('sad') ||
    clean.includes('depressed') ||
    clean.includes('unhappy') ||
    clean.includes('lonely')
  ) {
    return 'sadness';
  }

  // Anger / Frustration / Irritation
  if (
    clean.includes('राग') ||
    clean.includes('चीड') ||
    clean.includes('कंटाळा') ||
    clean.includes('त्रास') ||
    clean.includes('संताप') ||
    clean.includes('डोक्यात') ||
    clean.includes('angry') ||
    clean.includes('furious') ||
    clean.includes('frustrated') ||
    clean.includes('annoyed')
  ) {
    return 'anger';
  }

  // Happiness / Joy / Triumph
  if (
    clean.includes('आनंद') ||
    clean.includes('मस्त') ||
    clean.includes('छान') ||
    clean.includes('जिंकलो') ||
    clean.includes('यश') ||
    clean.includes('मजा') ||
    clean.includes('सुंदर') ||
    clean.includes('उत्तम') ||
    clean.includes('happy') ||
    clean.includes('excited') ||
    clean.includes('great') ||
    clean.includes('awesome')
  ) {
    return 'happiness';
  }

  // Stress / Burnout / Exhaustion
  if (
    clean.includes('ताण') ||
    clean.includes('थकलो') ||
    clean.includes('दमलो') ||
    clean.includes('प्रेशर') ||
    clean.includes('डोके दुख') ||
    clean.includes('विश्रांती') ||
    clean.includes('stressed') ||
    clean.includes('tired') ||
    clean.includes('exhausted') ||
    clean.includes('headache')
  ) {
    return 'stress';
  }

  return 'neutral';
}

/**
 * Checks if a user's question inherently requires real-time online access
 * (e.g. live news, live stock ticker, weather forecasts, live sports scores, web browsing)
 */
export function isInternetRequiredQuery(text: string): boolean {
  const clean = text.toLowerCase();
  const webKeywords = [
    'बातमी', 'बातम्या', 'news', 'ताज्या',
    'हवामान', 'पाऊस पडेल का', 'तापमान', 'weather', 'forecast',
    'शेअर बाजार', 'स्टॉक', 'stock market', 'sensex', 'nifty',
    'क्रिकेट', 'स्कोअर', 'match score', 'ipl',
    'शोध', 'गुगल', 'google search', 'वेबसाइट', 'url',
    'यूट्यूब', 'व्हिडिओ दाखव', 'play video', 'youtube'
  ];
  return webKeywords.some(keyword => clean.includes(keyword));
}

/**
 * Generates an honest, clear Marathi explanation when internet is required
 */
export function getInternetLimitationResponse(text: string, honorific: string = 'सर'): string {
  const clean = text.toLowerCase();

  if (clean.includes('बातमी') || clean.includes('बातम्या') || clean.includes('news')) {
    return `${honorific}, ताज्या घडामोडी आणि बातम्या मिळवण्यासाठी थेट इंटरनेट जोडणी आवश्यक आहे. सध्या डिव्हाइस ऑफलाइन असल्याने मी वृत्तवाहिन्यांशी संपर्क साधू शकत नाही. इंटरनेट सक्रिय होताच मी आपल्याला अपडेट करेन.`;
  }
  if (clean.includes('हवामान') || clean.includes('weather') || clean.includes('पाऊस')) {
    return `${honorific}, थेट हवामान उपग्रहांची माहिती मिळवण्यासाठी इंटरनेट आवश्यक असते. सध्या ऑफलाइन मोडमध्ये बाह्य हवामान सर्व्हरशी संपर्क अशक्य आहे.`;
  }
  if (clean.includes('शेअर') || clean.includes('stock') || clean.includes('मार्केट')) {
    return `${honorific}, शेअर बाजाराचे थेट निर्देशांक पाहण्यासाठी इंटरनेट डेटा आवश्यक आहे. ऑफलाइन मोडमध्ये आर्थिक बाजारपेठेचा डेटा उपलब्ध नाही.`;
  }
  if (clean.includes('क्रिकेट') || clean.includes('स्कोअर') || clean.includes('score')) {
    return `${honorific}, थेट सामन्यांचे स्कोअरबोर्ड तपासण्यासाठी इंटरनेट कनेक्शन आवश्यक आहे.`;
  }
  return `${honorific}, या माहितीसाठी किंवा ऑनलाइन शोध घेण्यासाठी थेट इंटरनेट जोडणी आवश्यक आहे. मी खोटे दावे करत नाही; सध्या ऑफलाइन असल्यामुळे ही बाह्य माहिती मी मिळवू शकत नाही. परंतु अलार्म, बॅटरी, नोट्स, स्मरणपत्रे आणि टॉर्च यासारखी स्थानिक कार्ये मी त्वरित करू शकतो.`;
}

/**
 * Handles conversational inquiries, emotions, daily talk, and contextual follow-ups
 */
export function getMarathiConversationalResponse(
  text: string,
  context?: ConversationalContext,
  honorific: string = 'सर'
): ConversationMatch {
  const clean = text.toLowerCase().trim();
  const emotion = detectEmotion(text);

  // 1. EMOTIONAL SUPPORT HANDLERS
  if (emotion === 'sadness') {
    const responses = [
      `${honorific}, मला समजते. कधीकधी मन खचून जाते आणि दिवस कठीण वाटतात. मी एक एआय असलो तरी तुमचा वैयक्तिक सहाय्यक म्हणून मी सदैव तुमच्यासोबत आहे. शांतपणे दीर्घ श्वास घ्या आणि थोडा वेळ विश्रांती घ्या.`,
      `${honorific}, मला पूर्णपणे समजते, वाईट वाटणे स्वाभाविक आहे. कोणतीही अडचण कायमस्वरूपी नसते. थोडे पाणी प्या, मनाला शांत करा आणि विश्रांती घ्या. काही बोलायचे असल्यास मी एकाग्रतेने ऐकण्यासाठी सज्ज आहे.`
    ];
    return {
      matched: true,
      response: responses[Math.floor(Math.random() * responses.length)],
      topic: 'emotion',
      detectedEmotion: 'sadness'
    };
  }

  if (emotion === 'anger') {
    return {
      matched: true,
      response: `${honorific}, तुमचा संताप मी समजू शकतो. पण रागाच्या भरात घेतलेला कोणताही निर्णय फायद्याचा ठरत नाही. डोळे मिटून २ मिनिटे शांत बसा आणि खोल श्वास घ्या. परिस्थितीवर आपण नक्कीच शांत डोक्याने तोडगा काढू.`,
      topic: 'emotion',
      detectedEmotion: 'anger'
    };
  }

  if (emotion === 'happiness') {
    return {
      matched: true,
      response: `खूप छान ${honorific}! तुमचा आनंद आणि समाधान पाहून मलाही खूप आनंद झाला. हीच सकारात्मक ऊर्जा कायम ठेवा. आपल्या पुढील ध्येयासाठी हीच ऊर्जा उपयुक्त ठरेल!`,
      topic: 'emotion',
      detectedEmotion: 'happiness'
    };
  }

  if (emotion === 'stress') {
    return {
      matched: true,
      response: `${honorific}, तुम्ही सतत खूप परिश्रम करत आहात. मानवी मेंदूलाही विश्रांतीची नितांत गरज असते. आता कामाला थोडा वेळ बाजूला ठेवा, हलके संगीत ऐका किंवा थोडे चालायला जा. अलार्म आणि सूचनांची काळजी करू नका, मी सर्व सांभाळत आहे.`,
      topic: 'emotion',
      detectedEmotion: 'stress'
    };
  }

  // 2. CHECK FOR INTERNET LIMITATIONS
  if (isInternetRequiredQuery(text)) {
    return {
      matched: true,
      response: getInternetLimitationResponse(text, honorific),
      requiresInternet: true,
      topic: 'general'
    };
  }

  // 3. CONTEXTUAL FOLLOW-UP QUESTIONS
  if (context?.lastTopic) {
    // "का?", "कधी?", "कसे?", "आणखी काय?", "हो", "नाही", "आणि तू?"
    if (clean === 'का?' || clean === 'का' || clean.includes('कारण काय')) {
      if (context.lastTopic === 'battery') {
        return {
          matched: true,
          response: `${honorific}, बॅटरीचा वापर स्क्रीन ब्राईटनेस, बॅकग्राउंड अ‍ॅप्स आणि चालू असलेल्या सेन्सर्सवर अवलंबून असतो. जास्त बॅटरी वाचवण्यासाठी स्क्रीन ब्राईटनेस कमी करा.`,
          topic: 'battery'
        };
      }
      if (context.lastTopic === 'emotion') {
        return {
          matched: true,
          response: `${honorific}, भावना आपल्या जीवनाचा अविभाज्य भाग असतात. त्यांना दाबून न ठेवता समजून घेणे अधिक महत्त्वाचे असते.`,
          topic: 'emotion'
        };
      }
      if (context.lastTopic === 'torch') {
        return {
          matched: true,
          response: `${honorific}, कॅमेऱ्याच्या एलईडी फ्लॅशचा वापर करून आपण प्रकाश मिळवतो.`,
          topic: 'torch'
        };
      }
    }

    if (clean.includes('आणखी') || clean.includes('पुढे काय') || clean.includes('सांग ना')) {
      if (context.lastTopic === 'emotion') {
        return {
          matched: true,
          response: `${honorific}, स्वतःची काळजी घेणे ही सर्वात मोठी ताकद आहे. चांगला आहार, पुरेसा व्यायाम आणि वेळेवर झोप यामुळे मानसिक आरोग्य उत्तम राहते.`,
          topic: 'emotion'
        };
      }
    }

    if (clean.includes('आणि तू') || clean.includes('तू कसा आहेस') || clean.includes('तू कशी आहेस')) {
      return {
        matched: true,
        response: `मी अगदी उत्तम आहे ${honorific}! माझे सर्व अल्गोरिदम आणि स्थानिक कोर सुरळीत सुरू आहेत. तुमची सेवा करणे हेच माझे कार्य आहे.`,
        topic: 'general'
      };
    }
  }

  // 3.5. KOLHAPURI MARATHI CONVERSATIONAL GREETINGS & IDIOMS (कोल्हापुरी लहेजा)
  if (
    clean.includes('कसं काय') ||
    clean.includes('कस काय') ||
    clean.includes('काय चाललंय') ||
    clean.includes('काय चाललय') ||
    clean.includes('एकदम कडक') ||
    clean.includes('नाद खुळा') ||
    clean.includes('नाद') ||
    clean.includes('ओकेमधी') ||
    clean.includes('मी हाय की')
  ) {
    const kolhapuriResponses = [
      `एकदम कडक साहेब! कोल्हापूरच्या ताकदीसारखी आपली सर्व सिस्टीम ओकेमधी हाय! काळजी करायची नाय, मी हाय की! सांगा आज काय नियोजन करायचंय?`,
      `कसं काय साहेब? नाद खुळा! मृणीलचा कोर पूर्ण क्षमतेने चालतोय. तुम्ही फक्त हुकूम द्या, काम चुटकीसरशी फत्ते करू!`,
      `सगळं ओकेमधी चाललंय साहेब! आपली बॅटरी, गजर आणि स्थानिक बुद्धिमत्ता एकदम फिट हाय. सांगा कशी मदत करू?`
    ];
    return {
      matched: true,
      response: kolhapuriResponses[Math.floor(Math.random() * kolhapuriResponses.length)],
      topic: 'greeting'
    };
  }

  if (clean.includes('कोल्हापूर') || clean.includes('कोल्हापुरी')) {
    return {
      matched: true,
      response: `${honorific}, करवीर निवासिनी श्री महालक्ष्मी अंबाबाईचे पावन तीर्थक्षेत्र, छत्रपती राजर्षी शाहू महाराजांची कर्मभूमी, कुस्तीची पंढरी आणि गुळाची बाजारपेठ म्हणजे आपले ऐतिहासिक कोल्हापूर! नाद करायचा नाय!`,
      topic: 'general'
    };
  }

  // 4. DAILY CONVERSATION & COURTESIES
  if (clean.includes('शुभ प्रभात') || clean.includes('गुड मॉर्निंग') || clean.includes('good morning')) {
    return {
      matched: true,
      response: `शुभ प्रभात ${honorific}! आजचा दिवस आपल्यासाठी अत्यंत यशस्वी आणि उत्साही जावो. सांगा, आजच्या दिवसाचे नियोजन कसे सुरू करूया?`,
      topic: 'greeting'
    };
  }

  if (clean.includes('शुभ रात्री') || clean.includes('गुड नाईट') || clean.includes('good night') || clean.includes('झोपाय')) {
    return {
      matched: true,
      response: `शुभ रात्री ${honorific}! शांत आणि गाढ झोप घ्या. मी सर्व प्रणालींवर लक्ष ठेवून आहे आणि वेळेवर अलार्म वाजवून आपल्याला जागे करेन.`,
      topic: 'greeting'
    };
  }

  if (clean.includes('कसा आहेस') || clean.includes('कशी आहेस') || clean.includes('कसे आहात') || clean.includes('how are you')) {
    return {
      matched: true,
      response: `मी उत्तम आहे ${honorific}! माझी अंतर्गत प्रणाली सुरळीत कार्यरत आहे. आपण कसे आहात? आजचा दिवस कसा चालला आहे?`,
      topic: 'greeting'
    };
  }

  if (clean.includes('धन्यवाद') || clean.includes('थँक्स') || clean.includes('आभारी आहे') || clean.includes('thank')) {
    return {
      matched: true,
      response: `माझे कर्तव्य आहे ${honorific}! आपल्याला मदत करता आल्याचा मला आनंद आहे. इतर काही सेवा हवी असल्यास नक्की सांगा.`,
      topic: 'greeting'
    };
  }

  // 5. HUMOR & JOKES
  if (clean.includes('विनोद') || clean.includes('हसवा') || clean.includes('joke')) {
    const jokes = [
      `${honorific}, एक गमतीशीर प्रसंग ऐका: एक मित्र दुसऱ्याला विचारतो, 'तुझा फोन नेहमी सायलेंटवर का असतो?' दुसरा म्हणाला, 'अरे, फोन सायलेंट राहिला तरच घरात शांतता राहते!'`,
      `एकदा एका विद्यार्थ्याने शिक्षकांना विचारले: 'सर, ज्या गोष्टीचा मी अभ्यासच केला नाही, त्याची शिक्षा मला मिळेल का?' शिक्षक म्हणाले, 'नाही, कधीच नाही!' विद्यार्थी म्हणाला, 'छान! मग मी आज गृहपाठ केलाच नाही!'`
    ];
    return {
      matched: true,
      response: jokes[Math.floor(Math.random() * jokes.length)],
      topic: 'general'
    };
  }

  // 6. MOTIVATION & SUVICHAR (सुविचार)
  if (
    clean.includes('सुविचार') ||
    clean.includes('प्रेरणा') ||
    clean.includes('चांगले विचार') ||
    clean.includes('विचार सांगा') ||
    clean.includes('motivation') ||
    clean.includes('quote')
  ) {
    const suvichar = [
      `आजचा प्रेरणादायी विचार: "वादळात जहाजाची खरी परीक्षा होते आणि संघर्षात माणसाची खरी ताकद ओळखली जाते." पराभवाची भीती न बाळगता सातत्य ठेवा, यश नक्की तुमचेच आहे!`,
      `"ध्येय साध्य करायचे असेल तर विचारांपेक्षा कृतीला अधिक महत्त्व द्या." लहान पाऊलही जर योग्य दिशेने पडले, तर ते मोठ्या प्रवासाची सुरुवात ठरते.`
    ];
    return {
      matched: true,
      response: suvichar[Math.floor(Math.random() * suvichar.length)],
      topic: 'general'
    };
  }

  // 7. TIME & DATE INQUIRIES
  if (clean.includes('वेळ काय') || clean.includes('किती वाजले') || clean.includes('time काय') || clean.includes('what time')) {
    const now = new Date();
    const timeString = now.toLocaleTimeString('mr-IN', { hour: '2-digit', minute: '2-digit' });
    return {
      matched: true,
      response: `${honorific}, सध्या घड्याळात ${timeString} झाले आहेत.`,
      topic: 'general'
    };
  }

  if (clean.includes('आजचा वार') || clean.includes('तारीख काय') || clean.includes('आजची तारीख') || clean.includes('date काय')) {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = now.toLocaleDateString('mr-IN', options);
    return {
      matched: true,
      response: `${honorific}, आज ${dateString} आहे.`,
      topic: 'general'
    };
  }

  // 8. CREATOR & PURPOSE
  if (clean.includes('तुला कोणी बनवले') || clean.includes('कोणी डिझाइन केले') || clean.includes('तुझा निर्माता')) {
    return {
      matched: true,
      response: `मी 'मृणील' (MRUNEEL) आहे. मला जार्व्हिसच्या संकल्पनेवर आधारित, खास अँड्रॉइड प्रणालीसाठी आणि मराठी भाषेच्या समृद्ध संस्कृतीचा आदर ठेवून डिझाइन केले गेले आहे.`,
      topic: 'general'
    };
  }

  return {
    matched: false,
    response: ''
  };
}
