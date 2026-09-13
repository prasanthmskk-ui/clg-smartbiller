// English / Tanglish -> Tamil transliteration
// Used for product names in the billing application.

const commonTamilTranslations = {
  // Food products
  arisi: 'அரிசி',
  rice: 'அரிசி',
  pacharisi: 'பச்சரிசி',
  ponni: 'பொன்னி',
  sakkarai: 'சர்க்கரை',
  sugar: 'சர்க்கரை',
  uppu: 'உப்பு',
  salt: 'உப்பு',
  ennai: 'எண்ணெய்',
  oil: 'எண்ணெய்',
  paal: 'பால்',
  pal: 'பால்',
  milk: 'பால்',
  thayir: 'தயிர்',
  curd: 'தயிர்',
  paruppu: 'பருப்பு',
  dal: 'பருப்பு',
  payaru: 'பயறு',
  kadalai: 'கடலை',
  ulundhu: 'உளுந்து',
  thuvaramparuppu: 'துவரம் பருப்பு',
  kadalaiparuppu: 'கடலைப் பருப்பு',
  paasiparuppu: 'பாசிப்பருப்பு',
  wheat: 'கோதுமை',
  gothumai: 'கோதுமை',

  // Drinks
  tea: 'தேநீர்',
  theneer: 'தேநீர்',
  coffee: 'காபி',
  kaapi: 'காபி',
  water: 'தண்ணீர்',

  // Grocery
  bread: 'ரொட்டி',
  rotti: 'ரொட்டி',
  biscuit: 'பிஸ்கட்',
  bisket: 'பிஸ்கட்',
  egg: 'முட்டை',
  muttai: 'முட்டை',
  chicken: 'சிக்கன்',
  fish: 'மீன்',

  // Fruits
  apple: 'ஆப்பிள்',
  aappil: 'ஆப்பிள்',
  banana: 'வாழைப்பழம்',
  vaazhaipazham: 'வாழைப்பழம்',
  mango: 'மாம்பழம்',
  maampazham: 'மாம்பழம்',
  orange: 'ஆரஞ்சு',
  grapes: 'திராட்சை',
  thiraatchai: 'திராட்சை',

  // Household products
  soap: 'சோப்பு',
  shampoo: 'ஷாம்பு',
  paste: 'பற்பசை',
  toothpaste: 'பற்பசை',

  // Names / common words
  pazhani: 'பழனி',
  palani: 'பழனி',
  pazhani: 'பழனி',
  pazhni: 'பழனி',
  pazhanivel: 'பழனிவேல்',
  'pazhani vel': 'பழனிவேல்',

  prasanth: 'பிரசாந்த்',
  prashanth: 'பிரசாந்த்',
  karthik: 'கார்த்திக்',
  karthick: 'கார்த்திக்',
  arun: 'அருண்',
  aravind: 'அரவிந்த்',
  aravindh: 'அரவிந்த்',
  surya: 'சூர்யா',
  suriya: 'சூர்யா',
  vijay: 'விஜய்',
  ajith: 'அஜித்',
  kumar: 'குமார்',
  raja: 'ராஜா',
  raj: 'ராஜ்',
};


// ---------------------------------------------
// Basic syllable conversion
// ---------------------------------------------

const syllables = {
  // vowels
  aa: 'ஆ',
  ai: 'ஐ',
  au: 'ஔ',
  ee: 'ஏ',
  ii: 'ஈ',
  oo: 'ஓ',
  uu: 'ஊ',

  a: 'அ',
  i: 'இ',
  u: 'உ',
  e: 'எ',
  o: 'ஒ',

  // consonant + vowel
  kaa: 'கா',
  ki: 'கி',
  kee: 'கே',
  ku: 'கு',
  koo: 'கோ',
  ke: 'கெ',
  ko: 'கொ',

  kaa2: 'கா',

  cha: 'ச',
  chaa: 'சா',
  chi: 'சி',
  che: 'செ',
  chee: 'சே',
  chu: 'சு',
  cho: 'சொ',
  choo: 'சோ',

  ja: 'ஜ',
  jaa: 'ஜா',
  ji: 'ஜி',
  je: 'ஜெ',
  jee: 'ஜே',
  ju: 'ஜு',
  jo: 'ஜொ',
  joo: 'ஜோ',

  ta: 'த',
  taa: 'தா',
  ti: 'தி',
  tee: 'தே',
  tu: 'து',
  te: 'தெ',
  to: 'தொ',
  too: 'தோ',

  da: 'த',
  daa: 'தா',
  di: 'தி',
  dee: 'தே',
  du: 'து',
  de: 'தெ',
  do: 'தொ',
  doo: 'தோ',

  tha: 'த',
  thaa: 'தா',
  thi: 'தி',
  thee: 'தே',
  thu: 'து',
  the: 'தெ',
  tho: 'தொ',
  thoo: 'தோ',

  na: 'ந',
  naa: 'நா',
  ni: 'நி',
  nee: 'நே',
  nu: 'நு',
  ne: 'நெ',
  no: 'நொ',
  noo: 'நோ',

  ma: 'ம',
  maa: 'மா',
  mi: 'மி',
  mee: 'மே',
  mu: 'மு',
  me: 'மெ',
  mo: 'மொ',
  moo: 'மோ',

  pa: 'ப',
  paa: 'பா',
  pi: 'பி',
  pee: 'பே',
  pu: 'பு',
  pe: 'பெ',
  po: 'பொ',
  poo: 'போ',

  ba: 'ப',
  baa: 'பா',
  bi: 'பி',
  bee: 'பே',
  bu: 'பு',
  be: 'பெ',
  bo: 'பொ',
  boo: 'போ',

  va: 'வ',
  vaa: 'வா',
  vi: 'வி',
  vee: 'வே',
  vu: 'வு',
  ve: 'வெ',
  vo: 'வொ',
  voo: 'வோ',

  ya: 'ய',
  yaa: 'யா',
  yi: 'யி',
  yee: 'யே',
  yu: 'யு',
  ye: 'யெ',
  yo: 'யொ',
  yoo: 'யோ',

  ra: 'ர',
  raa: 'ரா',
  ri: 'ரி',
  ree: 'ரே',
  ru: 'ரு',
  re: 'ரெ',
  ro: 'ரொ',
  roo: 'ரோ',

  la: 'ல',
  laa: 'லா',
  li: 'லி',
  lee: 'லே',
  lu: 'லு',
  le: 'லெ',
  lo: 'லொ',
  loo: 'லோ',

  sha: 'ஷ',
  shaa: 'ஷா',
  shi: 'ஷி',
  she: 'ஷெ',
  shee: 'ஷே',
  shu: 'ஷு',
  sho: 'ஷொ',
  shoo: 'ஷோ',

  sa: 'ச',
  saa: 'சா',
  si: 'சி',
  see: 'சே',
  su: 'சு',
  se: 'செ',
  so: 'சொ',
  soo: 'சோ',

  ha: 'ஹ',
  haa: 'ஹா',
  hi: 'ஹி',
  hee: 'ஹே',
  hu: 'ஹு',
  he: 'ஹெ',
  ho: 'ஹொ',
  hoo: 'ஹோ',

  // special sounds
  ksha: 'க்ஷ',
  shri: 'ஸ்ரீ',
  sri: 'ஸ்ரீ',
  pra: 'பிர',
  tra: 'த்ர',
  bra: 'ப்ர',
};


