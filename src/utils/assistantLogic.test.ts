import test from 'node:test';
import assert from 'node:assert/strict';
import { extractTimeFromText, detectLanguage, parseOfflineCommand } from './offlineEngine';
import { hashPin } from './security';

test('extractTimeFromText parses standard 24h and 12h strings', () => {
  assert.equal(extractTimeFromText('set alarm for 07:30'), '07:30');
  assert.equal(extractTimeFromText('wake me at 8:45 pm'), '20:45');
  assert.equal(extractTimeFromText('set alarm for 6 am'), '06:00');
  assert.equal(extractTimeFromText('alarm 11 pm'), '23:00');
});

test('extractTimeFromText parses Devanagari numerals and Marathi tokens', () => {
  assert.equal(extractTimeFromText('सकाळी ७ वाजता अलार्म लावा'), '07:00');
  assert.equal(extractTimeFromText('८ वाजता'), '08:00');
  assert.equal(extractTimeFromText('alarm at 14:15'), '14:15');
});

test('detectLanguage correctly categorizes Marathi, Hindi, and English', () => {
  assert.equal(detectLanguage('Hello Jarvis how are you today'), 'en-US');
  assert.equal(detectLanguage('माझे नाव शुभम आहे आणि मला मदत करा'), 'mr-IN');
  assert.equal(detectLanguage('कृपया मुझे समय बताइए'), 'hi-IN');
});

test('parseOfflineCommand handles alarms, battery, and torch in Marathi', () => {
  const alarmAction = parseOfflineCommand('सकाळी ७ वाजता अलार्म लावा', 'mr-IN');
  assert.equal(alarmAction.type, 'SET_ALARM');
  assert.equal(alarmAction.payload?.time, '07:00');
  assert.ok(alarmAction.spokenResponse.includes('अलार्म'));

  const batteryAction = parseOfflineCommand('बॅटरी किती आहे?', 'mr-IN', { batteryLevel: 0.85, isCharging: false });
  assert.equal(batteryAction.type, 'CHECK_BATTERY');
  assert.equal(batteryAction.payload?.batteryLevel, 85);
  assert.ok(batteryAction.spokenResponse.includes('85%'));

  const torchAction = parseOfflineCommand('टॉर्च चालू करा', 'mr-IN');
  assert.equal(torchAction.type, 'TOGGLE_TORCH');
  assert.equal(torchAction.payload?.state, true);
});

test('parseOfflineCommand handles notes and reminders', () => {
  const noteAction = parseOfflineCommand('टीप लिहा दुधाचे बिल भरणे', 'mr-IN');
  assert.equal(noteAction.type, 'ADD_NOTE');
  assert.ok(noteAction.spokenResponse.includes('दुधाचे बिल भरणे'));

  const reminderAction = parseOfflineCommand('remind me to call client', 'en-US');
  assert.equal(reminderAction.type, 'SET_REMINDER');
  assert.ok(reminderAction.spokenResponse.includes('call client'));
});

test('hashPin returns deterministic cryptographic hash', async () => {
  const hash1 = await hashPin('1234');
  const hash2 = await hashPin('1234');
  const hashDiff = await hashPin('5678');

  assert.equal(typeof hash1, 'string');
  assert.ok(hash1.length > 5);
  assert.equal(hash1, hash2);
  assert.notEqual(hash1, hashDiff);
});

test('parseOfflineCommand understands emotions in Marathi', () => {
  // Sadness
  const sadAction = parseOfflineCommand('मला आज खूप वाईट वाटत आहे आणि मी उदास आहे', 'mr-IN');
  assert.equal(sadAction.type, 'EMOTIONAL_SUPPORT');
  assert.equal(sadAction.detectedEmotion, 'sadness');
  assert.ok(sadAction.spokenResponse.includes('समजते') || sadAction.spokenResponse.includes('विश्रांती'));

  // Anger
  const angerAction = parseOfflineCommand('मला खूप चीड आणि राग आला आहे', 'mr-IN');
  assert.equal(angerAction.type, 'EMOTIONAL_SUPPORT');
  assert.equal(angerAction.detectedEmotion, 'anger');
  assert.ok(angerAction.spokenResponse.includes('शांत') || angerAction.spokenResponse.includes('संताप'));

  // Happiness
  const happyAction = parseOfflineCommand('मी आज खूप आनंदी आहे आणि स्पर्धा जिंकलो', 'mr-IN');
  assert.equal(happyAction.type, 'EMOTIONAL_SUPPORT');
  assert.equal(happyAction.detectedEmotion, 'happiness');
  assert.ok(happyAction.spokenResponse.includes('आनंद') || happyAction.spokenResponse.includes('छान'));

  // Stress
  const stressAction = parseOfflineCommand('मी खूप थकून गेलो आहे डोके दुखत आहे', 'mr-IN');
  assert.equal(stressAction.type, 'EMOTIONAL_SUPPORT');
  assert.equal(stressAction.detectedEmotion, 'stress');
  assert.ok(stressAction.spokenResponse.includes('विश्रांती') || stressAction.spokenResponse.includes('परिश्रम'));
});

