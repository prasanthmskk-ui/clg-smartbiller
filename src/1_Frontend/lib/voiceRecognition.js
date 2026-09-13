const VOICE_INSECURE = 'insecure'
const VOICE_UNSUPPORTED = 'unsupported'

const TAMIL_VOICE_LANGUAGE = 'ta-IN'
const ENGLISH_VOICE_LANGUAGE = 'en-US'
const VOICE_LANGUAGES = [
  TAMIL_VOICE_LANGUAGE,
  ENGLISH_VOICE_LANGUAGE,
]

const VOICE_PRODUCT_ALIASES = {
  'பால்': 'milk',
  'மில்க்': 'milk',
  milk: 'milk',
  paal: 'milk',
  pal: 'milk',
  paul: 'milk',
  pall: 'milk',

  'அரிசி': 'rice',
  arisi: 'rice',

  'சர்க்கரை': 'sugar',
  sakkarai: 'sugar',

  'உப்பு': 'salt',
  uppu: 'salt',

  'எண்ணெய்': 'oil',
  ennai: 'oil',

  'தேநீர்': 'tea',
  theneer: 'tea',

  'காபி': 'coffee',
  kaapi: 'coffee',

  'ரொட்டி': 'bread',
  rotti: 'bread',
}

const TAMIL_PHONETIC_VARIANTS = [
  'paal',
  'pal',
  'paul',
  'pall',
  'பால்',
]

const mapTamilPhonetic = (text) => {
  const normalized = String(text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')

  const words = normalized
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)

  return TAMIL_PHONETIC_VARIANTS.some(
    (variant) =>
      words.includes(variant) ||
      normalized === variant
  )
    ? 'பால்'
    : null
}

const isTamilText = (text) =>
  [...String(text || '')].some((character) => {
    const codePoint = character.codePointAt(0)

    return (
      codePoint >= 0x0b80 &&
      codePoint <= 0x0bff
    )
  })

const transliterateToEnglish = (text) => {
  if (!text) return ''

  const consonantBase = {
    'க': 'k',
    'ங': 'ng',
    'ச': 'ch',
    'ஜ': 'j',
    'ஞ': 'nj',
    'ட': 't',
    'ண': 'n',
    'த': 'th',
    'ந': 'n',
    'ப': 'p',
    'ம': 'm',
    'ய': 'y',
    'ர': 'r',
    'ல': 'l',
    'வ': 'v',
    'ழ': 'zh',
    'ள': 'l',
    'ற': 'tr',
    'ன': 'n',
  }

  const vowelSign = {
    'ா': 'aa',
    'ி': 'i',
    'ீ': 'ii',
    'ு': 'u',
    'ூ': 'uu',
    'ெ': 'e',
    'ே': 'ee',
    'ை': 'ai',
    'ொ': 'o',
    'ோ': 'oo',
    'ௌ': 'au',
  }

  const independentVowel = {
    'அ': 'a',
    'ஆ': 'aa',
    'இ': 'i',
    'ஈ': 'ii',
    'உ': 'u',
    'ஊ': 'uu',
    'எ': 'e',
    'ஏ': 'ee',
    'ஐ': 'ai',
    'ஒ': 'o',
    'ஓ': 'oo',
    'ஔ': 'au',
  }

  const digitMap = {
    '௦': '0',
    '௧': '1',
    '௨': '2',
    '௩': '3',
    '௪': '4',
    '௫': '5',
    '௬': '6',
    '௭': '7',
    '௮': '8',
    '௯': '9',
  }

  let result = ''
  let i = 0

  while (i < text.length) {
    const ch = text[i]
    const cp = ch.codePointAt(0)

    if (cp >= 0x0b95 && cp <= 0x0bb9) {
      const next = text[i + 1]

      if (next && vowelSign[next]) {
        result +=
          (consonantBase[ch] || ch) +
          vowelSign[next]

        i += 2
      } else if (next === '்') {
        result += consonantBase[ch] || ch
        i += 2
      } else {
        result +=
          (consonantBase[ch] || ch) + 'a'

        i += 1
      }
    } else if (independentVowel[ch]) {
      result += independentVowel[ch]
      i += 1
    } else if (vowelSign[ch]) {
      result += vowelSign[ch]
      i += 1
    } else if (ch === '்') {
      i += 1
    } else if (digitMap[ch]) {
      result += digitMap[ch]
      i += 1
    } else {
      result += ch
      i += 1
    }
  }

  return result
}

