import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Camera, Save, ScanLine, Sparkles, X, Loader, CheckCircle, Mic, MicOff } from 'lucide-react'
import { useLanguage } from '../i18n'
import { useOcr } from '../../lib/ocr/useOcr.jsx'
import { transliterateToTamil } from '../../lib/ocr/transliterate'
import { createBilingualRecognition, getSpeechRecognition, isTamilText, mapTamilPhonetic, TAMIL_VOICE_LANGUAGE, ENGLISH_VOICE_LANGUAGE, VOICE_INSECURE } from '../lib/voiceRecognition'

const BarcodeScanner = React.lazy(() => import('../components/BarcodeScanner'))

const COMMON_DICTIONARY = {
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
  chocolate: 'சாக்லேட்',
}

const getImmediateTamilName = (text) => {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ')
  return COMMON_DICTIONARY[normalized] || transliterateToTamil(text)
}

const getImmediateEnglishName = (text) => {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ')
  const match = Object.entries(COMMON_DICTIONARY).find(([, tamil]) => (
    tamil.toLowerCase().replace(/\s+/g, ' ') === normalized
  ))
  if (!match) return ''
  return match[0].charAt(0).toUpperCase() + match[0].slice(1)
}

export default function AddProduct(props) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useLanguage()

  const editingProduct = location.state?.editingProduct || null

  const [productName, setProductName] = React.useState(editingProduct?.productName || '')
  const [tamilName, setTamilName] = React.useState(editingProduct?.tamilName || '')
  const [price, setPrice] = React.useState(editingProduct?.price || '')
  const [barcode, setBarcode] = React.useState(editingProduct?.barcode || '')
  const [frontPhoto, setFrontPhoto] = React.useState(null)
  const [backPhoto, setBackPhoto] = React.useState(null)
  const [showScanner, setShowScanner] = React.useState(false)
  const [toast, setToast] = React.useState('')
  const frontCameraRef = React.useRef(null)
  const backCameraRef = React.useRef(null)
  const tamilDebounceRef = React.useRef(null)
  const englishDebounceRef = React.useRef(null)
  const latestTamilRequest = React.useRef(0)
  const latestEnglishRequest = React.useRef(0)
  const translationCacheRef = React.useRef(new Map())
  const recognitionRef = React.useRef(null)
  const toastTimeoutRef = React.useRef(null)
  const navigationTimeoutRef = React.useRef(null)
  const [isListening, setIsListening] = React.useState(false)
  const [listeningField, setListeningField] = React.useState(null)

  const { ctor: SpeechRecognitionCtor, reason: speechReason } = React.useMemo(
    () => getSpeechRecognition(),
    []
  )
  const isSpeechSupported = Boolean(SpeechRecognitionCtor)

  const voiceMessage = React.useMemo(() => {
    if (!speechReason) return ''
    return speechReason === VOICE_INSECURE ? t('voiceRequiresHttps') : t('voiceNotSupported')
  }, [speechReason, t])

  const showToast = React.useCallback((message, duration = 3000) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
    }
    setToast(message)
    toastTimeoutRef.current = setTimeout(() => setToast(''), duration)
  }, [])

  React.useEffect(() => () => {
    clearTimeout(tamilDebounceRef.current)
    clearTimeout(englishDebounceRef.current)
    clearTimeout(toastTimeoutRef.current)
    clearTimeout(navigationTimeoutRef.current)
    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch (_) {}
      recognitionRef.current = null
    }
  }, [])

  const startListening = (field) => {
    const { ctor: SpeechRecognition, reason } = getSpeechRecognition()
    if (!SpeechRecognition) {
      const message = reason === VOICE_INSECURE
        ? t('voiceRequiresHttps')
        : t('voiceNotSupported')
      showToast(message)
      return
    }

    stopListening()

    const showVoiceError = (code) => {
      let message = t('voiceNotSupported')
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        message = t('voiceRequiresHttps')
      } else if (code === 'no-speech') {
        message = field === 'english' ? 'No speech detected' : 'குரல் கேட்கவில்லை'
      }
      showToast(message)
    }

    const session = createBilingualRecognition(SpeechRecognition, {
      onResult: (transcript, isFinal) => {
        const tamilPhonetic = mapTamilPhonetic(transcript)
        if (field === 'tamil') {
          const tamilText = tamilPhonetic || (isTamilText(transcript) ? transcript : getImmediateTamilName(transcript))
          setTamilName(tamilText)
          if (isFinal) translateToEnglish(tamilText, 0)
        } else {
          const englishText = isTamilText(transcript) ? getImmediateEnglishName(transcript) : transcript
          setProductName(englishText)
          if (isTamilText(transcript) && isFinal) {
            translateToEnglish(transcript, 0)
          } else {
            setTamilName(getImmediateTamilName(englishText))
            if (isFinal) translateToTamil(englishText, 0)
          }
        }
      },
      onError: (event) => {
        const code = event?.error || ''
        if (code !== 'no-speech' && code !== 'aborted' && code !== 'network') showVoiceError(code)
      },
      onEnd: () => {
        if (recognitionRef.current === session) {
          recognitionRef.current = null
          setListeningField(null)
          setIsListening(false)
        }
      },
    }, [field === 'tamil' ? TAMIL_VOICE_LANGUAGE : ENGLISH_VOICE_LANGUAGE])
    if (session.recognitions.length === 0) {
      recognitionRef.current = null
      setListeningField(null)
      setIsListening(false)
      return
    }
    recognitionRef.current = session
    setListeningField(field)
    setIsListening(true)
  }

  const stopListening = () => {
    const recognition = recognitionRef.current
    recognitionRef.current = null
    recognition?.stop()
    setListeningField(null)
    setIsListening(false)
  }

  const handleVoiceToggle = (field) => {
    if (!isSpeechSupported) return
    if (isListening && listeningField === field) {
      stopListening()
    } else {
      if (isListening) stopListening()
      startListening(field)
    }
  }

  const resetForm = () => {
    setProductName('')
    setTamilName('')
    setPrice('')
    setBarcode('')
    setFrontPhoto(null)
    setBackPhoto(null)
  }

  const translateToTamil = (text, delay = 500) => {
    clearTimeout(tamilDebounceRef.current)
    const requestId = ++latestTamilRequest.current
    if (!text.trim()) {
      setTamilName('')
      return
    }

    const normalized = text.trim().toLowerCase()
    const dictMatch = COMMON_DICTIONARY[normalized]
    if (dictMatch) {
      setTamilName(dictMatch)
      return
    }

    const translate = async () => {
      const cacheKey = `ta|${text}`
      const cached = translationCacheRef.current.get(cacheKey)
      if (cached !== undefined) {
        if (requestId === latestTamilRequest.current) {
          setTamilName(cached)
        }
        return
      }

      try {
        if (!navigator.onLine) throw new Error('offline')
        const response = await fetch(
          `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ta&dt=t&q=${encodeURIComponent(text)}`
        )
        const res = await response.json()

        if (requestId === latestTamilRequest.current) {
          const translated = res?.[0]?.[0]?.[0] || ''
          if (translated) {
            translationCacheRef.current.set(cacheKey, translated)
            setTamilName(translated)
          } else {
            const local = transliterateToTamil(text)
            if (local) {
              translationCacheRef.current.set(cacheKey, local)
              setTamilName(local)
            } else {
              setTamilName('')
            }
          }
        }
      } catch (error) {
        if (requestId === latestTamilRequest.current) {
          const local = transliterateToTamil(text)
          if (local) {
            translationCacheRef.current.set(cacheKey, local)
            setTamilName(local)
          } else {
            setTamilName('')
          }
        }
      }
    }
    if (delay > 0) {
      tamilDebounceRef.current = setTimeout(translate, delay)
    } else {
      tamilDebounceRef.current = null
      translate()
    }
  }

  const translateToEnglish = (text, delay = 500) => {
    clearTimeout(englishDebounceRef.current)
    const requestId = ++latestEnglishRequest.current
    if (!text.trim()) {
      setProductName('')
      return
    }

    const immediateMatch = getImmediateEnglishName(text)
    if (immediateMatch) {
      setProductName(immediateMatch)
      return
    }

    const translate = async () => {
      const cacheKey = `en|${text}`
      const cached = translationCacheRef.current.get(cacheKey)
      if (cached !== undefined) {
        if (requestId === latestEnglishRequest.current) {
          setProductName(cached)
        }
        return
      }

      try {
        const response = await fetch(
          `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ta&tl=en&dt=t&q=${encodeURIComponent(text)}`
        )
        const res = await response.json()

        if (requestId === latestEnglishRequest.current) {
          const translated = res?.[0]?.[0]?.[0] || ''
          translationCacheRef.current.set(cacheKey, translated)
          setProductName(translated)
        }
      } catch (error) {
        console.error('Translation error:', error)
      }
    }
    if (delay > 0) {
      englishDebounceRef.current = setTimeout(translate, delay)
    } else {
      englishDebounceRef.current = null
      translate()
    }
  }

  const handleProductNameChange = (value) => {
    setProductName(value)
    clearTimeout(englishDebounceRef.current)
    latestEnglishRequest.current++
    if (!value.trim()) {
      setTamilName('')
    } else {
      setTamilName(getImmediateTamilName(value))
    }
    clearTimeout(tamilDebounceRef.current)
    latestTamilRequest.current++
  }

  const handleTamilNameChange = (value) => {
    setTamilName(value)
    clearTimeout(tamilDebounceRef.current)
    latestTamilRequest.current++
    clearTimeout(englishDebounceRef.current)
    latestEnglishRequest.current++
    if (!value.trim()) {
      setProductName('')
    } else {
      const englishName = getImmediateEnglishName(value)
      if (englishName) {
        setProductName(englishName)
      } else {
        translateToEnglish(value)
      }
    }
  }

  const handleCameraCapture = (e, setPhoto) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setPhoto(event.target?.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const triggerCamera = (inputRef) => {
    inputRef.current?.click()
  }

  const removePhoto = (setPhoto) => {
    setPhoto(null)
  }

  const { status: ocrStatus, progress: ocrProgress, fields: ocrFields, extract: extractOcr, error: ocrError } = useOcr()

  const handleExtractText = async () => {
    if (!frontPhoto && !backPhoto) return

    const result = await extractOcr({ front: frontPhoto, back: backPhoto })

    if (!result) {
      showToast(t('ocrFailed'))
      setTamilName(t('defaultProductName'))
      return
    }

    let hasResult = false
    if (result.name) {
      setProductName(result.name)
      translateToTamil(result.name)
      hasResult = true
    } else {
      setTamilName(t('defaultProductName'))
    }
    if (!hasResult) {
      showToast(t('ocrFailed'))
    }
  }

  const handleScan = () => {
    setShowScanner(true)
  }

  const handleScanSuccess = (decodedText) => {
    setBarcode(decodedText)
  }

  const saveProduct = () => {
    const trimmedName = productName.trim()
    const trimmedPrice = String(price ?? '').trim()
    const numericPrice = Number(trimmedPrice)

    if (!trimmedName || !trimmedPrice || Number.isNaN(numericPrice) || numericPrice <= 0) {
      return
    }

    const trimmedBarcode = barcode.trim()
    const currentId = editingProduct?.id
    const existingProducts = props.existingProducts || []
    if (trimmedBarcode && existingProducts.some((p) => p.barcode === trimmedBarcode && p.id !== currentId)) {
      showToast(t('barcodeExists'))
      return
    }

    const savedItem = {
      id: currentId || Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
      productName: trimmedName,
      tamilName: tamilName.trim(),
      price: numericPrice,
      barcode: trimmedBarcode,
    }

    if (props.onProductSaved) {
      props.onProductSaved(savedItem, currentId)
    }

    showToast(t('productSavedSuccess'))
    resetForm()

    navigationTimeoutRef.current = setTimeout(() => {
      setToast('')
      navigate('/add-item')
    }, 800)
  }

  const handleBack = () => {
    resetForm()
    navigate(editingProduct ? '/add-item' : '/new-receipt')
  }

  return (
    <div className="min-h-screen w-full bg-[#f7f5fb] text-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-[#f7f5fb] px-4 py-4 shadow-sm">
        <button
          type="button"
          aria-label={t('back')}
          onClick={handleBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
          <ArrowLeft size={20} strokeWidth={2.2} />
        </button>

        <h1 className="flex-1 text-center text-lg font-bold tracking-tight text-slate-900">{editingProduct ? t('editProduct') : t('addProductTitle')}</h1>

        <button
          type="button"
          aria-label={t('close')}
          onClick={handleBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
          <X size={20} strokeWidth={2.2} />
        </button>
      </header>

      {toast && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#1fbf68] px-6 py-3 text-sm font-semibold text-white shadow-lg flex items-center gap-2">
          <CheckCircle size={18} />
          {toast}
        </div>
      )}

      {/* Scrollable Content */}
      <main className="w-full overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl">
          {/* Smart Auto-Fill Section */}
          <section className="rounded-[24px] border border-[#dfeaff] bg-[#edf5ff] p-4 shadow-sm shadow-blue-100/60">
            <h2 className="text-center text-base font-bold text-[#2f5cc9]">{t('smartAutoFill')}</h2>
            <p className="mt-2 text-center text-[0.8rem] leading-5 text-slate-600">{t('smartAutoFillDescription')}</p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Front Camera Button */}
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => triggerCamera(frontCameraRef)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-[#dfe7f8] bg-white px-3 py-3 text-[0.76rem] font-medium text-slate-700 shadow-sm transition hover:bg-blue-50 active:bg-blue-100 sm:text-sm"
                >
                  <Camera size={16} className="text-[#5a67d8]" />
                  {t('frontName')}
                </button>
                {frontPhoto && (
                  <div className="relative mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <img src={frontPhoto} alt="Front" className="h-40 w-full object-cover sm:h-48" />
                    <button
                      type="button"
                      onClick={() => removePhoto(setFrontPhoto)}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white transition hover:bg-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Back Camera Button */}
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => triggerCamera(backCameraRef)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-[#dfe7f8] bg-white px-3 py-3 text-[0.76rem] font-medium text-slate-700 shadow-sm transition hover:bg-blue-50 active:bg-blue-100 sm:text-sm"
                >
                  <Camera size={16} className="text-[#5a67d8]" />
                  {t('backPrice')}
                </button>
                {backPhoto && (
                  <div className="relative mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <img src={backPhoto} alt="Back" className="h-40 w-full object-cover sm:h-48" />
                    <button
                      type="button"
                      onClick={() => removePhoto(setBackPhoto)}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white transition hover:bg-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Hidden Camera Inputs */}
            <input
              ref={frontCameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleCameraCapture(e, setFrontPhoto)}
              className="hidden"
            />
            <input
              ref={backCameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleCameraCapture(e, setBackPhoto)}
              className="hidden"
            />

            <button
              type="button"
              onClick={handleExtractText}
              disabled={ocrStatus === 'loading' || ocrStatus === 'extracting' || (!frontPhoto && !backPhoto)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#eef3ff] px-4 py-3 text-sm font-semibold text-[#2d4db8] shadow-inner shadow-white/40 transition hover:bg-blue-100 active:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed sm:text-base"
            >
              {ocrStatus === 'loading' || ocrStatus === 'extracting' ? (
                <>
                  <Loader size={16} className="text-[#5d6ef0] animate-spin" />
                  {Math.round(ocrProgress * 100)}%
                </>
              ) : (
                <>
                  <Sparkles size={16} className="text-[#5d6ef0]" />
                  {t('extractText')}
                </>
              )}
            </button>

            {(ocrStatus === 'loading' || ocrStatus === 'extracting') && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
                <div
                  className="h-full rounded-full bg-[#5d6ef0] transition-all duration-200"
                  style={{ width: `${Math.round(ocrProgress * 100)}%` }}
                />
              </div>
            )}
          </section>

          {/* Form Fields Section */}
          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 sm:text-base">{t('productName')}</label>
              <div className="flex items-center gap-2">
                <input
                  value={productName}
                  onChange={(e) => handleProductNameChange(e.target.value)}
                  placeholder={t('productName')}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100 sm:text-lg"
                />
                <button
                  type="button"
                  onClick={() => handleVoiceToggle('english')}
                  disabled={!isSpeechSupported}
                  aria-label={isListening && listeningField === 'english' ? 'Stop voice input' : 'Voice input in English'}
                  aria-pressed={isListening && listeningField === 'english'}
                  title={
                    !isSpeechSupported
                      ? (voiceMessage || t('voiceNotSupported'))
                      : isListening && listeningField === 'english'
                        ? 'Tap to stop listening'
                        : 'Tap to start listening'
                  }
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition ${
                    !isSpeechSupported
                      ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                      : isListening && listeningField === 'english'
                        ? 'border-red-400 bg-red-500 text-white shadow-[0_0_0_4px_rgba(239,68,68,0.18)] animate-pulse hover:bg-red-600'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {isListening && listeningField === 'english' ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 sm:text-base">{t('tamilNameOptional')}</label>
              <div className="flex items-center gap-2">
                <input
                  value={tamilName}
                  onChange={(e) => handleTamilNameChange(e.target.value)}
                  placeholder={t('tamilNameOptional')}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100 sm:text-lg"
                />
                <button
                  type="button"
                  onClick={() => handleVoiceToggle('tamil')}
                  disabled={!isSpeechSupported}
                  aria-label={isListening && listeningField === 'tamil' ? 'Stop voice input' : 'Voice input in Tamil'}
                  aria-pressed={isListening && listeningField === 'tamil'}
                  title={
                    !isSpeechSupported
                      ? (voiceMessage || t('voiceNotSupported'))
                      : isListening && listeningField === 'tamil'
                        ? 'Tap to stop listening'
                        : 'Tap to start listening'
                  }
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition ${
                    !isSpeechSupported
                      ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                      : isListening && listeningField === 'tamil'
                        ? 'border-red-400 bg-red-500 text-white shadow-[0_0_0_4px_rgba(239,68,68,0.18)] animate-pulse hover:bg-red-600'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {isListening && listeningField === 'tamil' ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 sm:text-base">{t('priceLabel')}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={t('priceLabel')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100 sm:text-lg"
              />
            </div>
          </div>

          {/* Barcode Section */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <input
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder={t('barcodeOptional')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100 sm:text-lg"
              />
            </div>

            <button
              type="button"
              onClick={handleScan}
              className="flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-medium text-violet-700 shadow-sm transition hover:bg-violet-100 active:bg-violet-200 sm:text-base"
            >
              <ScanLine size={16} className="text-violet-700" />
              {t('scan')}
            </button>
          </div>

          {/* Save Button */}
          <button
            type="button"
            onClick={saveProduct}
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1fbf68] px-4 py-4 text-base font-semibold text-white shadow-[0_12px_28px_rgba(31,191,104,0.28)] transition hover:bg-[#18ab5b] active:bg-[#14943e] sm:py-5 sm:text-lg"
          >
            <Save size={18} />
            {t('saveProduct')}
          </button>

          {/* Bottom spacing for scrolling */}
          <div className="h-6"></div>
        </div>
      </main>

      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScanSuccess}
      />
    </div>
  )
}