// ---------------------------------------------
// Common phonetic corrections
// ---------------------------------------------

const phoneticCorrections = [
  ['pazhani', 'பழனி'],
  ['palani', 'பழனி'],
  ['pazani', 'பழனி'],
  ['pazhni', 'பழனி'],

  ['pazhanivel', 'பழனிவேல்'],

  ['arisi', 'அரிசி'],
  ['sakkarai', 'சர்க்கரை'],
  ['uppu', 'உப்பு'],
  ['ennai', 'எண்ணெய்'],
  ['paal', 'பால்'],
  ['thanneer', 'தண்ணீர்'],
  ['thayir', 'தயிர்'],
  ['paruppu', 'பருப்பு'],
  ['ulundhu', 'உளுந்து'],
  ['payaru', 'பயறு'],
];


// ---------------------------------------------
// Normalize
// ---------------------------------------------

function normalizeText(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}


// ---------------------------------------------
// Transliterate one word
// ---------------------------------------------

function transliterateWord(word) {
  const normalized = normalizeText(word);

  if (!normalized) {
    return '';
  }

  // Exact product/name dictionary
  if (commonTamilTranslations[normalized]) {
    return commonTamilTranslations[normalized];
  }

  // Phonetic corrections
  for (const [english, tamil] of phoneticCorrections) {
    if (normalized === english) {
      return tamil;
    }
  }

  /*
   * Convert longer syllables first.
   * This prevents:
   *
   * pa + z + ha + ni
   *
   * from producing bad output.
   */

  let result = '';
  let i = 0;

  const patterns = [
    'shri',
    'ksha',
    'thoo',
    'thee',
    'thaa',
    'thi',
    'thu',
    'the',
    'tho',
    'chaa',
    'chee',
    'chi',
    'chu',
    'che',
    'cho',
    'shaa',
    'shee',
    'shi',
    'shu',
    'she',
    'sho',
    'aa',
    'ee',
    'ii',
    'oo',
    'uu',
    'ai',
    'au',
    'kaa',
    'ki',
    'kee',
    'ku',
    'ke',
    'ko',
    'ma',
    'maa',
    'mi',
    'mee',
    'mu',
    'me',
    'mo',
    'pa',
    'paa',
    'pi',
    'pee',
    'pu',
    'pe',
    'po',
    'ra',
    'raa',
    'ri',
    'ree',
    'ru',
    're',
    'ro',
    'la',
    'laa',
    'li',
    'lee',
    'lu',
    'le',
    'lo',
    'va',
    'vaa',
    'vi',
    'vee',
    'vu',
    've',
    'vo',
    'ya',
    'yaa',
    'yi',
    'yee',
    'yu',
    'ye',
    'yo',
    'na',
    'naa',
    'ni',
    'nee',
    'nu',
    'ne',
    'no',
    'ta',
    'taa',
    'ti',
    'tee',
    'tu',
    'te',
    'to',
    'ja',
    'jaa',
    'ji',
    'jee',
    'ju',
    'je',
    'jo',
    'ha',
    'haa',
    'hi',
    'hee',
    'hu',
    'he',
    'ho',
    'sa',
    'saa',
    'si',
    'see',
    'su',
    'se',
    'so',
    'a',
    'i',
    'u',
    'e',
    'o',
  ];

  while (i < normalized.length) {
    let matched = false;

    for (const pattern of patterns) {
      if (
        normalized.startsWith(pattern, i) &&
        syllables[pattern]
      ) {
        result += syllables[pattern];
        i += pattern.length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      i += 1;
    }
  }

  return result;
}


// ---------------------------------------------
// Main function
// ---------------------------------------------

export function transliterateToTamil(englishText) {
  if (!englishText) {
    return '';
  }

  const text = normalizeText(englishText);

  if (!text) {
    return '';
  }

  // Exact full sentence/product name
  if (commonTamilTranslations[text]) {
    return commonTamilTranslations[text];
  }

  // Multiple words
  const words = text.split(' ');

  const converted = words
    .map((word) => transliterateWord(word))
    .filter(Boolean);

  return converted.join(' ').trim();
}