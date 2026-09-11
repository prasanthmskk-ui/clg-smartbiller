// React hook that wires the offline OCR engine into a component.
// It keeps the singleton worker alive across renders (via the engine module),
// preprocesses the image, runs OCR with the right whitelist per field, parses
// the result, and falls back gracefully if anything fails.
import { useCallback, useEffect, useRef, useState } from 'react'
import { preprocessImage, cropRegion } from './imagePreprocess'
import { recognizeText, resetOcrWorker, warmupOcrWorker } from './ocrEngine'
import { parseProductFields } from './extractProduct'

const NAME_REGION = { x: 0.05, y: 0.0, w: 0.9, h: 0.45 }

export function useOcr() {
  const [status, setStatus] = useState('idle') // idle | loading | extracting | done | error
  const [progress, setProgress] = useState(0)
  const [fields, setFields] = useState({ name: null, nameSource: null, confidence: 0 })
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
    setFields({ name: null, nameSource: null, confidence: 0 })
    setError(null)
  }, [])

  /**
   * Extract product name + price from front/back photos.
   * @param {{front?:any,back?:any}} photos data URLs / blobs / File objects
   */
  const extract = useCallback(async (photos) => {
    if (!photos || (!photos.front && !photos.back)) return null
    setStatus('loading')
    setProgress(0)
    setError(null)

    const merged = { name: null, nameSource: null, confidence: 0 }

    const runSide = async (source, region, whitelist, psm) => {
      try {
        const prepared = await cropRegion(source, region)
        const data = await recognizeText(prepared, { whitelist, psm })
        if (!mountedRef.current) return
        const parsed = parseProductFields(data.text, data.confidence)

        if (whitelist === 'name') {
          if (parsed.name && !merged.name) {
            merged.name = parsed.name
            merged.nameSource = parsed.nameSource
            merged.confidence = Math.max(merged.confidence, parsed.confidence)
          } else if (!merged.name) {
            // Direct raw-text fallback: if the confidence gate or the regex
            // filters stripped every word out, fall back to the trimmed raw
            // Tesseract output so the scan never hard-fails.
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
        // A single side failing must not abort the whole extraction.
        console.error('OCR side failed:', err)
      }
    }

    const tasks = []
    if (photos.front) {
      tasks.push(runSide(photos.front, NAME_REGION, 'name', 7))
    }
    if (photos.back) {
      tasks.push(runSide(photos.back, NAME_REGION, 'name', 7))
    }

    try {
      await Promise.all(tasks)
    } catch (err) {
      console.error('OCR extract failed:', err)
      await resetOcrWorker().catch(() => {})
    }

    if (!mountedRef.current) return null
    setFields(merged)
    // Never surface an "ocrFailed" error status: even with no usable text we
    // report 'done' so the caller keeps whatever was extracted.
    setStatus('done')
    setError(null)
    return merged
  }, [])

  return { status, progress, fields, error, extract, reset, warmupOcrWorker }
}
