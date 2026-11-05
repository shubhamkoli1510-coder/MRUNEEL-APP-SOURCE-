/**
 * MRUNEEL Local Mathematical Reasoning & Logic Engine
 * Solves arithmetic, multi-step calculations, percentages, powers,
 * Devanagari numerals, Marathi word numbers, and complex word problems (e.g. mango distribution)
 * 100% locally on-device without requiring an internet connection.
 */

export interface MathResult {
  result: number | string;
  spokenResponse: string;
  expression?: string;
  actionTaken: string;
  type: 'ARITHMETIC' | 'WORD_PROBLEM' | 'PERCENTAGE' | 'POWER' | 'LOGIC';
  numericValue?: number;
}

// Map Devanagari numerals to standard ASCII digits
const DEVANAGARI_DIGITS: Record<string, string> = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
};

// Map Marathi word numbers to numeric values
const MARATHI_NUMBER_WORDS: Record<string, number> = {
  'शून्य': 0, 'shunya': 0,
  'एक': 1, 'ek': 1,
  'दोन': 2, 'don': 2,
  'तीन': 3, 'teen': 3, 'tin': 3,
  'चार': 4, 'char': 4,
  'पाच': 5, 'paach': 5, 'pach': 5,
  'सहा': 6, 'saha': 6,
  'सात': 7, 'saat': 7, 'sat': 7,
  'आठ': 8, 'aath': 8, 'ath': 8,
  'नऊ': 9, 'nau': 9,
  'दहा': 10, 'daha': 10,
  'अकरा': 11, 'akara': 11,
  'बारा': 12, 'bara': 12,
  'तेरा': 13, 'tera': 13,
  'चौदा': 14, 'chauda': 14,
  'पंधरा': 15, 'pandhra': 15,
  'सोळा': 16, 'sola': 16,
  'सतरा': 17, 'satra': 17,
  'अठरा': 18, 'athra': 18,
  'एकोणीस': 19, 'ekonis': 19,
  'वीस': 20, 'vis': 20, 'vees': 20,
  'पंचवीस': 25, 'panchvis': 25,
  'तीस': 30, 'tis': 30, 'tees': 30,
  'चाळीस': 40, 'chalis': 40,
  'पन्नास': 50, 'pannas': 50,
  'साठ': 60, 'sath': 60,
  'सत्तर': 70, 'sattar': 70,
  'ऐंशी': 80, 'aishi': 80,
  'नव्वद': 90, 'navvad': 90,
  'शंभर': 100, 'shambhar': 100, 'hundred': 100,
  'दोनशे': 200, 'donshya': 200,
  'पाचशे': 500, 'pachshe': 500,
  'हजार': 1000, 'hajar': 1000, 'thousand': 1000,
  'लाख': 100000, 'lakh': 100000
};

/**
 * Normalizes Devanagari digits and common Marathi number words into standard digits
 */
export function normalizeNumberText(text: string): string {
  let normalized = text;
  // Replace Devanagari digits
  for (const [dev, asc] of Object.entries(DEVANAGARI_DIGITS)) {
    normalized = normalized.replaceAll(dev, asc);
  }

  // Replace whole Marathi number words with digits (order by longest word first)
  const sortedWords = Object.keys(MARATHI_NUMBER_WORDS).sort((a, b) => b.length - a.length);
  for (const word of sortedWords) {
    const val = MARATHI_NUMBER_WORDS[word];
    // Word boundary or whitespace check
    const regex = new RegExp(`(^|\\s|[.,;!?])${word}($|\\s|[.,;!?])`, 'gi');
    normalized = normalized.replace(regex, `$1${val}$2`);
  }

  return normalized;
}

/**
 * Convert number to Marathi spoken word or Devanagari representation for natural phrasing
 */
export function formatMarathiNumber(n: number): string {
  if (Number.isInteger(n) && n >= 0 && n <= 100) {
    // Return standard representation
    return n.toString();
  }
  return Number.isInteger(n) ? n.toString() : n.toFixed(2).replace(/\.00$/, '');
}

