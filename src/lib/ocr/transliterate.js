// Local, offline English -> Tamil transliteration (rule-based). Used as the
// offline fallback when the network translation service is unavailable.

const englishToTamilMap = {
  a: 'அ', aa: 'ஆ', i: 'இ', ii: 'ஈ', u: 'உ', uu: 'ஊ',
  e: 'எ', ee: 'ஏ', ai: 'ஐ', o: 'ஒ', oo: 'ஓ', au: 'ஔ',
  ka: 'கா', ki: 'கி', ku: 'கு', ke: 'கே', ko: 'கோ',
  ga: 'கா', gi: 'கி', gu: 'கு', ge: 'கே', go: 'கோ',
  cha: 'சா', chi: 'சி', chu: 'சு', che: 'சே', cho: 'சோ',
  ja: 'ஜா', ji: 'ஜி', ju: 'ஜு', je: 'ஜே', jo: 'ஜோ',
  ta: 'டா', ti: 'டி', tu: 'டு', te: 'டே', to: 'டோ',
  da: 'டா', di: 'டி', du: 'டு', de: 'டே', do: 'டோ',
  tha: 'தா', thi: 'தி', thu: 'து', the: 'தே', tho: 'தோ',
  dha: 'தா', dhi: 'தி', dhu: 'து', dhe: 'தே', dho: 'தோ',
  na: 'ணா', ni: 'ணி', nu: 'ணு', ne: 'ணே', no: 'ணோ',
  ma: 'மா', mi: 'மி', mu: 'மு', me: 'மே', mo: 'மோ',
  nya: 'ஞ்ஞா',
  pa: 'பா', pi: 'பி', pu: 'பு', pe: 'பே', po: 'போ',
  ba: 'பா', bi: 'பி', bu: 'பு', be: 'பே', bo: 'போ',
  pha: 'பா', phi: 'பி', phu: 'பு', phe: 'பே', pho: 'போ',
  va: 'வா', vi: 'வி', vu: 'வு', ve: 'வே', vo: 'வோ',
  ya: 'யா', yi: 'யி', yu: 'யு', ye: 'யே', yo: 'யோ',
  ra: 'ரா', ri: 'ரி', ru: 'ரு', re: 'ரே', ro: 'ரோ',
  la: 'லா', li: 'லி', lu: 'லு', le: 'லே', lo: 'லோ',
  sha: 'சா', shi: 'சி', shu: 'சு', she: 'சே', sho: 'சோ',
  sa: 'சா', si: 'சி', su: 'சு', se: 'சே', so: 'சோ',
  ha: 'ஹா', hi: 'ஹி', hu: 'ஹு', he: 'ஹே', ho: 'ஹோ',
   ksh: 'க்ஷ', tra: 'த்ர', dra: 'த்ர', pra: 'ப்ர', bra: 'ப்ர', shra: 'ஶ்ர',
  k: 'க்', g: 'க்', c: 'ச்', ch: 'ச்', j: 'ஜ்',
  t: 'ட்', d: 'ட்', th: 'த்', dh: 'த்', n: 'ண்',
  p: 'ப்', b: 'ப்', ph: 'ப்', v: 'வ்', m: 'ம்',
  y: 'ய்', r: 'ர்', l: 'ல்', s: 'ச்', h: 'ஹ்',
  w: 'வ்', q: 'க்', x: 'க்ஸ்', z: 'ஸ்',
}

const commonTamilTranslations = {
  pazhanivel: 'பழனிவேல்',
  'pazhani vel': 'பழனிவேல்',
  milk: 'பால்',
  rice: 'அரிசி',
  sugar: 'சர்க்கரை',
  salt: 'உப்பு',
  oil: 'எண்ணெய்',
  dal: 'பருப்பு',
  wheat: 'கோதுமை',
  tea: 'தேநீர்',
  coffee: 'காபி',
  water: 'நீர்',
  biscuit: 'பிஸ்கட்',
  bread: 'ரொட்டி',
  egg: 'முட்டை',
  chicken: 'கோழி',
  apple: 'ஆப்பிள்',
  banana: 'வாழை',
  mango: 'மாம்பழம்',
  orange: 'ஆரஞ்சு',
  soap: 'சோப்பு',
  shampoo: 'ஷாம்பு',
}

export function transliterateToTamil(englishText) {
  if (!englishText) return ''
  const text = englishText.toLowerCase().trim()
  if (commonTamilTranslations[text]) return commonTamilTranslations[text]
  let result = ''
  let i = 0
  while (i < text.length) {
    let matched = false
    for (let len = Math.min(4, text.length - i); len >= 1; len--) {
      const substr = text.substring(i, i + len)
      if (englishToTamilMap[substr]) {
        result += englishToTamilMap[substr]
        i += len
        matched = true
        break
      }
    }
    if (!matched) {
      i += 1
    }
  }
  return result.replace(/\s+/g, ' ').trim()
}
