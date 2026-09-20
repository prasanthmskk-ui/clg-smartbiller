import React from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import FloatingActions from '../components/FloatingActions'
import AddedItems from '../components/AddedItems'
import SummaryPanel from '../components/SummaryPanel'
import CustomerDetailsModal from '../components/CustomerDetailsModal'
import { useLanguage } from '../i18n'
import {
  createBilingualRecognition,
  getSpeechRecognition,
  getVoiceLanguages,
  normalizeVoiceText,
  normalizeBasicText,
  getPhoneticKey,
  transliterateTamil,
  VOICE_UNSUPPORTED,
  VOICE_INSECURE,
  ENGLISH_VOICE_LANGUAGE,
} from '../lib/voiceRecognition'
import { transliterateToTamil } from '../../lib/ocr/transliterate'
import { apiFetch } from '../utils/api'
import { addOrIncrementCart } from '../utils/cart'

const BarcodeScanner = React.lazy(() => import('../components/BarcodeScanner'))
const PrintableInvoice = React.lazy(() => import('../components/PrintableInvoice'))

const STORAGE_KEY = 'smartbiller_products'
const SAVED_RECEIPTS_KEY = 'saved_receipts'

const loadSavedProducts = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)

    if (stored) {
      const parsed = JSON.parse(stored)

      if (Array.isArray(parsed)) {
        return parsed
      }
    }
  } catch (e) {
    console.error(
      'Failed to load products from LocalStorage:',
      e
    )
  }

  return []
}

/* =========================================================
 * VOICE MATCHING HELPERS
 * ========================================================= */

const levenshteinDistance = (a, b) => {
  const first = String(a || '')
  const second = String(b || '')

  if (first === second) {
    return 0
  }

  if (!first.length) {
    return second.length
  }

  if (!second.length) {
    return first.length
  }

  const previous = Array(second.length + 1)

  for (let j = 0; j <= second.length; j++) {
    previous[j] = j
  }

  for (let i = 1; i <= first.length; i++) {
    const current = [i]

    for (let j = 1; j <= second.length; j++) {
      const insertCost = current[j - 1] + 1
      const deleteCost = previous[j] + 1
      const replaceCost =
        previous[j - 1] +
        (first[i - 1] === second[j - 1] ? 0 : 1)

      current[j] = Math.min(
        insertCost,
        deleteCost,
        replaceCost
      )
    }

    for (let j = 0; j <= second.length; j++) {
      previous[j] = current[j]
    }
  }

  return previous[second.length]
}

const stringSimilarity = (a, b) => {
  const first = normalizeBasicText(a)
  const second = normalizeBasicText(b)

  if (!first || !second) {
    return 0
  }

  if (first === second) {
    return 1
  }

  const maxLength = Math.max(
    first.length,
    second.length
  )

  if (!maxLength) {
    return 1
  }

  const distance = levenshteinDistance(
    first,
    second
  )

  return Math.max(
    0,
    1 - distance / maxLength
  )
}

const getProductNames = (product) => {
  if (!product) {
    return []
  }

  return [
    product.productName,
    product.name,
    product.tamilName,
    product.tamil_name,
    product.product_name,
    product.title,
    product.displayName,
    product.display_name,
  ]
    .map((value) =>
      String(value || '').trim()
    )
    .filter(Boolean)
}

const getVoiceVariants = (value) => {
  const original = String(value || '').trim()

  if (!original) {
    return []
  }

  const variants = new Set()

  const basic = normalizeBasicText(
    original
  )

  if (basic) {
    variants.add(basic)
  }

  const normalized = normalizeVoiceText(
    original
  )

  if (normalized) {
    variants.add(
      normalizeBasicText(normalized)
    )
  }

  if (
    /[\u0B80-\u0BFF]/.test(original)
  ) {
    const tamilLatin =
      transliterateTamil(original)

    if (tamilLatin) {
      variants.add(
        normalizeBasicText(tamilLatin)
      )
    }
  }

  return [...variants].filter(Boolean)
}

