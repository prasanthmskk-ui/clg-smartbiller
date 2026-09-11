import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const translations = {
  ta: {
    newReceipt: 'புதிய ரசீது',
    addItem: 'பொருள் சேர்',
    savedProducts: 'சேமிக்கப்பட்ட பொருட்கள்',
    scanBarcode: 'பார்கோடு ஸ்கேன்',
    voiceAdd: 'குரல் வழி சேர்க்கை',
    settings: 'அமைப்புகள்',
    history: 'வரலாறு',
    total: 'மொத்தம்',
    delete: 'அழி',
    paySave: 'பணம் செலுத்து & சேமி',
    noItems: 'ரசீதில் பொருட்கள் இல்லை.',
    tapAdd: 'சேர்க்க + ஐ அழுத்தவும்.',
    language: 'மொழி',
    tamil: 'தமிழ்',
    english: 'English',
    close: 'மூடு',
    addProduct: 'பொருளை சேர்க்க',
    addProductTitle: 'பொருளை சேர்',
    addProductPlaceholder: 'இந்தப் பக்கம் பொருள் சேர்க்கும் படிவத்தை கொண்டிருக்கும்.',
    defaultProductName: 'பொருள்',
    settingsTitle: 'அமைப்புகள்',
    productMgmtEmptyTitle: 'பொருட்கள்',
    productMgmtEmptyTitle2: 'காணப்படவில்லை.',
    productMgmtEmptyTitle3: 'சேர்க்க + ஐ அழுத்தவும்.',
    productName: 'பொருளின் பெயர்',
    tamilName: 'தமிழ் பெயர் (விருப்பத்திற்கு)',
    productPrice: 'விலை',
    priceLabel: 'விலை',
    barcodeOptional: 'பார்கோடு (விருப்பத்திற்கு)',
    scan: 'ஸ்கேன்',
    saveProduct: '💾 பொருளை சேமி',
    smartAutoFill: 'ஸ்மார்ட் ஆட்டோ-ஃபில் (ஆஃப்லைன்)',
    smartAutoFillDescription: 'பெயரை தானாக கண்டறிய பொருளின் முன்பக்கத்தைப் படியுங்கள்,\nமற்றும் விலைக்காக இரண்டு பக்கங்களையும் பிடிக்கவும்.',
    frontName: 'முன் (பெயர்)',
    backPrice: 'பின் (விலை)',
    extractText: '✨ உரையை எடு',
    extracting: 'உரையை பிரித்தெடுக்கிறது...',
    ocrFailed: 'உரை எடுக்க முடியவில்லை. மேலும் தெளிவான புகைப்படம் முயற்சிக்கவும்.',
    back: 'மீண்டும்',
    productFormTitle: 'பொருளை சேர்',
    tamilNameOptional: 'தமிழ் பெயர் (விருப்பத்திற்கு)',
    productSavedSuccess: 'பொருள் வெற்றிகரமாக சேர்க்கப்பட்டது',
    barcodeExists: 'இந்த பார்கோட்டுடன் ஏற்கனவே ஒரு பொருள் உள்ளது!',
    editProduct: 'பொருளை திருத்து',
    productNotFound: 'பொருள் காணப்படவில்லை',
    productNotFoundHint: 'முதலில் இந்தப் பொருளை சேர்க்கவும்.',
    customerDetails: 'வாடிக்கையாளர் விவரங்கள்',
    customerName: 'வாடிக்கையாளர் பெயர்',
    customerNamePlaceholder: 'வாடிக்கையாளர் பெயர் உள்ளிடவும்',
    phoneNumber: 'அலைபேசி எண்',
    phoneNumberPlaceholder: 'அலைபேசி எண்ணை உள்ளிடவும்',
    saveOnly: 'சேமி மட்டும்',
    saveAndPrint: 'சேமி & அச்சியிடு',
    cancel: 'ரத்து',
    saveSuccess: 'ரசீது வெற்றிகரமாக சேமிக்கப்பட்டது',
    savedReceipts: 'சேமிக்கப்பட்ட ரசீதுகள்',
    searchPlaceholder: 'பெயர் அல்லது தொலைபேசி எண்ணால் தேடு',
    date: 'தேதி',
    amount: 'தொகை',
    items: 'பொருட்கள்',
    noSavedReceipts: 'சேமிக்கப்பட்ட ரசீதுகள் இல்லை.',
    backToReceipt: 'ரசீதுக்கு திரும்பு',
    searchProducts: 'பொருட்களை தேடு',
    voiceSearch: 'குரல் தேடல்',
    listening: 'கேட்கிறது...',
    noMatchingProducts: 'பொருந்தும் பொருட்கள் இல்லை',
    voiceNotSupported: 'இந்த ப\u0b9e\u0b9fதளத்தில் குரல் தேடல் ஆதரிக்கப்படவில்லை',
    voiceRequiresHttps: 'குரல் தேடலுக்கு HTTPS அல்லது localhost தேவை',
    voiceUnavailable: 'குரல் தேடல் கிடைக்கவில்லை',
    clearSearch: 'தேடலை அழி'
  },
  en: {
    newReceipt: 'New Receipt',
    addItem: 'Add Item',
    savedProducts: 'Saved Products',
    scanBarcode: 'Scan Barcode',
    voiceAdd: 'Voice Add',
    settings: 'Settings',
    history: 'History',
    total: 'Total',
    delete: 'Delete',
    paySave: 'Pay & Save',
    noItems: 'No items in the receipt.',
    tapAdd: 'Press the add + button.',
    language: 'Language',
    tamil: 'தமிழ்',
    english: 'English',
    close: 'Close',
    addProduct: 'Add Product',
    addProductTitle: 'Add Product',
    addProductPlaceholder: 'This page will contain the Add Product form.',
    defaultProductName: 'Product',
    settingsTitle: 'Settings',
    productMgmtEmptyTitle: 'No products',
    productMgmtEmptyTitle2: 'found.',
    productMgmtEmptyTitle3: 'Press the add + button.',
    productName: 'Product Name',
    tamilName: 'Tamil Name (Optional)',
    productPrice: 'Price',
    priceLabel: 'Price',
    barcodeOptional: 'Barcode (Optional)',
    scan: 'Scan',
    saveProduct: '💾 Save Product',
    smartAutoFill: 'Smart Auto-Fill (Offline)',
    smartAutoFillDescription: 'Capture product front to automatically detect\nname, and both sides for price.',
    frontName: 'Front (Name)',
    backPrice: 'Back (Price)',
    extractText: '✨ Extract Text',
    extracting: 'Extracting...',
    ocrFailed: 'Could not read the label. Try a clearer photo.',
    back: 'Back',
    productFormTitle: 'Add Product',
    tamilNameOptional: 'Tamil Name (Optional)',
    productSavedSuccess: 'Product saved successfully!',
    barcodeExists: 'A product with this barcode already exists!',
    editProduct: 'Edit Product',
    productNotFound: 'Product not found',
    productNotFoundHint: 'Please add this product first.',
    customerDetails: 'Customer Details',
    customerName: 'Customer Name',
    customerNamePlaceholder: 'Enter customer name',
    phoneNumber: 'Phone Number',
    phoneNumberPlaceholder: 'Enter phone number',
    saveOnly: 'Save Only',
    saveAndPrint: 'Save & Print',
    cancel: 'Cancel',
    saveSuccess: 'Receipt saved successfully',
    savedReceipts: 'Saved Receipts',
    searchPlaceholder: 'Search by name or phone',
    date: 'Date',
    amount: 'Amount',
    items: 'Items',
    noSavedReceipts: 'No saved receipts found.',
    backToReceipt: 'Back to Receipt',
    searchProducts: 'Search products',
    voiceSearch: 'Voice search',
    listening: 'Listening...',
    noMatchingProducts: 'No matching products found',
    voiceNotSupported: 'Voice search is not supported in this browser',
    voiceRequiresHttps: 'Voice search requires HTTPS or localhost',
    voiceUnavailable: 'Voice search unavailable',
    clearSearch: 'Clear search'
  }
}

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('app-language')
    return saved === 'en' || saved === 'ta' ? saved : 'ta'
  })

  useEffect(() => {
    localStorage.setItem('app-language', language)
  }, [language])

  const value = useMemo(() => ({
    language,
    setLanguage,
    t: (key) => translations[language][key] || translations.ta[key] || key
  }), [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)

  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider')
  }

  return context
}

export const i18n = translations
