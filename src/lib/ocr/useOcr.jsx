// React hook that wires the offline OCR engine into a component.
// It keeps the singleton worker alive across renders (via the engine module),
// preprocesses the image, runs OCR with the right whitelist per field, parses
// the result, and falls back gracefully if anything fails.
import { useCallback, useEffect, useRef, useState } from 'react'
import { cropRegion, PREPROCESS_LABEL_DEFAULTS } from './imagePreprocess'
import { parseProductFields } from './extractProduct'

const NAME_REGION = { x: 0.05, y: 0.0, w: 0.9, h: 0.45 }

export function useOcr() {
  const [status, setStatus] = useState('idle') // idle | loading | extracting | done | error
  const [progress, setProgress] = useState(0)
  const [fields, setFields] = useState({ name: null, nameSource: null, confidence: 0, price: null, barcode: null })
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const reset = useCallback(() => {
    setStatus('idle')
    setProgress(0)
    setFields({ name: null, nameSource: null, confidence: 0, price: null, barcode: null })
    setError(null)
  }, [])

  /**
  * Extract product-name text from the front photo only.
   * @param {{front?:any,back?:any}} photos data URLs / blobs / File objects
   */
  const extract = useCallback(async (photos) => {
    if (!photos || (!photos.front && !photos.back)) return null
    const { recognizeText, resetOcrWorker } = await import('./ocrEngine')
    setStatus('loading')
    setProgress(0)
    setError(null)

    const merged = { name: null, nameSource: null, confidence: 0 }

    const runSide = async (source, region, whitelist, psm, preprocessCfg, parser) => {
      try {
        const prepared = await cropRegion(source, region, preprocessCfg)
        const data = await recognizeText(prepared, { whitelist, psm })
        if (!mountedRef.current) return
        const parsed = parser(data.text, data.confidence)

        if (whitelist === 'name') {
          if (parsed.name && !merged.name) {
            merged.name = parsed.name
            merged.nameSource = parsed.nameSource
            merged.confidence = Math.max(merged.confidence, parsed.confidence)
          } else if (!merged.name) {
            const raw = (data.text || '').replace(/\s+/g, ' ').trim()
            if (raw) {
              merged.name = raw
              merged.nameSource = 'raw'
              merged.confidence = Math.max(
                merged.confidence,
                typeof data.confidence === 'number' ? data.confidence / 100 : 0
              )
            }
          }
        }
      } catch (err) {
        console.error('OCR side failed:', err)
      }
    }

    // Tesseract exposes one shared worker. Queue the sides to avoid competing
    // recognition calls and two full canvas preprocessing jobs at once.
    const tasks = []
    if (photos.front) {
      tasks.push(() => runSide(photos.front, NAME_REGION, 'name', 7, PREPROCESS_LABEL_DEFAULTS, parseProductFields))
    }

    try {
      for (const task of tasks) {
        await task()
      }
    } catch (err) {
      console.error('OCR extract failed:', err)
      await resetOcrWorker().catch(() => {})
    }

    if (!mountedRef.current) return null
    setFields(merged)
    setStatus('done')
    setError(null)
    return merged
  }, [])

  return { status, progress, fields, error, extract, reset }
}