const VOICE_INSECURE = 'insecure'
const VOICE_UNSUPPORTED = 'unsupported'

const TAMIL_VOICE_LANGUAGE = 'ta-IN'
const ENGLISH_VOICE_LANGUAGE = 'en-US'

const VOICE_LANGUAGES = [
  TAMIL_VOICE_LANGUAGE,
  ENGLISH_VOICE_LANGUAGE,
]

/* =========================================================
   BASIC NORMALIZATION
========================================================= */

const normalizeBasicText = (text) => {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[.,!?;:"'`()\[\]{}]/g, ' ')
    .replace(/[-_/\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/* =========================================================
   TAMIL DETECTION
========================================================= */

const isTamilText = (text) => {
  return [...String(text || '')].some((character) => {
    const codePoint = character.codePointAt(0)

    return (
      codePoint >= 0x0b80 &&
      codePoint <= 0x0bff
    )
  })
}

/* =========================================================
   TAMIL -> ENGLISH TRANSLITERATION
========================================================= */

const transliterateTamil = (text) => {
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
    const next = text[i + 1]
    const cp = ch.codePointAt(0)

    if (consonantBase[ch]) {
      if (next && vowelSign[next]) {
        result += consonantBase[ch] + vowelSign[next]
        i += 2
      } else if (next === '்') {
        result += consonantBase[ch]
        i += 2
      } else {
        result += consonantBase[ch] + 'a'
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

/* Compatibility alias */
const transliterateToEnglish = transliterateTamil

/* =========================================================
   COMMON PRODUCT ALIASES
========================================================= */

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

/* =========================================================
   SPECIAL TAMIL PHONETIC
========================================================= */

const TAMIL_PHONETIC_VARIANTS = [
  'paal',
  'pal',
  'paul',
  'pall',
  'பால்',
  'பால்',
]

const mapTamilPhonetic = (text) => {
  const normalized = normalizeBasicText(text)

  const words = normalized
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)

  if (
    TAMIL_PHONETIC_VARIANTS.some(
      (variant) =>
        words.includes(variant) ||
        normalized === variant
    )
  ) {
    return 'பால்'
  }

  return null
}

/* =========================================================
   VOICE NORMALIZATION
========================================================= */

const normalizeVoiceText = (text) => {
  const basic = normalizeBasicText(text)

  if (!basic) return ''

  const directAlias =
    VOICE_PRODUCT_ALIASES[basic]

  if (directAlias) {
    return directAlias
  }

  if (isTamilText(basic)) {
    const tamilEnglish =
      normalizeBasicText(
        transliterateTamil(basic)
      )

    const alias =
      VOICE_PRODUCT_ALIASES[tamilEnglish]

    if (alias) {
      return alias
    }

    const tamilPhonetic =
      mapTamilPhonetic(basic)

    if (tamilPhonetic === 'பால்') {
      return 'milk'
    }

    return tamilEnglish
  }

  return basic
}

/* =========================================================
   PHONETIC KEY
========================================================= */

const getPhoneticKey = (text) => {
  let value = String(text || '')
    .toLowerCase()
    .trim()

  if (!value) return ''

  if (isTamilText(value)) {
    value = transliterateTamil(value)
  }

  value = value
    .replace(/ph/g, 'f')
    .replace(/gh/g, 'g')
    .replace(/ck/g, 'k')
    .replace(/qu/g, 'k')
    .replace(/x/g, 'ks')
    .replace(/z/g, 's')
    .replace(/c(?=[eiy])/g, 's')
    .replace(/c/g, 'k')
    .replace(/j/g, 'g')
    .replace(/w/g, 'v')
    .replace(/y/g, 'i')
    .replace(/aa/g, 'a')
    .replace(/ee/g, 'i')
    .replace(/ii/g, 'i')
    .replace(/oo/g, 'o')
    .replace(/uu/g, 'u')
    .replace(/[aeiou]+/g, 'a')
    .replace(/(.)\1+/g, '$1')
    .replace(/[^a-z0-9]/g, '')

  return value
}

/* =========================================================
   TEXT SIMILARITY
========================================================= */

const levenshteinDistance = (a, b) => {
  const first = String(a || '')
  const second = String(b || '')

  if (first === second) return 0
  if (!first.length) return second.length
  if (!second.length) return first.length

  const previous = Array.from(
    { length: second.length + 1 },
    (_, i) => i
  )

  for (let i = 1; i <= first.length; i++) {
    let current = [i]

    for (let j = 1; j <= second.length; j++) {
      const cost =
        first[i - 1] === second[j - 1]
          ? 0
          : 1

      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost
      )
    }

    for (let j = 0; j < current.length; j++) {
      previous[j] = current[j]
    }
  }

  return previous[second.length]
}

const stringSimilarity = (a, b) => {
  const first = normalizeBasicText(a)
  const second = normalizeBasicText(b)

  if (!first || !second) return 0
  if (first === second) return 1

  const distance =
    levenshteinDistance(first, second)

  return Math.max(
    0,
    1 -
      distance /
        Math.max(first.length, second.length)
  )
}

const wordSimilarity = (a, b) => {
  const firstWords =
    normalizeBasicText(a)
      .split(/\s+/)
      .filter(Boolean)

  const secondWords =
    normalizeBasicText(b)
      .split(/\s+/)
      .filter(Boolean)

  if (!firstWords.length || !secondWords.length) {
    return 0
  }

  let total = 0

  for (const first of firstWords) {
    let best = 0

    for (const second of secondWords) {
      best = Math.max(
        best,
        stringSimilarity(first, second)
      )
    }

    total += best
  }

  return total / firstWords.length
}

/* =========================================================
   PRODUCT VARIANTS
========================================================= */

const getTextVariants = (text) => {
  const original =
    normalizeBasicText(text)

  if (!original) return []

  const variants = new Set()

  variants.add(original)

  const voice =
    normalizeVoiceText(original)

  if (voice) {
    variants.add(voice)
  }

  if (isTamilText(original)) {
    variants.add(
      normalizeBasicText(
        transliterateTamil(original)
      )
    )
  }

  const phonetic =
    getPhoneticKey(original)

  if (phonetic) {
    variants.add(phonetic)
  }

  return [...variants].filter(Boolean)
}

const getProductAliases = (product) => {
  const values = [
    product?.productName,
    product?.name,
    product?.tamilName,
    product?.product_name,
    product?.title,
    product?.displayName,
    product?.display_name,
    product?.alias,
    product?.aliases,
  ]

  const flattened = []

  for (const value of values) {
    if (Array.isArray(value)) {
      flattened.push(...value)
    } else if (value) {
      flattened.push(value)
    }
  }

  return flattened
    .flatMap(getTextVariants)
    .filter(Boolean)
}

/* =========================================================
   PRODUCT MATCH SCORE
========================================================= */

const calculateProductMatchScore = (
  transcript,
  product
) => {
  const spoken =
    normalizeVoiceText(transcript)

  if (!spoken || !product) return 0

  const spokenBasic =
    normalizeBasicText(transcript)

  const spokenPhonetic =
    getPhoneticKey(spokenBasic)

  const names =
    getProductAliases(product)

  let bestScore = 0

  for (const name of names) {
    const normalizedName =
      normalizeVoiceText(name)

    if (!normalizedName) continue

    /* Exact */
    if (
      normalizedName === spoken ||
      name === spokenBasic
    ) {
      bestScore = Math.max(bestScore, 1)
      continue
    }

    /* Contains */
    if (
      normalizedName.includes(spoken) ||
      spoken.includes(normalizedName)
    ) {
      bestScore = Math.max(
        bestScore,
        0.92
      )
    }

    /* String similarity */
    bestScore = Math.max(
      bestScore,
      stringSimilarity(
        spoken,
        normalizedName
      ) * 0.85
    )

    /* Word similarity */
    bestScore = Math.max(
      bestScore,
      wordSimilarity(
        spoken,
        normalizedName
      ) * 0.82
    )

    /* Phonetic */
    const namePhonetic =
      getPhoneticKey(normalizedName)

    if (
      spokenPhonetic &&
      namePhonetic &&
      spokenPhonetic === namePhonetic
    ) {
      bestScore = Math.max(
        bestScore,
        0.94
      )
    }

    /* Phonetic similarity */
    if (
      spokenPhonetic &&
      namePhonetic
    ) {
      bestScore = Math.max(
        bestScore,
        stringSimilarity(
          spokenPhonetic,
          namePhonetic
        ) * 0.9
      )
    }
  }

  return bestScore
}

/* =========================================================
   BEST PRODUCT MATCH
========================================================= */

const findBestProductMatch = (
  transcript,
  products = []
) => {
  if (
    !transcript ||
    !Array.isArray(products) ||
    products.length === 0
  ) {
    return null
  }

  const scored = products
    .map((product) => ({
      product,
      score:
        calculateProductMatchScore(
          transcript,
          product
        ),
    }))
    .sort(
      (a, b) =>
        b.score - a.score
    )

  if (!scored.length) return null

  const best = scored[0]
  const second = scored[1]

  /*
   * Strong exact/phonetic match
   */
  if (best.score >= 0.94) {
    return best.product
  }

  /*
   * Fuzzy match only when clearly better
   */
  if (
    best.score >= 0.82 &&
    (!second ||
      best.score - second.score >= 0.08)
  ) {
    return best.product
  }

  return null
}

/* =========================================================
   DIRECT MATCH API
========================================================= */

const matchVoiceToProduct = (
  transcript,
  products = []
) => {
  return findBestProductMatch(
    transcript,
    products
  )
}

const isStrongProductMatch = (
  transcript,
  product
) => {
  return (
    calculateProductMatchScore(
      transcript,
      product
    ) >= 0.9
  )
}

/* =========================================================
   TRANSCRIPT NORMALIZATION
========================================================= */

const normalizeTranscriptList = (
  value
) => {
  if (Array.isArray(value)) {
    return value
      .flat(Infinity)
      .map((item) =>
        String(item || '').trim()
      )
      .filter(Boolean)
  }

  const text =
    String(value || '').trim()

  return text ? [text] : []
}

/* =========================================================
   VOICE LANGUAGES
========================================================= */

const getVoiceLanguages = (
  language
) => {
  if (language === 'ta') {
    return [
      TAMIL_VOICE_LANGUAGE,
      ENGLISH_VOICE_LANGUAGE,
    ]
  }

  return [
    ENGLISH_VOICE_LANGUAGE,
    TAMIL_VOICE_LANGUAGE,
  ]
}

/* =========================================================
   SPEECH RECOGNITION SUPPORT
========================================================= */

const getSpeechRecognition = () => {
  if (typeof window === 'undefined') {
    return {
      ctor: null,
      reason: VOICE_UNSUPPORTED,
    }
  }

  const secure =
    window.isSecureContext === true ||
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'

  if (!secure) {
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

/* =========================================================
   BILINGUAL RECOGNITION
========================================================= */

const createBilingualRecognition = (
  SpeechRecognitionCtor,
  handlers = {},
  languages = VOICE_LANGUAGES
) => {
  if (!SpeechRecognitionCtor) {
    return {
      recognitions: [],
      stop: () => {},
      abort: () => {},
    }
  }

  const language =
    Array.isArray(languages) &&
    languages.length
      ? languages[0]
      : TAMIL_VOICE_LANGUAGE

  const recognition =
    new SpeechRecognitionCtor()

  recognition.lang = language
  recognition.interimResults = false
  recognition.continuous = false
  recognition.maxAlternatives = 5

  let stopped = false
  let ended = false

  recognition.onresult = (event) => {
    if (stopped) return

    const transcripts = []

    for (
      let i = event.resultIndex;
      i < event.results.length;
      i++
    ) {
      const result =
        event.results[i]

      for (
        let j = 0;
        j < result.length;
        j++
      ) {
        const text =
          result[j]?.transcript?.trim()

        if (
          text &&
          !transcripts.includes(text)
        ) {
          transcripts.push(text)
        }
      }
    }

    if (
      transcripts.length &&
      handlers.onResult
    ) {
      handlers.onResult(
        transcripts,
        true
      )
    }
  }

  recognition.onerror = (event) => {
    if (stopped) return

    handlers.onError?.(event)
  }

  recognition.onend = () => {
    if (ended) return

    ended = true

    handlers.onEnd?.()
  }

  try {
    recognition.start()
  } catch (error) {
    handlers.onError?.({
      error: 'start-failed',
      message: error?.message || '',
    })
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

  const abort = () => {
    if (stopped) return

    stopped = true

    try {
      recognition.abort()
    } catch (_) {}
  }

  return {
    recognitions: [recognition],
    stop,
    abort,
  }
}

/* =========================================================
   RECOGNITION HELPERS
========================================================= */

const startRecognition = (
  language,
  handlers = {}
) => {
  const {
    ctor,
  } = getSpeechRecognition()

  if (!ctor) return null

  return createBilingualRecognition(
    ctor,
    handlers,
    [language]
  )
}

const stopRecognition = (
  instance
) => {
  try {
    instance?.stop?.()
  } catch (_) {}
}

const abortRecognition = (
  instance
) => {
  try {
    instance?.abort?.()
  } catch (_) {}
}

const getBestTranscript = (
  transcripts
) => {
  const list =
    normalizeTranscriptList(
      transcripts
    )

  return (
    list.sort(
      (a, b) =>
        b.length - a.length
    )[0] || ''
  )
}

/* =========================================================
   ERROR HELPERS
========================================================= */

const isRecoverableVoiceError = (
  error
) => {
  const code =
    typeof error === 'string'
      ? error
      : error?.error || ''

  return [
    'no-speech',
    'aborted',
    'audio-capture',
    'network',
  ].includes(code)
}

/* =========================================================
   COMPLETE VOICE PRODUCT RECOGNITION
========================================================= */

const recognizeProductByVoice = ({
  language = 'en',
  products = [],
  onMatch,
  onListening,
  onError,
  onEnd,
}) => {
  const {
    ctor,
  } = getSpeechRecognition()

  if (!ctor) {
    onError?.({
      error: VOICE_UNSUPPORTED,
    })

    return null
  }

  const languages =
    getVoiceLanguages(language)

  let index = 0
  let stopped = false
  let finished = false
  let session = null

  const finish = () => {
    if (finished) return

    finished = true
    onEnd?.()
  }

  const startNext = () => {
    if (
      stopped ||
      index >= languages.length
    ) {
      finish()
      return
    }

    const currentLanguage =
      languages[index]

    let endedHandled = false

    session =
      createBilingualRecognition(
        ctor,
        {
          onResult: (
            transcripts
          ) => {
            const list =
              normalizeTranscriptList(
                transcripts
              )

            for (const transcript of list) {
              const product =
                findBestProductMatch(
                  transcript,
                  products
                )

              if (product) {
                stopped = true

                onMatch?.(
                  product,
                  transcript
                )

                stopRecognition(
                  session
                )

                finish()

                return
              }
            }
          },

          onError: (event) => {
            if (stopped) return

            if (
              isRecoverableVoiceError(
                event
              )
            ) {
              if (endedHandled) return

              endedHandled = true
              index += 1
              startNext()
              return
            }

            onError?.(event)
          },

          onEnd: () => {
            if (stopped) return
            if (endedHandled) return

            endedHandled = true
            index += 1

            if (
              index <
              languages.length
            ) {
              startNext()
            } else {
              finish()
            }
          },
        },
        [currentLanguage]
      )

    onListening?.(
      currentLanguage
    )
  }

  startNext()

  return {
    stop: () => {
      stopped = true
      stopRecognition(session)
      finish()
    },

    abort: () => {
      stopped = true
      abortRecognition(session)
      finish()
    },
  }
}

/* =========================================================
   EXPORTS
========================================================= */

export {
  VOICE_INSECURE,
  VOICE_UNSUPPORTED,

  TAMIL_VOICE_LANGUAGE,
  ENGLISH_VOICE_LANGUAGE,
  VOICE_LANGUAGES,

  VOICE_PRODUCT_ALIASES,

  normalizeBasicText,
  normalizeVoiceText,

  isTamilText,

  transliterateTamil,
  transliterateToEnglish,

  mapTamilPhonetic,
  getPhoneticKey,

  levenshteinDistance,
  stringSimilarity,
  wordSimilarity,

  getTextVariants,
  getProductAliases,

  calculateProductMatchScore,
  findBestProductMatch,
  matchVoiceToProduct,

  normalizeTranscriptList,
  getVoiceLanguages,

  getSpeechRecognition,
  createBilingualRecognition,

  startRecognition,
  stopRecognition,
  abortRecognition,

  getBestTranscript,

  isRecoverableVoiceError,
  isStrongProductMatch,

  recognizeProductByVoice,
}

export default getSpeechRecognition