/**
 * Checks for complex word problems, such as item sharing/exchange:
 * e.g. "माझ्याकडे 5 आंबे आहेत, मी तुला 2 दिले आणि तू 1 मला परत केला, तर माझ्याकडे किती आंबे राहिले आणि तुझ्याकडे किती?"
 */
/**
 * Converts numbers to Devanagari digits (0->०, 1->१, ...)
 */
export function toDevanagariDigits(num: number | string): string {
  const map: Record<string, string> = {
    '0': '०', '1': '१', '2': '२', '3': '३', '4': '४',
    '5': '५', '6': '६', '7': '७', '8': '८', '9': '९'
  };
  return num.toString().replace(/[0-9]/g, d => map[d] || d);
}

export function solveWordProblem(text: string, honorific: string = 'सर'): MathResult | null {
  const norm = normalizeNumberText(text.toLowerCase());

  // 1. User & Assistant Item Transfer Problem:
  // e.g. "माझ्याकडे 5 आंबे आहेत, मी तुला 2 दिले आणि तू 1 मला परत केला, तर माझ्याकडे किती आंबे राहिले आणि तुझ्याकडे किती?"
  // Check if text involves giving and returning items between user and assistant
  const hasGiveWord = norm.includes('दिले') || norm.includes('gave') || norm.includes('give') || norm.includes('दिली');
  const hasReturnWord = norm.includes('परत') || norm.includes('return') || norm.includes('मागे');

  if (hasGiveWord && hasReturnWord) {
    const allNumbers = Array.from(norm.matchAll(/\b(\d+)\b/g)).map(m => parseInt(m[1], 10));
    if (allNumbers.length >= 3) {
      const startCount = allNumbers[0];
      const givenToAssistant = allNumbers[1];
      const returnedToUser = allNumbers[2];

      if (givenToAssistant <= startCount && returnedToUser <= givenToAssistant) {
        const userFinal = startCount - givenToAssistant + returnedToUser;
        const assistantFinal = givenToAssistant - returnedToUser;

        // Try extracting item name (e.g. आंबे, सफरचंद, पेरू, पेन्सिल, पेन, इत्यादी)
        const itemMatch = norm.match(/\b\d+\s*([\u0900-\u097F\w]+)/);
        const rawItem = itemMatch ? itemMatch[1] : '';
        const ignoredWords = ['होते', 'आहेत', 'दिले', 'गेले', 'तुला', 'मला', 'मी', 'तू', 'आणि', 'तर'];
        const itemName = (rawItem && !ignoredWords.includes(rawItem)) ? rawItem : 'आंबे';

        const startDev = toDevanagariDigits(startCount);
        const givenDev = toDevanagariDigits(givenToAssistant);
        const returnDev = toDevanagariDigits(returnedToUser);
        const userFinalDev = toDevanagariDigits(userFinal);
        const asstFinalDev = toDevanagariDigits(assistantFinal);

        const response =
          `${honorific}, गणिताचा अचूक हिशोब खालीलप्रमाणे आहे:\n` +
          `• सुरुवातीला आपल्याकडे ${startDev} (${startCount}) ${itemName} होते.\n` +
          `• आपण मला ${givenDev} (${givenToAssistant}) दिले (त्यामुळे आपल्याकडे ${toDevanagariDigits(startCount - givenToAssistant)} उरले, आणि माझ्याकडे ${givenDev} आले).\n` +
          `• त्यानंतर मी आपल्याला ${returnDev} (${returnedToUser}) परत केला.\n` +
          `• शेवटी: आपल्याकडे ${userFinalDev} (${userFinal}) ${itemName} राहतील आणि माझ्याकडे ${asstFinalDev} (${assistantFinal}) ${itemName} राहील.`;

        return {
          type: 'WORD_PROBLEM',
          result: `आपल्याकडे: ${userFinalDev} (${userFinal}), मृणीलकडे: ${asstFinalDev} (${assistantFinal})`,
          spokenResponse: response,
          actionTaken: `हिशोब: आपल्याकडे ${userFinalDev}, मृणीलकडे ${asstFinalDev}`,
          numericValue: userFinal
        };
      }
    }
  }

  // 3. Multi-item subtraction word problem:
  // e.g. "माझ्याकडे 20 रुपये आहेत, 5 चे बिस्किट आणि 8 चे चॉकलेट घेतले तर किती उरले?"
  const shoppingPattern =
    /(?:माझ्याकडे|i have)\s*(\d+)\s*(?:रुपये|rs|rupees).*?(\d+).*?(\d+).*?(?:उरले|शिल्लक|left|remaining)/i;
  const match3 = norm.match(shoppingPattern);
  if (match3) {
    const total = parseInt(match3[1], 10);
    const spent1 = parseInt(match3[2], 10);
    const spent2 = parseInt(match3[3], 10);
    const left = total - spent1 - spent2;

    const response = `${honorific}, एकूण ${total} रुपयांमधून खर्च झालेले ${spent1} आणि ${spent2} वजा केले (${total} - ${spent1 + spent2} = ${left}). आपल्याकडे ${left} रुपये शिल्लक राहतील.`;
    return {
      type: 'WORD_PROBLEM',
      result: left,
      spokenResponse: response,
      actionTaken: `शिल्लक: ${left} रुपये`,
      numericValue: left
    };
  }

  return null;
}