test('parseOfflineCommand honestly explains internet limitations without faking', () => {
  const newsAction = parseOfflineCommand('आजच्या ताज्या बातम्या काय आहेत?', 'mr-IN');
  assert.equal(newsAction.type, 'INTERNET_LIMITATION');
  assert.ok(newsAction.spokenResponse.includes('इंटरनेट'));
  assert.ok(newsAction.spokenResponse.includes('ऑफलाइन'));

  const weatherAction = parseOfflineCommand('आज पाऊस पडेल का हवामान कसे आहे?', 'mr-IN');
  assert.equal(weatherAction.type, 'INTERNET_LIMITATION');
  assert.ok(weatherAction.spokenResponse.includes('हवामान'));
  assert.ok(weatherAction.spokenResponse.includes('इंटरनेट'));
});

test('parseOfflineCommand handles conversational follow-ups with context', () => {
  // Context where last topic was battery
  const followUpBattery = parseOfflineCommand('का?', 'mr-IN', {
    conversationalContext: { lastTopic: 'battery' }
  });
  assert.equal(followUpBattery.type, 'CONVERSATIONAL');
  assert.ok(followUpBattery.spokenResponse.includes('बॅटरीचा वापर'));

  // Context where user asks "आणि तू कसा आहेस?"
  const followUpGreeting = parseOfflineCommand('आणि तू कसा आहेस?', 'mr-IN', {
    conversationalContext: { lastTopic: 'greeting' }
  });
  assert.equal(followUpGreeting.type, 'CONVERSATIONAL');
  assert.ok(followUpGreeting.spokenResponse.includes('उत्तम'));
});

test('parseOfflineCommand does not dump command menus on unrelated queries', () => {
  const customQuery = parseOfflineCommand('तुला काय वाटते याबद्दल?', 'mr-IN');
  // Must address the query directly and politely without spamming the old static menu list
  assert.ok(!customQuery.spokenResponse.includes('तुम्ही अलार्म, बॅटरी, टॉर्च, नोट्स, स्मरणपत्रे किंवा कॅमेरा उघडण्यासाठी'));
  assert.ok(customQuery.spokenResponse.includes('तुला काय वाटते याबद्दल?'));
});

test('local math engine accurately solves the mango word problem without internet', () => {
  // "माझ्याकडे 5 आंबे आहेत, मी तुला 2 दिले आणि तू 1 मला परत केला, तर माझ्याकडे किती आंबे राहिले आणि तुझ्याकडे किती?"
  const mangoQuery = parseOfflineCommand(
    'माझ्याकडे 5 आंबे आहेत, मी तुला 2 दिले आणि तू 1 मला परत केला तर माझ्याकडे किती आंबे राहिले आणि तुझ्याकडे किती?',
    'mr-IN'
  );

  assert.equal(mangoQuery.type, 'MATHEMATICS');
  // Expected: user has 4, assistant has 1
  assert.ok(mangoQuery.spokenResponse.includes('४'));
  assert.ok(mangoQuery.spokenResponse.includes('१'));
  assert.ok(mangoQuery.spokenResponse.includes('आपल्याकडे ४'));
  assert.ok(mangoQuery.spokenResponse.includes('माझ्याकडे १'));
  assert.equal(mangoQuery.payload?.numericValue, 4);
});

test('local math engine solves arithmetic, percentages, and powers in Marathi', () => {
  // Addition
  const addQuery = parseOfflineCommand('२५ अधिक १५ किती होतात?', 'mr-IN');
  assert.equal(addQuery.type, 'MATHEMATICS');
  assert.equal(addQuery.payload?.result, 40);
  assert.ok(addQuery.spokenResponse.includes('40'));

  // Subtraction
  const subQuery = parseOfflineCommand('५० वजा १८ किती?', 'mr-IN');
  assert.equal(subQuery.type, 'MATHEMATICS');
  assert.equal(subQuery.payload?.result, 32);

  // Multiplication
  const multQuery = parseOfflineCommand('१२ गुणिले ८', 'mr-IN');
  assert.equal(multQuery.type, 'MATHEMATICS');
  assert.equal(multQuery.payload?.result, 96);

  // Division
  const divQuery = parseOfflineCommand('१०० भागिले ४', 'mr-IN');
  assert.equal(divQuery.type, 'MATHEMATICS');
  assert.equal(divQuery.payload?.result, 25);

  // Percentage
  const pctQuery = parseOfflineCommand('५०० चा २० टक्के किती?', 'mr-IN');
  assert.equal(pctQuery.type, 'MATHEMATICS');
  assert.equal(pctQuery.payload?.result, 100);

  // Square
  const sqQuery = parseOfflineCommand('५ चा वर्ग किती?', 'mr-IN');
  assert.equal(sqQuery.type, 'MATHEMATICS');
  assert.equal(sqQuery.payload?.result, 25);

  // Division by zero
  const zeroDiv = parseOfflineCommand('५० भागिले ०', 'mr-IN');
  assert.equal(zeroDiv.type, 'MATHEMATICS');
  assert.ok(zeroDiv.spokenResponse.includes('अनिर्धारित'));
});

