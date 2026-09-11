import React from 'react'
import { useLanguage } from '../i18n'

function CustomerDetailsModal({ isOpen, onClose, onSave, onSaveAndPrint }) {
  const { t } = useLanguage()
  const [customerName, setCustomerName] = React.useState('')
  const [phoneNumber, setPhoneNumber] = React.useState('')

  React.useEffect(() => {
    if (!isOpen) {
      setCustomerName('')
      setPhoneNumber('')
    }
  }, [isOpen])

  const handleSaveOnly = () => {
    onSave({ customerName, phoneNumber })
  }

  const handleSaveAndPrint = () => {
    onSaveAndPrint({ customerName, phoneNumber })
  }

  if (!isOpen) return null

  return (
    <div className="print:hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            {t('customerDetails') || 'வாடிக்கையாளர் விவரங்கள்'}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {t('customerName') || 'வாடிக்கையாளர் பெயர்'}
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={t('customerNamePlaceholder') || 'வாடிக்கையாளர் பெயர் உள்ளிடவும்'}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {t('phoneNumber') || 'அலைபேசி எண்'}
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder={t('phoneNumberPlaceholder') || 'அலைபேசி எண்ணை உள்ளிடவும்'}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleSaveOnly}
            className="flex-1 rounded-xl bg-[#1fbf68] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#18ab5b] active:bg-[#14943e]"
          >
            {t('saveOnly') || 'சேமி மட்டும்'}
          </button>

          <button
            type="button"
            onClick={handleSaveAndPrint}
            className="flex-1 rounded-xl bg-[#2E1A52] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a2d7a] active:bg-[#1a0f30]"
          >
            {t('saveAndPrint') || 'சேமி & அச்சியிடு'}
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 active:bg-slate-100"
        >
          {t('cancel') || 'ரத்து'}
        </button>
      </div>
    </div>
  )
}

export default React.memo(CustomerDetailsModal)
