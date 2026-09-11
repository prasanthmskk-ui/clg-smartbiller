import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.jsx'
import { registerServiceWorker } from '../lib/ocr/registerServiceWorker'

const isKnownExtensionError = (event) => {
	const filename = String(event?.filename || event?.reason?.filename || '')
	const reason = event?.reason
	const message = String(event?.message || event?.error?.message || reason?.message || reason || '')
	const stack = String(event?.error?.stack || reason?.stack || '')
	const source = `${filename}\n${stack}`
	const isExtensionSource = /(?:chrome|edge|moz|safari)-extension:\/\//i.test(source)
	const isGeneratedExtensionFrame = /(?:^|[\s(])VM\d+:/i.test(source)
	return (isExtensionSource || isGeneratedExtensionFrame) && /reading ['"]startTime['"]/.test(message)
}

window.addEventListener('error', (event) => {
	if (isKnownExtensionError(event)) {
		event.preventDefault()
		event.stopImmediatePropagation()
	}
}, true)

window.addEventListener('unhandledrejection', (event) => {
	if (isKnownExtensionError(event)) {
		event.preventDefault()
		event.stopImmediatePropagation()
	}
}, true)

registerServiceWorker()

createRoot(document.getElementById('root')).render(<App />)