test('local math engine handles conversational follow-up calculations', () => {
  // First calculation: 40
  const firstCalc = parseOfflineCommand('२० अधिक २०', 'mr-IN');
  assert.equal(firstCalc.payload?.result, 40);

  // Follow-up: "यात अजून १० मिळवले तर?"
  const followUpAdd = parseOfflineCommand('यात अजून १० मिळवले तर?', 'mr-IN', {
    conversationalContext: { lastCalculationResult: 40 }
  });
  assert.equal(followUpAdd.type, 'MATHEMATICS');
  assert.equal(followUpAdd.payload?.result, 50);

  // Follow-up: "त्याचे निम्मे किती?"
  const followUpHalf = parseOfflineCommand('त्याचे निम्मे किती?', 'mr-IN', {
    conversationalContext: { lastCalculationResult: 50 }
  });
  assert.equal(followUpHalf.type, 'MATHEMATICS');
  assert.equal(followUpHalf.payload?.result, 25);
});

test('local general knowledge engine answers factual questions offline without internet', () => {
  // Capital of India
  const indiaCap = parseOfflineCommand('भारताची राजधानी कोणती आहे?', 'mr-IN');
  assert.equal(indiaCap.type, 'GENERAL_KNOWLEDGE');
  assert.ok(indiaCap.spokenResponse.includes('नवी दिल्ली'));

  // Capital of Maharashtra
  const mahaCap = parseOfflineCommand('महाराष्ट्राची राजधानी कोणती?', 'mr-IN');
  assert.equal(mahaCap.type, 'GENERAL_KNOWLEDGE');
  assert.ok(mahaCap.spokenResponse.includes('मुंबई'));

  // Formula of water
  const waterFormula = parseOfflineCommand('पाण्याचे रासायनिक सूत्र काय आहे?', 'mr-IN');
  assert.equal(waterFormula.type, 'GENERAL_KNOWLEDGE');
  assert.ok(waterFormula.spokenResponse.includes('H₂O'));

  // Marathi Language Day
  const marathiDay = parseOfflineCommand('मराठी भाषा गौरव दिन कधी असतो?', 'mr-IN');
  assert.equal(marathiDay.type, 'GENERAL_KNOWLEDGE');
  assert.ok(marathiDay.spokenResponse.includes('२७ फेब्रुवारी'));
});

test('local math engine solves Romanized Marathi and multi-step calculations', () => {
  // Romanized Marathi: "5 aani 3 kiti hotat?"
  const romAdd = parseOfflineCommand('5 aani 3 kiti hotat?', 'mr-IN');
  assert.equal(romAdd.type, 'MATHEMATICS');
  assert.equal(romAdd.payload?.result, 8);

  // Romanized Marathi: "10 madhun 4 vaja kele tar kiti?"
  const romSub = parseOfflineCommand('10 madhun 4 vaja kele tar kiti?', 'mr-IN');
  assert.equal(romSub.type, 'MATHEMATICS');
  assert.equal(romSub.payload?.result, 6);

  // Marathi word numbers: "शंभर भागिले चार" (100 / 4)
  const wordDiv = parseOfflineCommand('शंभर भागिले चार', 'mr-IN');
  assert.equal(wordDiv.type, 'MATHEMATICS');
  assert.equal(wordDiv.payload?.result, 25);

  // Math must never say internet is required
  assert.notEqual(romAdd.type, 'INTERNET_LIMITATION');
  assert.notEqual(romSub.type, 'INTERNET_LIMITATION');
  assert.notEqual(wordDiv.type, 'INTERNET_LIMITATION');
  assert.ok(!romAdd.spokenResponse.includes('इंटरनेट'));
});

test('marathi conversational engine supports Kolhapuri dialect and regional greetings', () => {
  const kolhapurGreeting = parseOfflineCommand('कसं काय साहेब?', 'mr-IN');
  assert.equal(kolhapurGreeting.type, 'CONVERSATIONAL');
  assert.ok(
    kolhapurGreeting.spokenResponse.includes('कडक') ||
    kolhapurGreeting.spokenResponse.includes('नाद') ||
    kolhapurGreeting.spokenResponse.includes('हाय की') ||
    kolhapurGreeting.spokenResponse.includes('ओकेमधी')
  );

  const cityQuery = parseOfflineCommand('कोल्हापूर बद्दल माहिती सांग', 'mr-IN');
  assert.equal(cityQuery.type, 'CONVERSATIONAL');
  assert.ok(cityQuery.spokenResponse.includes('महालक्ष्मी') || cityQuery.spokenResponse.includes('शाहू'));
});
