import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LanguageProvider } from './i18n'

const NewReceipt = React.lazy(() => import('./pages/NewReceipt'))
const AddProduct = React.lazy(() => import('./pages/AddProduct'))
const AddItem = React.lazy(() => import('./pages/AddItem'))
const SavedReceipts = React.lazy(() => import('./pages/SavedReceipts'))

const STORAGE_KEY = 'smartbiller_products'

const loadSavedItems = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
          ...item,
          productName: item.productName || item.name || ''
        }))
      }
    }
  } catch (e) {
    console.error('Failed to load products from LocalStorage:', e)
  }
  return []
}

export default function App() {
  const [cart, setCart] = React.useState([])
  const [savedItems, setSavedItems] = React.useState(() => loadSavedItems())

  const handleProductSaved = React.useCallback((product, editingId) => {
    if (editingId) {
      setSavedItems((prev) => prev.map((item) => (item.id === editingId ? product : item)))
    } else {
      setSavedItems((prev) => [...prev, product])
    }
  }, [])

  React.useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          if (Array.isArray(parsed)) {
            setSavedItems(parsed.map((item) => ({
              ...item,
              productName: item.productName || item.name || ''
            })))
          }
        } catch (err) {
          console.error('Failed to sync products from LocalStorage:', err)
        }
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedItems))
    } catch (e) {
      console.error('Failed to save products to LocalStorage:', e)
    }
  }, [savedItems])

  return (
    <LanguageProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <React.Suspense fallback={<div className="route-loading" role="status" aria-live="polite" />}>
          <Routes>
            <Route path="/" element={<Navigate to="/new-receipt" replace />} />
            <Route path="/new-receipt" element={<NewReceipt cart={cart} setCart={setCart} savedItems={savedItems} />} />
            <Route path="/add-product" element={<AddProduct onProductSaved={handleProductSaved} existingProducts={savedItems} />} />
            <Route path="/add-item" element={<AddItem savedItems={savedItems} setSavedItems={setSavedItems} setCart={setCart} />} />
            <Route path="/saved-receipts" element={<SavedReceipts />} />
          </Routes>
        </React.Suspense>
      </BrowserRouter>
    </LanguageProvider>
  )
}