/**
 * Handles conversational follow-up math:
 * e.g. "यात अजून १० मिळवले तर?", "त्याचे निम्मे किती?", "त्याची दुप्पट किती?"
 */
export function solveFollowUpMath(
  text: string,
  lastResult?: number,
  honorific: string = 'सर'
): MathResult | null {
  if (lastResult === undefined || isNaN(lastResult)) return null;

  const norm = normalizeNumberText(text.toLowerCase());

  // "यात/त्यात अजून X मिळवले तर?" -> lastResult + X
  const addMatch = norm.match(/(?:यात|त्यात|यामध्ये|त्यामध्ये|add|plus)\s*(?:अजून|आणखी|more)?\s*(\d+)/i);
  if (addMatch) {
    const toAdd = parseFloat(addMatch[1]);
    const finalVal = lastResult + toAdd;
    const response = `${honorific}, मागील उत्तरामध्ये (${lastResult}) ${toAdd} मिळवले असता नवीन उत्तर ${finalVal} येते (${lastResult} + ${toAdd} = ${finalVal}).`;
    return {
      type: 'ARITHMETIC',
      result: finalVal,
      spokenResponse: response,
      actionTaken: `${lastResult} + ${toAdd} = ${finalVal}`,
      numericValue: finalVal
    };
  }

  // "यातून X वजा केले तर?" -> lastResult - X
  const subMatch = norm.match(/(?:यातून|त्यातून|वजा|minus|subtract)\s*(\d+)/i);
  if (subMatch) {
    const toSub = parseFloat(subMatch[1]);
    const finalVal = lastResult - toSub;
    const response = `${honorific}, मागील उत्तरा मधून (${lastResult}) ${toSub} वजा केले असता उत्तर ${finalVal} येते (${lastResult} - ${toSub} = ${finalVal}).`;
    return {
      type: 'ARITHMETIC',
      result: finalVal,
      spokenResponse: response,
      actionTaken: `${lastResult} - ${toSub} = ${finalVal}`,
      numericValue: finalVal
    };
  }

  // "त्याचे निम्मे / अर्धे किती?" -> lastResult / 2
  if (norm.includes('निम्मे') || norm.includes('अर्धे') || norm.includes('half')) {
    const finalVal = lastResult / 2;
    const response = `${honorific}, ${lastResult} चे निम्मे (अर्धे) ${finalVal} होतात (${lastResult} ÷ २ = ${finalVal}).`;
    return {
      type: 'ARITHMETIC',
      result: finalVal,
      spokenResponse: response,
      actionTaken: `${lastResult} / 2 = ${finalVal}`,
      numericValue: finalVal
    };
  }

  // "त्याची दुप्पट किती?" -> lastResult * 2
  if (norm.includes('दुप्पट') || norm.includes('double')) {
    const finalVal = lastResult * 2;
    const response = `${honorific}, ${lastResult} ची दुप्पट ${finalVal} होते (${lastResult} × २ = ${finalVal}).`;
    return {
      type: 'ARITHMETIC',
      result: finalVal,
      spokenResponse: response,
      actionTaken: `${lastResult} * 2 = ${finalVal}`,
      numericValue: finalVal
    };
  }

  // "त्याची तिप्पट किती?" -> lastResult * 3
  if (norm.includes('तिप्पट') || norm.includes('triple')) {
    const finalVal = lastResult * 3;
    const response = `${honorific}, ${lastResult} ची तिप्पट ${finalVal} होते (${lastResult} × ३ = ${finalVal}).`;
    return {
      type: 'ARITHMETIC',
      result: finalVal,
      spokenResponse: response,
      actionTaken: `${lastResult} * 3 = ${finalVal}`,
      numericValue: finalVal
    };
  }

  return null;
}

