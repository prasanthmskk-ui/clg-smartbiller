import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, Search, ArrowLeft, Receipt } from 'lucide-react'
import { useLanguage } from '../i18n'
import PrintableInvoice from '../components/PrintableInvoice'
import { apiFetch, getLocalStorageReceipts } from '../utils/api'

export default function SavedReceipts() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [receipts, setReceipts] = React.useState([])
  const [search, setSearch] = React.useState('')
  const deferredSearch = React.useDeferredValue(search)
  const [loading, setLoading] = React.useState(true)
  const [serverUnavailable, setServerUnavailable] = React.useState(false)
  const [expandedId, setExpandedId] = React.useState(null)
  const [printReceipt, setPrintReceipt] = React.useState(null)
  const [printReady, setPrintReady] = React.useState(false)

  React.useEffect(() => {
    const fetchReceipts = async () => {
      setLoading(true)
      setServerUnavailable(false)
      try {
        const response = await apiFetch('/api/receipts')
        const data = await response.json()
        const usingLocalFallback = response.headers.get('X-Database-Fallback') === 'local'
        setReceipts(usingLocalFallback ? getLocalStorageReceipts() : (Array.isArray(data) ? data : []))
      } catch (err) {
        console.warn('Server unavailable; loading receipts from LocalStorage:', err?.message)
        setReceipts(getLocalStorageReceipts())
        setServerUnavailable(true)
      } finally {
        setLoading(false)
      }
    }

    fetchReceipts()
  }, [])

  const retryFetch = React.useCallback(() => {
    setLoading(true)
    setServerUnavailable(false)
    apiFetch('/api/receipts')
      .then(async (response) => {
        const data = await response.json()
        const usingLocalFallback = response.headers.get('X-Database-Fallback') === 'local'
        setReceipts(usingLocalFallback ? getLocalStorageReceipts() : (Array.isArray(data) ? data : []))
      })
      .catch((err) => {
        console.warn('Retry failed:', err?.message)
        setReceipts(getLocalStorageReceipts())
        setServerUnavailable(true)
      })
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => {
    const handleAfterPrint = () => {
      setPrintReceipt(null)
      setPrintReady(false)
    }
    window.addEventListener('afterprint', handleAfterPrint)
    return () => window.removeEventListener('afterprint', handleAfterPrint)
  }, [])

  React.useEffect(() => {
    if (printReady) {
      window.print()
      setPrintReady(false)
    }
  }, [printReady])

  const filteredReceipts = React.useMemo(() => receipts.filter((receipt) => {
    const query = deferredSearch.toLowerCase()
    const name = (receipt.customer_name || '').toLowerCase()
    const phone = (receipt.phone_number || '').toLowerCase()
    return name.includes(query) || phone.includes(query)
  }), [receipts, deferredSearch])

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toISOString().split('T')[0]
  }

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const handleRePrint = (receipt, e) => {
    e.stopPropagation()
    setPrintReceipt({
      customerName: receipt.customer_name,
      phoneNumber: receipt.phone_number,
      date: receipt.created_at || receipt.date,
      items: (receipt.items || []).map((item) => ({
        name: item.product_name,
        quantity: item.quantity || 1,
        price: item.price || 0,
      })),
      totalAmount: receipt.total_amount || receipt.totalAmount,
    })
    setPrintReady(true)
  }

  return (
    <div className="saved-receipts-page print:hidden min-h-screen flex flex-col bg-slate-50">
      <header className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => navigate('/new-receipt')}
          className="p-2 rounded-lg bg-white/60 shadow-sm transition-colors hover:bg-white/80"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">சேமித்த ரசீதுகள்</h1>
      </header>

      <main className="saved-receipts-main flex-1 p-4">
        <div className="mb-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="பெயர் அல்லது எண் மூலம் தேட..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-slate-500">Loading receipts...</p>
          </div>
        ) : serverUnavailable ? (
          <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
            <p className="font-semibold text-amber-800">Billing server unavailable</p>
            <p className="mt-1 text-sm text-amber-700">Showing locally saved receipts. Start the app with `npm run dev` and retry.</p>
            <button
              type="button"
              onClick={retryFetch}
              className="mt-4 rounded-xl bg-amber-600 px-5 py-3 font-semibold text-white transition hover:bg-amber-700"
            >
              Retry connection
            </button>
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center">
            <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Receipt size={40} className="text-slate-400" />
            </div>
            <p className="text-gray-500 text-base">{t('noSavedReceipts')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReceipts.map((receipt) => {
              const isExpanded = expandedId === receipt.id
              const customerName = receipt.customer_name?.trim() || 'Guest'
              const customerPhone = receipt.phone_number?.trim()
              return (
                <div
                  key={receipt.id}
                  className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleExpand(receipt.id)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="receipt-card-title text-base font-bold text-slate-900 truncate">
                        {customerName}{customerPhone ? ` (${customerPhone})` : ''}
                      </p>
                      <p className="receipt-card-meta text-sm text-slate-500">
                        தேதி: {formatDate(receipt.created_at || receipt.date)} | மொத்தம்: ₹{Number(receipt.total_amount || receipt.totalAmount).toFixed(2)}
                      </p>
                    </div>
                    <div className="ml-3">
                      {isExpanded ? (
                        <ChevronUp size={20} className="text-slate-400" />
                      ) : (
                        <ChevronDown size={20} className="text-slate-400" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50 p-4">
                      {receipt.items && receipt.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-sm mb-2"
                        >
                          <span className="text-slate-900">{item.product_name}</span>
                          <span className="text-slate-600">
                            {item.quantity} x ₹{Number(item.price || 0).toFixed(2)} = ₹{(Number(item.price || 0) * Number(item.quantity)).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      <div className="text-center mt-4">
                        <button
                          onClick={(e) => handleRePrint(receipt, e)}
                          className="px-5 py-2 rounded-full border border-indigo-500 bg-white text-indigo-600 font-bold text-sm hover:bg-indigo-50 transition inline-flex items-center gap-2"
                        >
                          🖨️ மீண்டும் அச்சியிடு
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {printReceipt && (
        <PrintableInvoice selectedReceipt={printReceipt} />
      )}
    </div>
  )
}
