import React from 'react'
import { Settings, Clock, PackagePlus, Zap } from 'lucide-react'
import { useLanguage } from '../i18n'

function Header({ onSettingsClick, onAddItem, onHistoryClick }) {
  const { t } = useLanguage()

  return (
    <header className="app-header print:hidden bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
      <div className="app-header-inner px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left Side Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-md">
              <Zap size={22} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-gray-900 leading-tight tracking-tight">
                SmartBiller
              </h1>
              <span className="text-xs text-gray-500 font-medium">
                {t('newReceipt')}
              </span>
            </div>
          </div>

          {/* Right Side Action Items */}
          <div className="app-header-actions flex items-center gap-1">
            <button
              aria-label={t('savedProducts')}
              title={t('savedProducts')}
              onClick={onAddItem}
              className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-gray-600 hover:bg-green-50 hover:text-green-600 transition-all active:scale-95"
            >
              <PackagePlus size={18} strokeWidth={2} />
              <span className="text-[10px] font-semibold leading-none">{t('savedProducts')}</span>
            </button>

            <button
              aria-label={t('history')}
              title={t('history')}
              onClick={onHistoryClick}
              className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-indigo-600 transition-all active:scale-95"
            >
              <Clock size={18} strokeWidth={2} />
              <span className="text-[10px] font-semibold leading-none">{t('history')}</span>
            </button>

            <button
              aria-label={t('settings')}
              title={t('settings')}
              onClick={onSettingsClick}
              className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-indigo-600 transition-all active:scale-95"
            >
              <Settings size={18} strokeWidth={2} />
              <span className="text-[10px] font-semibold leading-none">{t('settings')}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default React.memo(Header)