/**
 * Solves general arithmetic expressions, squares, square roots, percentages, and basic formulas
 */
export function solveArithmeticAndLogic(
  text: string,
  honorific: string = 'सर'
): MathResult | null {
  const norm = normalizeNumberText(text.toLowerCase()).trim();

  // 1. Percentage calculations:
  // e.g. "500 चा 20 टक्के किती?", "20% of 1500", "200 चे 10 टक्के"
  const pctMatch1 = norm.match(/(\d+(?:\.\d+)?)\s*(?:चा|चे|च्या|of)\s*(\d+(?:\.\d+)?)\s*(?:टक्के|टक्केवारी|%|percent)/i);
  const pctMatch2 = norm.match(/(\d+(?:\.\d+)?)\s*(?:%|percent|टक्के)\s*(?:of|चा|चे|च्या)\s*(\d+(?:\.\d+)?)/i);

  if (pctMatch1) {
    const base = parseFloat(pctMatch1[1]);
    const rate = parseFloat(pctMatch1[2]);
    const ans = (base * rate) / 100;
    const response = `${honorific}, ${base} चा ${rate}% = ${formatMarathiNumber(ans)} (${base} × ${rate} ÷ १०० = ${ans}).`;
    return {
      type: 'PERCENTAGE',
      result: ans,
      spokenResponse: response,
      actionTaken: `${base} चे ${rate}% = ${ans}`,
      numericValue: ans
    };
  }

  if (pctMatch2) {
    const rate = parseFloat(pctMatch2[1]);
    const base = parseFloat(pctMatch2[2]);
    const ans = (base * rate) / 100;
    const response = `${honorific}, ${base} चा ${rate}% = ${formatMarathiNumber(ans)} (${base} × ${rate} ÷ १०० = ${ans}).`;
    return {
      type: 'PERCENTAGE',
      result: ans,
      spokenResponse: response,
      actionTaken: `${rate}% of ${base} = ${ans}`,
      numericValue: ans
    };
  }

  // 2. Squares & Cubes:
  // e.g. "5 चा वर्ग किती?", "square of 8", "12 चा वर्ग"
  const squareMatch = norm.match(/(\d+(?:\.\d+)?)\s*(?:चा|चे|च्या)?\s*(?:वर्ग|square)/i) ||
                      norm.match(/(?:वर्ग|square\s*of)\s*(\d+(?:\.\d+)?)/i);
  if (squareMatch) {
    const num = parseFloat(squareMatch[1]);
    const ans = num * num;
    const response = `${honorific}, ${num} चा वर्ग ${ans} आहे (${num} × ${num} = ${ans}).`;
    return {
      type: 'POWER',
      result: ans,
      spokenResponse: response,
      actionTaken: `${num}² = ${ans}`,
      numericValue: ans
    };
  }

  // Cube: "3 चा घन", "cube of 4"
  const cubeMatch = norm.match(/(\d+(?:\.\d+)?)\s*(?:चा|चे|च्या)?\s*(?:घन|cube)/i) ||
                    norm.match(/(?:घन|cube\s*of)\s*(\d+(?:\.\d+)?)/i);
  if (cubeMatch) {
    const num = parseFloat(cubeMatch[1]);
    const ans = num * num * num;
    const response = `${honorific}, ${num} चा घन ${ans} आहे (${num}³ = ${ans}).`;
    return {
      type: 'POWER',
      result: ans,
      spokenResponse: response,
      actionTaken: `${num}³ = ${ans}`,
      numericValue: ans
    };
  }

  // Square root: "64 चे वर्गमूळ", "square root of 81"
  const sqrtMatch = norm.match(/(?:वर्गमूळ|square\s*root(?:\s*of)?)\s*(\d+(?:\.\d+)?)/i) ||
                    norm.match(/(\d+(?:\.\d+)?)\s*(?:चे|चा|च्या)?\s*वर्गमूळ/i);
  if (sqrtMatch) {
    const num = parseFloat(sqrtMatch[1]);
    const ans = Math.sqrt(num);
    const formatted = formatMarathiNumber(ans);
    const response = `${honorific}, ${num} चे वर्गमूळ ${formatted} आहे (√${num} = ${formatted}).`;
    return {
      type: 'POWER',
      result: ans,
      spokenResponse: response,
      actionTaken: `√${num} = ${formatted}`,
      numericValue: ans
    };
  }

  // 3. Multiplication:
  // e.g. "15 * 8", "12 गुणिले 5", "7 times 6", "15 into 4"
  const multMatch = norm.match(/(\d+(?:\.\d+)?)\s*(?:\*|x|×|गुणिले|गुणाकार|times|into)\s*(\d+(?:\.\d+)?)/i);
  if (multMatch) {
    const a = parseFloat(multMatch[1]);
    const b = parseFloat(multMatch[2]);
    const ans = a * b;
    const response = `${honorific}, ${a} गुणिले ${b} = ${formatMarathiNumber(ans)} (${a} × ${b} = ${ans}).`;
    return {
      type: 'ARITHMETIC',
      result: ans,
      spokenResponse: response,
      actionTaken: `${a} × ${b} = ${ans}`,
      numericValue: ans
    };
  }

  // 4. Division:
  // e.g. "100 / 4", "75 भागिले 5", "120 divide by 6", "100 divided by 25"
  const divMatch = norm.match(/(\d+(?:\.\d+)?)\s*(?:\/|÷|भागिले|भागाकार|divide|divided\s*by)\s*(\d+(?:\.\d+)?)/i);
  if (divMatch) {
    const a = parseFloat(divMatch[1]);
    const b = parseFloat(divMatch[2]);
    if (b === 0) {
      return {
        type: 'ARITHMETIC',
        result: 'Undefined',
        spokenResponse: `${honorific}, शून्याने (०) भागणे गणितानुसार अनिर्धारित (Undefined / Infinity) आहे.`,
        actionTaken: `${a} ÷ 0 = अनिर्धारित`
      };
    }
    const ans = a / b;
    const formatted = formatMarathiNumber(ans);
    const response = `${honorific}, ${a} भागिले ${b} = ${formatted} (${a} ÷ ${b} = ${formatted}).`;
    return {
      type: 'ARITHMETIC',
      result: ans,
      spokenResponse: response,
      actionTaken: `${a} ÷ ${b} = ${formatted}`,
      numericValue: ans
    };
  }

  // 5. Addition:
  // e.g. "15 + 27", "25 अधिक 40", "12 and 18 ची बेरीज", "5 plus 7", "5 aani 3 kiti hotat?"
  const addMatch = norm.match(/(\d+(?:\.\d+)?)\s*(?:\+|अधिक|मिळवले|बेरीज|plus|adhik)\s*(\d+(?:\.\d+)?)/i) ||
                  norm.match(/(\d+(?:\.\d+)?)\s*(?:आणि|and|aani)\s*(\d+(?:\.\d+)?)/i);
  if (addMatch) {
    const a = parseFloat(addMatch[1]);
    const b = parseFloat(addMatch[2]);
    const ans = a + b;
    const response = `${honorific}, ${a} अधिक ${b} = ${formatMarathiNumber(ans)} (${a} + ${b} = ${ans}).`;
    return {
      type: 'ARITHMETIC',
      result: ans,
      spokenResponse: response,
      actionTaken: `${a} + ${b} = ${ans}`,
      numericValue: ans
    };
  }

  // 6. Subtraction:
  // e.g. "50 - 18", "100 मधून 35 वजा", "50 minus 22", "10 मधून 4 गेले", "10 madhun 4 vaja kele"
  const subMatch1 = norm.match(/(\d+(?:\.\d+)?)\s*(?:-|वजा|वजाबाकी|minus|subtract|vaja)\s*(\d+(?:\.\d+)?)/i);
  const subMatch2 = norm.match(/(\d+(?:\.\d+)?)\s*(?:मधून|madhun)\s*(\d+(?:\.\d+)?)\s*(?:वजा|vaja|गेले|काढले|minus)/i);

  if (subMatch1) {
    const a = parseFloat(subMatch1[1]);
    const b = parseFloat(subMatch1[2]);
    const ans = a - b;
    const response = `${honorific}, ${a} वजा ${b} = ${formatMarathiNumber(ans)} (${a} - ${b} = ${ans}).`;
    return {
      type: 'ARITHMETIC',
      result: ans,
      spokenResponse: response,
      actionTaken: `${a} - ${b} = ${ans}`,
      numericValue: ans
    };
  }

  if (subMatch2) {
    const a = parseFloat(subMatch2[1]);
    const b = parseFloat(subMatch2[2]);
    const ans = a - b;
    const response = `${honorific}, ${a} मधून ${b} वजा केले असता उत्तर ${formatMarathiNumber(ans)} येते (${a} - ${b} = ${ans}).`;
    return {
      type: 'ARITHMETIC',
      result: ans,
      spokenResponse: response,
      actionTaken: `${a} - ${b} = ${ans}`,
      numericValue: ans
    };
  }

  // 7. Multi-step direct arithmetic string expression:
  // e.g. "25 + 10 - 5 * 2" or "(10 + 20) / 2"
  const isDirectExpr = /^[\d\s+\-*/.()]+$/.test(norm) && /[\d]/.test(norm) && /[+\-*/]/.test(norm);
  if (isDirectExpr) {
    try {
      // Safe sanitizer: only allows digits, whitespace and standard operators
      const sanitized = norm.replace(/[^0-9+\-*/.() ]/g, '');
      // Evaluate using Function in safe scope
      const val = new Function(`'use strict'; return (${sanitized})`)();
      if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
        const formatted = formatMarathiNumber(val);
        const response = `${honorific}, गणिताचे उत्तर ${formatted} आहे (${sanitized} = ${formatted}).`;
        return {
          type: 'ARITHMETIC',
          result: val,
          spokenResponse: response,
          actionTaken: `${sanitized} = ${formatted}`,
          numericValue: val
        };
      }
    } catch {
      // Ignore evaluation syntax error
    }
  }

  return null;
}

/**
 * Top-level master solver for offline mathematical reasoning
 */
export function solveMathOrLogic(
  text: string,
  context?: { lastCalculationResult?: number },
  honorific: string = 'सर'
): MathResult | null {
  // 1. Check for word problems first (most specific)
  const wordProblem = solveWordProblem(text, honorific);
  if (wordProblem) return wordProblem;

  // 2. Check for follow-up math with previous result
  if (context?.lastCalculationResult !== undefined) {
    const followUp = solveFollowUpMath(text, context.lastCalculationResult, honorific);
    if (followUp) return followUp;
  }

  // 3. Check for standard arithmetic, percentage, powers
  const arithmetic = solveArithmeticAndLogic(text, honorific);
  if (arithmetic) return arithmetic;

  return null;
}
