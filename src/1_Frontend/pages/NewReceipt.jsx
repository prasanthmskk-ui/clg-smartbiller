import React from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import FloatingActions from '../components/FloatingActions'
import AddedItems from '../components/AddedItems'
import SummaryPanel from '../components/SummaryPanel'
import CustomerDetailsModal from '../components/CustomerDetailsModal'
import { useLanguage } from '../i18n'
import { createBilingualRecognition, getSpeechRecognition, getVoiceLanguages, normalizeVoiceText, VOICE_UNSUPPORTED, VOICE_INSECURE, ENGLISH_VOICE_LANGUAGE } from '../lib/voiceRecognition'
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
    console.error('Failed to load products from LocalStorage:', e)
  }
  return []
}

export default function NewReceipt({ cart, setCart, savedItems }) {
  const navigate = useNavigate()
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [showScanner, setShowScanner] = React.useState(false)
  const [scanError, setScanError] = React.useState('')
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [toast, setToast] = React.useState('')
  const [isListening, setIsListening] = React.useState(false)
  const recognitionRef = React.useRef(null)
  const isProcessingVoiceRef = React.useRef(false)
  const toastTimeoutRef = React.useRef(null)
  const [lastCustomerDetails, setLastCustomerDetails] = React.useState({ customerName: '', phoneNumber: '' })
  const [printReceipt, setPrintReceipt] = React.useState(null)
  const [printReady, setPrintReady] = React.useState(false)
  const { language, setLanguage, t } = useLanguage()

  const voiceSupport = React.useMemo(() => getSpeechRecognition(), [])
  const voiceAvailable = voiceSupport.ctor !== null

  const voiceMessage = !voiceAvailable
    ? voiceSupport.reason === VOICE_INSECURE
      ? t('voiceRequiresHttps')
      : t('voiceNotSupported')
    : ''

  const total = React.useMemo(
    () => cart.reduce((sum, product) => sum + Number(product.price || 0) * (product.quantity || 1), 0),
    [cart]
  )

  const findMatchingProduct = React.useCallback(
    (transcript) => {
      const spokenText = normalizeVoiceText(transcript).toLowerCase()

      if (!spokenText) return null

      const norm = (s) =>
        String(s || '')
          .trim()
          .toLowerCase()
          .replace(/\s+/g, ' ')

      const cleanSpoken = norm(spokenText)

      const matchesSpoken = (value) => {
        const clean = norm(value)

        if (!clean) return false

        return (
          clean === cleanSpoken ||
          clean.includes(cleanSpoken) ||
          cleanSpoken.includes(clean)
        )
      }

      return (
        savedItems.find(
          (p) =>
            (p.name && matchesSpoken(p.name)) ||
            (p.tamilName && matchesSpoken(p.tamilName))
        ) ||
        savedItems.find((p) => {
          const productName = String(p.productName || '').trim()
          return productName && matchesSpoken(productName)
        }) ||
        null
      )
    },
    [savedItems]
  )

  const speakProduct = React.useCallback(
    (productName, currentLang = language) => {
      if (!('speechSynthesis' in window) || !productName) return

      window.speechSynthesis.cancel()

      let textToSpeak = ''
      let langCode = ENGLISH_VOICE_LANGUAGE

      if (currentLang === 'ta') {
        textToSpeak = `${productName} serkkappattathu`
        langCode = ENGLISH_VOICE_LANGUAGE
      } else {
        textToSpeak = `${productName} added`
        langCode = ENGLISH_VOICE_LANGUAGE
      }

      const utterance = new SpeechSynthesisUtterance(textToSpeak)
      utterance.lang = langCode
      utterance.rate = 0.9

      window.speechSynthesis.speak(utterance)
    },
    [language]
  )

  const showToast = React.useCallback(
    (message, duration = 2000) => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current)
      }

      setToast(message)

      toastTimeoutRef.current = setTimeout(() => setToast(''), duration)
    },
    []
  )

  const addProductToCart = React.useCallback(
    (matchedProduct) => {
      const name = matchedProduct.productName || matchedProduct.name

      setCart((prev) => addOrIncrementCart(prev, matchedProduct))
      speakProduct(name)
      showToast(`Added: ${name}`)
    },
    [setCart, speakProduct, showToast]
  )

  const startRecognitionForLang = React.useCallback(
    (onResult, onEnd) => {
      const { ctor: SpeechRecognition } = getSpeechRecognition()

      if (!SpeechRecognition) return null

      return createBilingualRecognition(
        SpeechRecognition,
        {
          onResult: (transcript, isFinal) =>
            onResult([transcript], isFinal),

          onError: (event) => {
            const errorCode = event?.error || ''

            if (
              errorCode === 'no-speech' ||
              errorCode === 'aborted'
            ) {
              onEnd()
              return
            }

            let message = t('voiceNotSupported')

            if (
              errorCode === 'not-allowed' ||
              errorCode === 'service-not-allowed'
            ) {
              message =
                language === 'ta'
                  ? 'மைக்ரோஃபோன் அனுமதி மறுக்கப்பட்டது'
                  : 'Microphone permission denied'
            } else if (errorCode === 'audio-capture') {
              message =
                language === 'ta'
                  ? 'மைக்ரோஃபோன் கிடைக்கவில்லை'
                  : 'No microphone available'
            }

            showToast(message, 3000)
            onEnd()
          },

          onEnd,
        },
        getVoiceLanguages(language)
      )
    },
    [language, t, showToast]
  )

  const handleVoiceInput = React.useCallback(() => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }

      setIsListening(false)
      return
    }

    const {
      ctor: SpeechRecognition,
      reason,
    } = getSpeechRecognition()

    if (!SpeechRecognition) {
      const message =
        reason === VOICE_INSECURE
          ? t('voiceRequiresHttps')
          : t('voiceNotSupported')

      window.alert(message)
      return
    }

    let matched = false
    isProcessingVoiceRef.current = false

    const rec = startRecognitionForLang(
      (transcripts) => {
        if (isProcessingVoiceRef.current) return

        for (const tr of transcripts) {
          const m = findMatchingProduct(tr)

          if (!m) continue

          matched = true
          isProcessingVoiceRef.current = true

          setIsListening(false)
          addProductToCart(m)

          if (recognitionRef.current) {
            recognitionRef.current.stop()
            recognitionRef.current = null
          }

          return
        }
      },
      () => {
        if (!matched) {
          isProcessingVoiceRef.current = false
          setIsListening(false)
          recognitionRef.current = null
        }
      }
    )

    recognitionRef.current = rec

    if (rec) {
      setIsListening(true)
    }
  }, [
    isListening,
    language,
    t,
    startRecognitionForLang,
    findMatchingProduct,
    addProductToCart,
  ])

  React.useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (_) {}

        recognitionRef.current = null
      }

      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current)
      }
    }
  }, [])

  const handleScan = React.useCallback(() => {
    setScanError('')
    setShowScanner(true)
  }, [])

  const handleScanSuccess = React.useCallback(
    (decodedText) => {
      const scannedBarcode = String(decodedText).trim()

      const matchedProduct = savedItems.find(
        (p) =>
          String(p.barcode || '').trim() === scannedBarcode
      )

      if (matchedProduct) {
        const name =
          matchedProduct?.productName ||
          matchedProduct?.name ||
          'Unknown Product'

        if (name !== 'Unknown Product') {
          speakProduct(name)
        }

        setCart((prev) =>
          addOrIncrementCart(prev, matchedProduct)
        )

        setScanError('')
        setShowScanner(false)
      } else {
        setScanError(t('productNotFound'))
        setShowScanner(false)
      }
    },
    [savedItems, setCart, speakProduct, t]
  )

  const handleAddItem = React.useCallback(() => {
    navigate('/add-item')
  }, [navigate])

  const handleAddProduct = React.useCallback(() => {
    navigate('/add-product')
  }, [navigate])

  const handleDeleteItem = React.useCallback(
    (id) => {
      setCart((prev) =>
        prev.filter((item) => item.id !== id)
      )
    },
    [setCart]
  )

  const handleUpdateQuantity = React.useCallback(
    (id, delta) => {
      setCart((prev) => {
        const updated = prev.map((item) => {
          if (item.id === id) {
            const newQty =
              (item.quantity || 1) + delta

            return {
              ...item,
              quantity: newQty,
            }
          }

          return item
        })

        return updated.filter(
          (item) =>
            (item.quantity || 1) > 0
        )
      })
    },
    [setCart]
  )

  const handleDeleteAll = React.useCallback(() => {
    setCart([])
  }, [setCart])

  const handlePaySave = React.useCallback(() => {
    if (cart.length === 0) return
    setIsModalOpen(true)
  }, [cart.length])

  const saveReceiptToStorage = React.useCallback(
    (customerDetails) => {
      const items = cart.map((item) => ({
        product_name:
          item.productName ||
          item.name ||
          'Unknown',

        quantity:
          item.quantity || 1,

        price:
          Number(item.price || 0),
      }))

      const newReceipt = {
        id: 'REC-' + Date.now(),

        customerName:
          customerDetails.customerName,

        phoneNumber:
          customerDetails.phoneNumber,

        customer_name:
          customerDetails.customerName,

        phone_number:
          customerDetails.phoneNumber,

        items,

        totalAmount: total,

        total_amount: total,

        date: new Date().toISOString(),

        created_at:
          new Date().toISOString(),
      }

      const existingReceipts =
        JSON.parse(
          localStorage.getItem(
            SAVED_RECEIPTS_KEY
          ) || '[]'
        )

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

  const saveReceiptToBackend =
    React.useCallback(
      async (customerDetails) => {
        const items = cart.map(
          (item) => ({
            product_name:
              item.productName ||
              item.name ||
              'Unknown',

            quantity:
              item.quantity || 1,

            price:
              Number(item.price || 0),
          })
        )

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
                  JSON.stringify(payload),
              }
            )

          const result =
            await response.json()

          if (!result.success) {
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

  const handleSaveOnly =
    React.useCallback(
      async (customerDetails) => {
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
            t('saveSuccess') ||
              'ரசீது வெற்றிகரமாக சேமிக்கப்பட்டது',
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

  const handleSaveAndPrint =
    React.useCallback(
      async (customerDetails) => {
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

          items: cart.map(
            (item) => ({
              name:
                item.productName ||
                item.name ||
                'Unknown',

              quantity:
                item.quantity || 1,

              price:
                Number(item.price || 0),
            })
          ),

          totalAmount: total,
        })

        setPrintReady(true)
      },
      [
        saveReceiptToBackend,
        saveReceiptToStorage,
        cart,
        total,
      ]
    )

  React.useEffect(() => {
    if (printReady) {
      window.print()

      setCart([])

      setPrintReady(false)
    }
  }, [printReady, setCart])

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

  return (
    <div className="app-shell print:hidden flex flex-col h-[100dvh] overflow-hidden bg-slate-50">

      <Header
        onAddItem={handleAddItem}
        onSettingsClick={
          React.useCallback(
            () => setSettingsOpen(true),
            []
          )
        }
        onHistoryClick={
          React.useCallback(
            () => navigate('/saved-receipts'),
            [navigate]
          )
        }
      />

      <div className="flex-1 overflow-y-auto overflow-x-hidden">

          <div className="p-4 pb-8">

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">

            <AddedItems
              items={cart}
              onDelete={handleDeleteItem}
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
        onVoice={handleVoiceInput}
        isListening={isListening}
        voiceAvailable={voiceAvailable}
        voiceMessage={voiceMessage}
      />

      <SummaryPanel
        total={total}
        onDelete={handleDeleteAll}
        onPaySave={handlePaySave}
        className="mt-auto"
      />

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4">

          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">

            <div className="mb-4 flex items-center justify-between">

              <h2 className="text-lg font-bold text-gray-900">
                {t('settingsTitle')}
              </h2>

              <button
                type="button"
                aria-label={t('close')}
                onClick={() =>
                  setSettingsOpen(false)
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
                  checked={language === 'ta'}
                  onChange={() => {
                    setLanguage('ta')
                    setSettingsOpen(false)
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
                  checked={language === 'en'}
                  onChange={() => {
                    setLanguage('en')
                    setSettingsOpen(false)
                  }}
                />

              </label>

            </div>

          </div>

        </div>
      )}

      <BarcodeScanner
        isOpen={showScanner}
        onClose={React.useCallback(
          () => {
            setShowScanner(false)
            setScanError('')
          },
          []
        )}
        onScan={handleScanSuccess}
      />

      <CustomerDetailsModal
        isOpen={isModalOpen}
        onClose={React.useCallback(
          () => setIsModalOpen(false),
          []
        )}
        onSave={handleSaveOnly}
        onSaveAndPrint={
          handleSaveAndPrint
        }
      />

      {scanError &&
        !showScanner && (
          <div className="fixed bottom-36 left-1/2 z-50 -translate-x-1/2 max-w-sm w-[90%] rounded-2xl bg-white p-4 shadow-2xl border border-red-200">

            <p className="text-center text-sm font-semibold text-red-600">
              {scanError}
            </p>

            <p className="text-center text-xs text-gray-500 mt-1">
              {t('productNotFoundHint')}
            </p>

            <button
              type="button"
              onClick={() => {
                setScanError('')
                setShowScanner(true)
              }}
              className="mt-3 w-full rounded-xl bg-[#FF9E2C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500"
            >
              Scan Again
            </button>

          </div>
        )}

      {toast && (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 max-w-sm w-[90%] rounded-2xl bg-[#1fbf68] p-4 shadow-2xl">

          <p className="text-center text-sm font-semibold text-white">
            {toast}
          </p>

        </div>
      )}

      {isListening && (
        <div className="fixed top-20 left-1/2 z-50 -translate-x-1/2 max-w-sm w-[90%] rounded-2xl bg-purple-600 p-4 shadow-2xl flex items-center justify-center gap-3">

          <div className="w-3 h-3 rounded-full bg-white animate-pulse" />

          <p className="text-center text-sm font-semibold text-white">
            {t('listening')}
          </p>

        </div>
      )}

      <PrintableInvoice
        selectedReceipt={printReceipt}
      />

    </div>
  )
}