const getWordSimilarity = (spoken, product) => {
  const spokenText = normalizeBasicText(
    spoken
  )

  const productText = normalizeBasicText(
    product
  )

  if (!spokenText || !productText) {
    return 0
  }

  if (spokenText === productText) {
    return 1
  }

  const spokenWords =
    spokenText.split(' ').filter(Boolean)

  const productWords =
    productText.split(' ').filter(Boolean)

  if (
    !spokenWords.length ||
    !productWords.length
  ) {
    return 0
  }

  let total = 0
  let matchedWords = 0

  for (const spokenWord of spokenWords) {
    let best = 0

    for (const productWord of productWords) {
      const similarity =
        stringSimilarity(
          spokenWord,
          productWord
        )

      if (similarity > best) {
        best = similarity
      }

      const spokenPhonetic =
        getPhoneticKey(spokenWord)

      const productPhonetic =
        getPhoneticKey(productWord)

      if (
        spokenPhonetic &&
        productPhonetic
      ) {
        const phoneticSimilarity =
          stringSimilarity(
            spokenPhonetic,
            productPhonetic
          )

        if (
          phoneticSimilarity >
          best
        ) {
          best =
            phoneticSimilarity
        }
      }
    }

    /*
     * A word is considered matched when
     * it is reasonably close phonetically
     * or textually.
     */
    if (best >= 0.55) {
      matchedWords += 1
      total += best
    }
  }

  if (!spokenWords.length) {
    return 0
  }

  /*
   * Give importance to how many spoken words
   * were actually matched.
   */
  const coverage =
    matchedWords /
    spokenWords.length

  const average =
    total /
    spokenWords.length

  return (
    average * 0.65 +
    coverage * 0.35
  )
}

const getPhoneticSimilarity = (a, b) => {
  const first =
    getPhoneticKey(a)

  const second =
    getPhoneticKey(b)

  if (!first || !second) {
    return 0
  }

  if (first === second) {
    return 1
  }

  return stringSimilarity(
    first,
    second
  )
}

/* =========================================================
 * PRODUCT MATCHING
 * ========================================================= */

const calculateProductMatchScore = (
  transcript,
  product
) => {
  const spokenVariants =
    getVoiceVariants(transcript)

  const productNames =
    getProductNames(product)

  if (
    !spokenVariants.length ||
    !productNames.length
  ) {
    return 0
  }

  let bestScore = 0

  for (const spoken of spokenVariants) {
    for (const productName of productNames) {
      const productVariants =
        getVoiceVariants(productName)

      for (const productVariant of productVariants) {
        /*
         * Exact match
         */
        if (
          spoken === productVariant
        ) {
          return 1
        }

        /*
         * Spoken phrase contained in product name.
         *
         * Example:
         * "bourbon" -> "bourbon biscuit"
         */
        if (
          productVariant.includes(
            spoken
          )
        ) {
          const ratio =
            spoken.length /
            productVariant.length

          if (ratio >= 0.35) {
            bestScore = Math.max(
              bestScore,
              0.84 + ratio * 0.10
            )
          }
        }

        /*
         * Product name contained in speech.
         *
         * Example:
         * "give me bourbon biscuit"
         */
        if (
          spoken.includes(
            productVariant
          )
        ) {
          const ratio =
            productVariant.length /
            spoken.length

          if (ratio >= 0.35) {
            bestScore = Math.max(
              bestScore,
              0.82 + ratio * 0.10
            )
          }
        }

        /*
         * Normal text similarity.
         */
        const textScore =
          stringSimilarity(
            spoken,
            productVariant
          )

        bestScore = Math.max(
          bestScore,
          textScore * 0.80
        )

        /*
         * Word-level matching.
         */
        const wordScore =
          getWordSimilarity(
            spoken,
            productVariant
          )

        bestScore = Math.max(
          bestScore,
          wordScore * 0.92
        )

        /*
         * Phonetic matching.
         *
         * This helps:
         * bourbon / burbon
         * cinthol / sinthol
         * biscuit / biskit
         * etc.
         */
        const phoneticScore =
          getPhoneticSimilarity(
            spoken,
            productVariant
          )

        bestScore = Math.max(
          bestScore,
          phoneticScore * 0.90
        )
      }
    }
  }

  return Math.min(
    1,
    bestScore
  )
}

