import React from 'react'
import { Printer, Trash2, ShoppingBag } from 'lucide-react'
import { useLanguage } from '../i18n'

function SummaryPanel({ total = 0, onDelete, onPaySave, className }) {
  const { t } = useLanguage()
  const isEmpty = total <= 0

  return (
    <div className={`app-summary-panel print:hidden bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] rounded-t-3xl z-10 ${className || ''}`}>
      {/* Total Amount Section */}
      <div className="px-5 pt-4 pb-3 bg-gradient-to-r from-slate-50 to-gray-50 rounded-t-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-600 uppercase tracking-wide">
              {t('total')}
            </span>
          </div>
          <div className="text-3xl font-extrabold text-gray-900 tracking-tight">
            ₹{total.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-5 pb-4 pt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={onDelete}
          disabled={isEmpty}
          className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all ${
            isEmpty
              ? 'cursor-not-allowed bg-gray-100 text-gray-400'
              : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 active:scale-95'
          }`}
        >
          <Trash2 size={18} />
          <span>{t('delete')}</span>
        </button>

        <button
          type="button"
          onClick={isEmpty ? undefined : onPaySave}
          disabled={isEmpty}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-bold transition-all ${
            isEmpty
              ? 'cursor-not-allowed bg-gray-100 text-gray-400'
              : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-400/40 hover:shadow-xl hover:from-indigo-600 hover:to-purple-700 active:scale-[0.98]'
          }`}
        >
          <Printer size={20} />
          <span>{t('paySave')}</span>
        </button>
      </div>
    </div>
  )
}

export default React.memo(SummaryPanel)
