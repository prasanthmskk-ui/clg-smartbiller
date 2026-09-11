import React from 'react'
import { Plus, ScanLine, Mic, MicOff } from 'lucide-react'
import { useLanguage } from '../i18n'

function FloatingActions({ onScan, onAdd, onVoice, isListening, voiceAvailable = true, voiceMessage }) {
  const { t } = useLanguage()

  return (
    <div className="app-floating-actions print:hidden fixed right-4 bottom-36 z-20 flex flex-col items-end gap-3">
      {/* Scan Barcode FAB */}
      <div className="flex items-center gap-2">
        <span className="px-3 py-1.5 rounded-lg bg-gray-900/80 text-white text-xs font-semibold shadow-lg backdrop-blur-sm">
          {t('scanBarcode')}
        </span>
        <button
          onClick={onScan}
          aria-label={t('scanBarcode')}
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-300/50 flex items-center justify-center text-white hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
        >
          <ScanLine size={26} strokeWidth={2.2} />
        </button>
      </div>

      {/* Voice Input FAB */}
      <div className="flex items-center gap-2">
        <span className="px-3 py-1.5 rounded-lg bg-gray-900/80 text-white text-xs font-semibold shadow-lg backdrop-blur-sm">
          {isListening ? t('listening') : t('voiceAdd')}
        </span>
        <button
          onClick={onVoice}
          disabled={!voiceAvailable}
          aria-label={isListening ? t('listening') : t('voiceAdd')}
          aria-pressed={isListening}
          title={voiceAvailable ? (isListening ? t('listening') : t('voiceAdd')) : (voiceMessage || t('voiceUnavailable'))}
          className={`w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center text-white hover:shadow-xl hover:scale-105 active:scale-95 transition-all ${
            !voiceAvailable
              ? 'bg-gray-300 cursor-not-allowed shadow-none'
              : isListening
                ? 'bg-gradient-to-br from-red-500 to-red-700 shadow-red-300/50 animate-pulse ring-4 ring-red-200'
                : 'bg-gradient-to-br from-purple-500 to-purple-700 shadow-purple-300/50'
          }`}
        >
          {isListening ? <MicOff size={26} strokeWidth={2.2} /> : <Mic size={26} strokeWidth={2.2} />}
        </button>
      </div>

      {/* Saved Products FAB */}
      <div className="flex items-center gap-2">
        <span className="px-3 py-1.5 rounded-lg bg-gray-900/80 text-white text-xs font-semibold shadow-lg backdrop-blur-sm">
          {t('addProduct')}
        </span>
        <button
          onClick={onAdd}
          aria-label={t('addProduct')}
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-300/50 flex items-center justify-center text-white hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
        >
          <Plus size={30} strokeWidth={2.8} />
        </button>
      </div>
    </div>
  )
}

export default React.memo(FloatingActions)