const findBestProductMatch = (
  transcript,
  products
) => {
  const spoken = String(
    transcript || ''
  ).trim()

  if (
    !spoken ||
    !Array.isArray(products) ||
    !products.length
  ) {
    return null
  }

  /*
   * Ignore very short meaningless speech.
   */
  const normalizedSpoken =
    normalizeBasicText(spoken)

  if (
    !normalizedSpoken ||
    normalizedSpoken.length < 2
  ) {
    return null
  }

  const candidates = products
    .map((product, index) => ({
      product,
      index,
      score:
        calculateProductMatchScore(
          spoken,
          product
        ),
    }))
    .filter(
      (item) => item.score > 0
    )
    .sort(
      (a, b) =>
        b.score - a.score
    )

  if (!candidates.length) {
    return null
  }

  const best =
    candidates[0]

  const second =
    candidates[1]

  /*
   * Very strong match.
   */
  if (best.score >= 0.88) {
    return best.product
  }

  /*
   * Good match only when it has enough
   * separation from the second product.
   *
   * This prevents:
   *
   * Milk
   * Dairy Milk
   *
   * from randomly selecting the wrong one.
   */
  if (
    best.score >= 0.70 &&
    (
      !second ||
      best.score -
        second.score >=
        0.08
    )
  ) {
    return best.product
  }

  /*
   * Medium score:
   * require a stronger gap.
   */
  if (
    best.score >= 0.62 &&
    (
      !second ||
      best.score -
        second.score >=
        0.15
    )
  ) {
    return best.product
  }

  return null
}

/* =========================================================
 * COMPONENT
 * ========================================================= */