const getVoiceLanguages = (language) => {
  const preferredLanguage =
    language === 'ta'
      ? TAMIL_VOICE_LANGUAGE
      : ENGLISH_VOICE_LANGUAGE

  const fallbackLanguage =
    preferredLanguage === TAMIL_VOICE_LANGUAGE
      ? ENGLISH_VOICE_LANGUAGE
      : TAMIL_VOICE_LANGUAGE

  return [
    preferredLanguage,
    fallbackLanguage,
  ]
}

const normalizeVoiceText = (text) => {
  const cleaned = String(text || '')
    .replace(/[.,!?;:"'`()\[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned) return ''

  const lowerCleaned = cleaned.toLowerCase()

  const alias =
    VOICE_PRODUCT_ALIASES[lowerCleaned]

  if (alias) return alias

  const normalizedText = isTamilText(cleaned)
    ? transliterateToEnglish(cleaned)
        .replace(/\s+/g, ' ')
        .trim()
    : lowerCleaned

  return (
    VOICE_PRODUCT_ALIASES[normalizedText] ||
    normalizedText
  )
}

const getSpeechRecognition = () => {
  if (typeof window === 'undefined') {
    return {
      ctor: null,
      reason: VOICE_UNSUPPORTED,
    }
  }

  const isSecureContext =
    window.isSecureContext === true ||
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'

  if (!isSecureContext) {
    return {
      ctor: null,
      reason: VOICE_INSECURE,
    }
  }

  const Ctor =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition ||
    null

  if (!Ctor) {
    return {
      ctor: null,
      reason: VOICE_UNSUPPORTED,
    }
  }

  return {
    ctor: Ctor,
    reason: null,
  }
}

/*
 * MOBILE OPTIMIZED
 *
 * Only ONE SpeechRecognition instance runs.
 * Previous version started Tamil + English simultaneously,
 * which can make mobile speech recognition slower.
 */
const createBilingualRecognition = (
  SpeechRecognitionCtor,
  handlers,
  languages
) => {
  if (!SpeechRecognitionCtor) {
    return {
      recognitions: [],
      stop: () => {},
    }
  }

  const langList =
    Array.isArray(languages) &&
    languages.length > 0
      ? languages
      : VOICE_LANGUAGES

  const primaryLanguage =
    langList[0] || TAMIL_VOICE_LANGUAGE

  const recognition =
    new SpeechRecognitionCtor()

  recognition.lang = primaryLanguage

  // Mobile performance optimization
  recognition.interimResults = false
  recognition.continuous = false
  recognition.maxAlternatives = 1

  let stopped = false
  let ended = false

  recognition.onresult = (event) => {
    if (stopped) return

    let transcript = ''

    for (
      let i = event.resultIndex;
      i < event.results.length;
      i++
    ) {
      transcript +=
        event.results[i][0].transcript
    }

    const text = transcript.trim()

    if (
      text &&
      handlers?.onResult
    ) {
      handlers.onResult(text, true)
    }
  }

  recognition.onerror = (event) => {
    if (stopped) return

    if (handlers?.onError) {
      handlers.onError(event)
    }
  }

  recognition.onend = () => {
    if (ended) return

    ended = true

    if (handlers?.onEnd) {
      handlers.onEnd()
    }
  }

  try {
    recognition.start()
  } catch (_) {
    if (handlers?.onError) {
      handlers.onError({
        error: 'start-failed',
      })
    }
  }

  const stop = () => {
    if (stopped) return

    stopped = true

    try {
      recognition.stop()
    } catch (_) {}

    try {
      recognition.abort()
    } catch (_) {}
  }

  return {
    recognitions: [recognition],
    stop,
  }
}

export {
  VOICE_INSECURE,
  VOICE_UNSUPPORTED,
  TAMIL_VOICE_LANGUAGE,
  ENGLISH_VOICE_LANGUAGE,
  VOICE_LANGUAGES,
  mapTamilPhonetic,
  isTamilText,
  transliterateToEnglish,
  normalizeVoiceText,
  getVoiceLanguages,
  getSpeechRecognition,
  createBilingualRecognition,
}

export default getSpeechRecognition