export default function NewReceipt({
  cart,
  setCart,
  savedItems,
}) {
  const navigate = useNavigate()

  const [settingsOpen, setSettingsOpen] =
    React.useState(false)

  const [showScanner, setShowScanner] =
    React.useState(false)

  const [scanError, setScanError] =
    React.useState('')

  const [isModalOpen, setIsModalOpen] =
    React.useState(false)

  const [toast, setToast] =
    React.useState('')

  const [isListening, setIsListening] =
    React.useState(false)

  const recognitionRef =
    React.useRef(null)

  const isProcessingVoiceRef =
    React.useRef(false)

  const voiceAttemptRef =
    React.useRef(0)

  const voiceMatchedRef =
    React.useRef(false)

  const toastTimeoutRef =
    React.useRef(null)

  const [lastCustomerDetails, setLastCustomerDetails] =
    React.useState({
      customerName: '',
      phoneNumber: '',
    })

  const [printReceipt, setPrintReceipt] =
    React.useState(null)

  const [printReady, setPrintReady] =
    React.useState(false)

  const { language, setLanguage, t } =
    useLanguage()

  const voiceSupport =
    React.useMemo(
      () => getSpeechRecognition(),
      []
    )

  const voiceAvailable =
    voiceSupport.ctor !== null

  const voiceMessage =
    !voiceAvailable
      ? voiceSupport.reason ===
        VOICE_INSECURE
        ? t('voiceRequiresHttps')
        : t('voiceNotSupported')
      : ''

  const total = React.useMemo(
    () =>
      cart.reduce(
        (sum, product) =>
          sum +
          Number(
            product.price || 0
          ) *
            (product.quantity || 1),
        0
      ),
    [cart]
  )

  /* =======================================================
   * MATCH PRODUCT
   * ======================================================= */

  const findMatchingProduct =
    React.useCallback(
      (transcript) => {
        return findBestProductMatch(
          transcript,
          savedItems
        )
      },
      [savedItems]
    )

  /* =======================================================
   * SPEAK PRODUCT
   * ======================================================= */

  const speakProduct =
    React.useCallback(
      (
        productName,
        currentLang = language
      ) => {
        if (
          !(
            'speechSynthesis' in
            window
          ) ||
          !productName
        ) {
          return
        }

        window.speechSynthesis.cancel()

        let textToSpeak = ''
        let langCode =
          ENGLISH_VOICE_LANGUAGE

        if (
          currentLang === 'ta'
        ) {
          textToSpeak =
            `${productName} serkkappattathu`
          langCode =
            ENGLISH_VOICE_LANGUAGE
        } else {
          textToSpeak =
            `${productName} added`
          langCode =
            ENGLISH_VOICE_LANGUAGE
        }

        const utterance =
          new SpeechSynthesisUtterance(
            textToSpeak
          )

        utterance.lang = langCode
        utterance.rate = 0.9

        window.speechSynthesis.speak(
          utterance
        )
      },
      [language]
    )

  /* =======================================================
   * TOAST
   * ======================================================= */

  const showToast =
    React.useCallback(
      (
        message,
        duration = 2000
      ) => {
        if (
          toastTimeoutRef.current
        ) {
          clearTimeout(
            toastTimeoutRef.current
          )
        }

        setToast(message)

        toastTimeoutRef.current =
          setTimeout(
            () => setToast(''),
            duration
          )
      },
      []
    )

  /* =======================================================
   * ADD PRODUCT
   * ======================================================= */

  const addProductToCart =
    React.useCallback(
      (matchedProduct) => {
        if (!matchedProduct) {
          return
        }

        const product = {
          ...matchedProduct,
          tamilName:
            matchedProduct.tamilName ||
            transliterateToTamil(matchedProduct.productName || '') ||
            '',
        }

        const name =
          product.productName ||
          product.name ||
          product.tamilName ||
          'Unknown Product'

        setCart((prev) =>
          addOrIncrementCart(prev, product)
        )

        speakProduct(name)

        showToast(
          `Added: ${name}`
        )
      },
      [
        setCart,
        speakProduct,
        showToast,
      ]
    )

  /* =======================================================
   * START RECOGNITION
   * ======================================================= */

  const startRecognitionForLang =
    React.useCallback(
      (
        recognitionLanguage,
        onResult,
        onEnd,
        onError
      ) => {
        const {
          ctor: SpeechRecognition,
        } = getSpeechRecognition()

        if (!SpeechRecognition) {
          return null
        }

        return createBilingualRecognition(
          SpeechRecognition,
          {
            /*
             * IMPORTANT:
             * voiceRecognition.js already returns
             * an array of alternatives.
             *
             * Do NOT wrap it in [transcript].
             */
            onResult: (
              transcripts,
              isFinal
            ) => {
              const list =
                Array.isArray(
                  transcripts
                )
                  ? transcripts
                  : [transcripts]

              onResult(
                list,
                isFinal
              )
            },

            onError: (
              event
            ) => {
              const errorCode =
                event?.error || ''

              if (
                errorCode ===
                  'no-speech' ||
                errorCode ===
                  'aborted'
              ) {
                onEnd(
                  errorCode
                )
                return
              }

              let message =
                t(
                  'voiceNotSupported'
                )

              if (
                errorCode ===
                  'not-allowed' ||
                errorCode ===
                  'service-not-allowed'
) {
                        message =
                          t('micPermissionDenied')
                      } else if (
                        errorCode ===
                        'audio-capture'
                      ) {
                        message =
                          t('micUnavailable')
              }

              if (
                typeof onError ===
                'function'
              ) {
                onError(
                  event
                )
              }

              showToast(
                message,
                3000
              )

              onEnd(
                errorCode
              )
            },

            onEnd: () => {
              onEnd('end')
            },
          },
          [recognitionLanguage]
        )
      },
      [
        language,
        t,
        showToast,
      ]
    )

  /* =======================================================
   * VOICE INPUT
   * ======================================================= */

  const handleVoiceInput =
    React.useCallback(() => {
      /*
       * Stop current recognition.
       */
      if (isListening) {
        if (
          recognitionRef.current
        ) {
          try {
            recognitionRef.current.stop()
          } catch (_) {}

          recognitionRef.current =
            null
        }

        voiceAttemptRef.current +=
          1

        setIsListening(false)
        return
      }

      const {
        ctor: SpeechRecognition,
        reason,
      } = getSpeechRecognition()

      if (!SpeechRecognition) {
        const message =
          reason ===
          VOICE_INSECURE
            ? t(
                'voiceRequiresHttps'
              )
            : t(
                'voiceNotSupported'
              )

        window.alert(message)
        return
      }

      if (
        !Array.isArray(
          savedItems
        ) ||
        savedItems.length === 0
      ) {
            showToast(
              t('addProductsFirst'),
              3000
            )
        return
      }

      /*
       * Every voice session gets a unique ID.
       * This prevents old recognition callbacks
       * from affecting a new session.
       */
      const sessionId =
        Date.now()

      voiceAttemptRef.current =
        sessionId

      voiceMatchedRef.current =
        false

      isProcessingVoiceRef.current =
        false

      const languages =
        getVoiceLanguages(
          language
        )

      /*
       * Tamil mode:
       * ta-IN -> en-IN
       *
       * English mode:
       * en-IN -> ta-IN
       */
      let attemptIndex = 0

      const startAttempt =
        () => {
          if (
            voiceAttemptRef.current !==
            sessionId
          ) {
            return
          }

          if (
            voiceMatchedRef.current
          ) {
            return
          }

          if (
            recognitionRef.current
          ) {
            try {
              recognitionRef.current.stop()
            } catch (_) {}

            recognitionRef.current =
              null
          }

          const currentLanguage =
            languages[
              attemptIndex
            ]

          if (!currentLanguage) {
            setIsListening(false)
            recognitionRef.current =
              null

            if (
              !voiceMatchedRef.current
            ) {
              showToast(
                t('productNotRecognized'),
                3000
              )
            }

            return
          }

          const recognizer =
            startRecognitionForLang(
              currentLanguage,

              /*
               * RESULT
               */
              (
                transcripts
              ) => {
                if (
                  voiceAttemptRef.current !==
                  sessionId
                ) {
                  return
                }

                if (
                  voiceMatchedRef.current
                ) {
                  return
                }

                const list =
                  Array.isArray(
                    transcripts
                  )
                    ? transcripts
                    : [
                        transcripts,
                      ]

                /*
                 * Try every ASR alternative.
                 *
                 * Example:
                 *
                 * bourbon biscuit
                 * burbon biscuit
                 * bourbon
                 */
                for (
                  const transcript of
                    list
                ) {
          const text =
            String(transcript || '').trim()

                  if (!text) {
                    continue
                  }

                  const matched =
                    findMatchingProduct(
                      text
                    )

                  if (!matched) {
                    continue
                  }

                  /*
                   * Strong match found.
                   */
                  voiceMatchedRef.current =
                    true

                  isProcessingVoiceRef.current =
                    true

                  setIsListening(
                    false
                  )

                  if (
                    recognitionRef.current
                  ) {
                    try {
                      recognitionRef.current.stop()
                    } catch (_) {}

                    recognitionRef.current =
                      null
                  }

                  addProductToCart(
                    matched
                  )

                  return
                }
              },

              /*
               * END
               */
              () => {
                if (
                  voiceAttemptRef.current !==
                  sessionId
                ) {
                  return
                }

                if (
                  voiceMatchedRef.current
                ) {
                  return
                }

                /*
                 * Try fallback language.
                 */
                attemptIndex += 1

                if (
                  attemptIndex <
                  languages.length
                ) {
                  startAttempt()
                } else {
                  setIsListening(
                    false
                  )

                  recognitionRef.current =
                    null

                  isProcessingVoiceRef.current =
                    false

                  showToast(
                    t('productNotRecognized'),
                    3000
                  )
                }
              },

              /*
               * ERROR
               */
              (event) => {
                const code =
                  event?.error ||
                  ''

                /*
                 * These errors can safely try
                 * the fallback language.
                 */
                if (
                  code ===
                    'no-speech' ||
                  code ===
                    'aborted'
                ) {
                  return
                }
              }
            )

          recognitionRef.current =
            recognizer

          if (recognizer) {
            setIsListening(
              true
            )
          }
        }

      startAttempt()
    }, [
      isListening,
      language,
      t,
      savedItems,
      showToast,
      startRecognitionForLang,
      findMatchingProduct,
      addProductToCart,
    ])

  /* =======================================================
   * CLEANUP
   * ======================================================= */

  React.useEffect(() => {
    return () => {
      voiceAttemptRef.current +=
        1

      if (
        recognitionRef.current
      ) {
        try {
          recognitionRef.current.stop()
        } catch (_) {}

        recognitionRef.current =
          null
      }

      if (
        toastTimeoutRef.current
      ) {
        clearTimeout(
          toastTimeoutRef.current
        )
      }
    }
  }, [])

  /* =======================================================
   * BARCODE
   * ======================================================= */

  const handleScan =
    React.useCallback(() => {
      setScanError('')
      setShowScanner(true)
    }, [])

  const handleScanSuccess =
    React.useCallback(
      (decodedText) => {
        const scannedBarcode =
          String(
            decodedText
          ).trim()

        const matchedProduct =
          savedItems.find(
            (p) =>
              String(
                p.barcode || ''
              ).trim() ===
              scannedBarcode
          )

        if (
          matchedProduct
        ) {
          const name =
            matchedProduct?.productName ||
            matchedProduct?.name ||
            'Unknown Product'

          if (
            name !==
            'Unknown Product'
          ) {
            speakProduct(name)
          }

          setCart((prev) =>
            addOrIncrementCart(
              prev,
              matchedProduct
            )
          )

          setScanError('')
          setShowScanner(false)
        } else {
          setScanError(
            t('productNotFound')
          )
          setShowScanner(false)
        }
      },
      [
        savedItems,
        setCart,
        speakProduct,
        t,
      ]
    )

  /* =======================================================
   * NAVIGATION
   * ======================================================= */

  const handleAddItem =
    React.useCallback(() => {
      navigate('/add-item')
    }, [navigate])

  const handleAddProduct =
    React.useCallback(() => {
      navigate('/add-product')
    }, [navigate])

  /* =======================================================
   * CART
   * ======================================================= */

  const handleDeleteItem =
    React.useCallback(
      (id) => {
        setCart((prev) =>
          prev.filter(
            (item) =>
              item.id !== id
          )
        )
      },
      [setCart]
    )

  const handleUpdateQuantity =
    React.useCallback(
      (id, delta) => {
        setCart((prev) => {
          const updated =
            prev.map((item) => {
              if (
                item.id === id
              ) {
                const newQty =
                  (item.quantity ||
                    1) +
                  delta

                return {
                  ...item,
                  quantity:
                    newQty,
                }
              }

              return item
            })

          return updated.filter(
            (item) =>
              (item.quantity ||
                1) > 0
          )
        })
      },
      [setCart]
    )

  const handleDeleteAll =
    React.useCallback(() => {
      setCart([])
    }, [setCart])

  const handlePaySave =
    React.useCallback(() => {
      if (
        cart.length === 0
      ) {
        return
      }

      setIsModalOpen(true)
    }, [cart.length])

  /* =======================================================
   * LOCAL STORAGE RECEIPT
   * ======================================================= */

  const saveReceiptToStorage =
    React.useCallback(
      (customerDetails) => {
        const items =
          cart.map((item) => ({
            product_name:
              item.productName ||
              item.name ||
              'Unknown',

            quantity:
              item.quantity || 1,

            price:
              Number(
                item.price || 0
              ),
          }))

        const newReceipt = {
          id:
            'REC-' +
            Date.now(),

          customerName:
            customerDetails.customerName,

          phoneNumber:
            customerDetails.phoneNumber,

          customer_name:
            customerDetails.customerName,

          phone_number:
            customerDetails.phoneNumber,

          items,

          totalAmount:
            total,

          total_amount:
            total,

          date:
            new Date().toISOString(),

          created_at:
            new Date().toISOString(),
        }

        let existingReceipts =
          []

        try {
          existingReceipts =
            JSON.parse(
              localStorage.getItem(
                SAVED_RECEIPTS_KEY
              ) || '[]'
            )

          if (
            !Array.isArray(
              existingReceipts
            )
          ) {
            existingReceipts =
              []
          }
        } catch (_) {
          existingReceipts =
            []
        }

        existingReceipts.unshift(
          newReceipt
        )

        localStorage.setItem(
          SAVED_RECEIPTS_KEY,
          JSON.stringify(
            existingReceipts
          )
        )

        return newReceipt
      },
      [cart, total]
    )

  /* =======================================================
   * BACKEND SAVE
   * ======================================================= */

  const saveReceiptToBackend =
    React.useCallback(
      async (
        customerDetails
      ) => {
        const items =
          cart.map((item) => ({
            product_name:
              item.productName ||
              item.name ||
              'Unknown',

            quantity:
              item.quantity || 1,

            price:
              Number(
                item.price || 0
              ),
          }))

        const payload = {
          customer_name:
            customerDetails.customerName,

          phone_number:
            customerDetails.phoneNumber,

          total_amount:
            total,

          items,
        }

        try {
          const response =
            await apiFetch(
              '/api/save-receipt',
              {
                method: 'POST',

                headers: {
                  'Content-Type':
                    'application/json',
                },

                body:
                  JSON.stringify(
                    payload
                  ),
              }
            )

          const result =
            await response.json()

          if (
            !result.success
          ) {
            throw new Error(
              result.error ||
                'Failed to save receipt to server'
            )
          }

          return result
        } catch (err) {
          console.error(
            'Backend save error:',
            err
          )

          throw err
        }
      },
      [cart, total]
    )

  /* =======================================================
   * SAVE ONLY
   * ======================================================= */

  const handleSaveOnly =
    React.useCallback(
      async (
        customerDetails
      ) => {
        setLastCustomerDetails(
          customerDetails
        )

        try {
          await saveReceiptToBackend(
            customerDetails
          )

          saveReceiptToStorage(
            customerDetails
          )

          setCart([])

          setIsModalOpen(false)

          showToast(
            t('saveSuccess'),
            3000
          )
        } catch (err) {
          console.error(
            'Save Error:',
            err
          )

          showToast(
            'Failed to save receipt to server. Saved locally.',
            3000
          )

          saveReceiptToStorage(
            customerDetails
          )

          setCart([])

          setIsModalOpen(false)
        }
      },
      [
        setCart,
        saveReceiptToStorage,
        saveReceiptToBackend,
        showToast,
        t,
      ]
    )

  /* =======================================================
   * SAVE + PRINT
   * ======================================================= */

  const handleSaveAndPrint =
    React.useCallback(
      async (
        customerDetails
      ) => {
        try {
          await saveReceiptToBackend(
            customerDetails
          )
        } catch (err) {
          console.error(
            'Backend save error:',
            err
          )

          showToast(
            'Failed to save to server. Printing locally saved receipt.',
            3000
          )
        }

        const receipt =
          saveReceiptToStorage(
            customerDetails
          )

        setIsModalOpen(false)

        setPrintReceipt({
          customerName:
            receipt.customer_name ||
            receipt.customerName,

          phoneNumber:
            receipt.phone_number ||
            receipt.phoneNumber,

          date:
            receipt.created_at ||
            receipt.date,

          items:
            cart.map(
              (item) => ({
                name:
                  item.productName ||
                  item.name ||
                  'Unknown',

                quantity:
                  item.quantity ||
                  1,

                price:
                  Number(
                    item.price || 0
                  ),
              })
            ),

          totalAmount:
            total,
        })

        setPrintReady(true)
      },
      [
        saveReceiptToBackend,
        saveReceiptToStorage,
        cart,
        total,
        showToast,
      ]
    )

  /* =======================================================
   * PRINT
   * ======================================================= */

  React.useEffect(() => {
    if (printReady) {
      window.print()

      setCart([])

      setPrintReady(false)
    }
  }, [
    printReady,
    setCart,
  ])

  React.useEffect(() => {
    const handleAfterPrint =
      () => {
        setPrintReceipt(null)
      }

    window.addEventListener(
      'afterprint',
      handleAfterPrint
    )

    return () =>
      window.removeEventListener(
        'afterprint',
        handleAfterPrint
      )
  }, [])

  /* =======================================================
   * UI
   * ======================================================= */

  return (
    <div className="app-shell print:hidden flex flex-col h-[100dvh] overflow-hidden bg-slate-50">

      <Header
        onAddItem={handleAddItem}
        onSettingsClick={() =>
          setSettingsOpen(true)
        }
        onHistoryClick={() =>
          navigate(
            '/saved-receipts'
          )
        }
      />

      <div className="flex-1 overflow-y-auto overflow-x-hidden">

        <div className="p-4 pb-8">

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">

            <AddedItems
              items={cart}
              onDelete={
                handleDeleteItem
              }
              onUpdateQuantity={
                handleUpdateQuantity
              }
            />

          </div>

        </div>

      </div>

      <FloatingActions
        onScan={handleScan}
        onAdd={handleAddProduct}
        onVoice={
          handleVoiceInput
        }
        isListening={
          isListening
        }
        voiceAvailable={
          voiceAvailable
        }
        voiceMessage={
          voiceMessage
        }
      />

      <SummaryPanel
        total={total}
        onDelete={
          handleDeleteAll
        }
        onPaySave={
          handlePaySave
        }
        className="mt-auto"
      />

      {/* SETTINGS */}

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4">

          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">

            <div className="mb-4 flex items-center justify-between">

              <h2 className="text-lg font-bold text-gray-900">
                {t(
                  'settingsTitle'
                )}
              </h2>

              <button
                type="button"
                aria-label={t(
                  'close'
                )}
                onClick={() =>
                  setSettingsOpen(
                    false
                  )
                }
                className="rounded-lg px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
              >
                {t('close')}
              </button>

            </div>

            <div className="space-y-3">

              <div className="text-sm font-medium text-gray-700">
                {t('language')}
              </div>

              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 px-3 py-2">

                <span className="text-gray-800">
                  {t('tamil')}
                </span>

                <input
                  type="radio"
                  name="language"
                  checked={
                    language ===
                    'ta'
                  }
                  onChange={() => {
                    setLanguage(
                      'ta'
                    )
                    setSettingsOpen(
                      false
                    )
                  }}
                />

              </label>

              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 px-3 py-2">

                <span className="text-gray-800">
                  {t('english')}
                </span>

                <input
                  type="radio"
                  name="language"
                  checked={
                    language ===
                    'en'
                  }
                  onChange={() => {
                    setLanguage(
                      'en'
                    )
                    setSettingsOpen(
                      false
                    )
                  }}
                />

              </label>

            </div>

          </div>

        </div>
      )}

      {/* BARCODE */}

      <BarcodeScanner
        isOpen={
          showScanner
        }
        onClose={() => {
          setShowScanner(
            false
          )
          setScanError('')
        }}
        onScan={
          handleScanSuccess
        }
      />

      {/* CUSTOMER */}

      <CustomerDetailsModal
        isOpen={
          isModalOpen
        }
        onClose={() =>
          setIsModalOpen(
            false
          )
        }
        onSave={
          handleSaveOnly
        }
        onSaveAndPrint={
          handleSaveAndPrint
        }
      />

      {/* SCAN ERROR */}

      {scanError &&
        !showScanner && (
          <div className="fixed bottom-36 left-1/2 z-50 -translate-x-1/2 max-w-sm w-[90%] rounded-2xl bg-white p-4 shadow-2xl border border-red-200">

            <p className="text-center text-sm font-semibold text-red-600">
              {scanError}
            </p>

            <p className="text-center text-xs text-gray-500 mt-1">
              {t(
                'productNotFoundHint'
              )}
            </p>

            <button
              type="button"
              onClick={() => {
                setScanError(
                  ''
                )
                setShowScanner(
                  true
                )
              }}
              className="mt-3 w-full rounded-xl bg-[#FF9E2C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500"
            >
              Scan Again
            </button>

          </div>
        )}

      {/* TOAST */}

      {toast && (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 max-w-sm w-[90%] rounded-2xl bg-[#1fbf68] p-4 shadow-2xl">

          <p className="text-center text-sm font-semibold text-white">
            {toast}
          </p>

        </div>
      )}

      {/* LISTENING */}

      {isListening && (
        <div className="fixed top-20 left-1/2 z-50 -translate-x-1/2 max-w-sm w-[90%] rounded-2xl bg-purple-600 p-4 shadow-2xl flex items-center justify-center gap-3">

          <div className="w-3 h-3 rounded-full bg-white animate-pulse" />

          <p className="text-center text-sm font-semibold text-white">
            {t('listening')}
          </p>

        </div>
      )}

      {/* PRINT */}

      <PrintableInvoice
        selectedReceipt={
          printReceipt
        }
      />

    </div>
  )
}