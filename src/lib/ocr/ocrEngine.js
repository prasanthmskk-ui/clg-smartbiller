// Offline-first Tesseract worker engine.
//
// Workers are deliberately scoped to one recognition. Tesseract's WASM heap
// can remain large after a scan, so keeping a worker singleton alive causes
// repeated scans to accumulate memory on mobile and desktop browsers.

import { createWorker, OEM } from 'tesseract.js'

// Language data is served from our own origin (public/tessdata) instead of the
// Tesseract CDN. The .gz files are cached by the service worker for offline use.
const LANG_PATH = '/tessdata'
const MAX_OCR_WIDTH = 1600
const MAX_OCR_HEIGHT = 1600

// Whitelists: restricting the character set is a huge recognition speed-up and
// also cuts OCR noise. English-only (no Tamil model) keeps the download tiny.
export const WHITELIST = {
  name: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,-&/\'',
}

let workerPromise = null
let progressHandler = null

/**
 * Fully decode an image source into canvas pixels before handing it to OCR.
 * This is especially important for WebP blobs and blob URLs: assigning their
 * URL to an image element does not guarantee that its pixels are available
 * when a consumer starts reading it.
 * @param {any} source
 * @returns {Promise<HTMLCanvasElement|any>}
 */
export async function decodeImageForOcr(source) {
  if (typeof HTMLCanvasElement !== 'undefined' && source instanceof HTMLCanvasElement) {
    return source
  }
  if (typeof OffscreenCanvas !== 'undefined' && source instanceof OffscreenCanvas) {
    return source
  }

  const image = new Image()
  image.crossOrigin = 'anonymous'
  let objectUrl = null
  try {
    objectUrl = source instanceof Blob ? URL.createObjectURL(source) : null
    image.src = objectUrl || source

    if (typeof image.decode === 'function') {
      await image.decode()
    } else {
      await new Promise((resolve, reject) => {
        image.onload = resolve
        image.onerror = reject
      })
    }

    const sourceWidth = image.naturalWidth || image.width
    const sourceHeight = image.naturalHeight || image.height
    if (!sourceWidth || !sourceHeight) throw new Error('Image decoded without pixel dimensions')

    const scale = Math.min(1, MAX_OCR_WIDTH / sourceWidth, MAX_OCR_HEIGHT / sourceHeight)
    const width = Math.max(1, Math.round(sourceWidth * scale))
    const height = Math.max(1, Math.round(sourceHeight * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('Canvas rendering is unavailable')
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, 0, 0, width, height)

    // Reading the pixels forces WebP materialization before Tesseract sees it.
    context.getImageData(0, 0, width, height)
    return canvas
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
  }
}

function handleProgress(m) {
  if (typeof progressHandler === 'function' && m && typeof m.progress === 'number') {
    progressHandler(m)
  }
}

/** Create a worker for one OCR operation. Language data remains browser-cached. */
export function getOcrWorker(onProgress) {
  if (onProgress) progressHandler = onProgress
  workerPromise = createWorker('eng', OEM.LSTM_ONLY, {
    langPath: LANG_PATH,
    gzip: true,
    cacheMethod: 'refresh',
    logger: (message) => {
      if (message && typeof message.progress === 'number') {
        handleProgress(message)
      }
    },
  }, {
    tessedit_pageseg_mode: '6', // Assume a single uniform block of text.
  })
  return workerPromise
}

/** Pre-load language data, then release the temporary worker immediately. */
export async function warmupOcrWorker(onProgress) {
  const worker = await getOcrWorker(onProgress)
  try {
    await worker.terminate()
  } finally {
    workerPromise = null
  }
}

export function setOcrProgressHandler(fn) {
  progressHandler = fn
}

/**
 * Run OCR on a preprocessed image/canvas.
 * @param {any} image preprocessed canvas/blob/dataURL
 * @param {object} [opts]
 * @param {'name'|string} [opts.whitelist] preset key or explicit string
 * @param {number} [opts.psm] page segmentation mode
 */
export async function recognizeText(image, opts = {}) {
  const whitelist =
    typeof opts.whitelist === 'string' && WHITELIST[opts.whitelist]
      ? WHITELIST[opts.whitelist]
      : opts.whitelist || WHITELIST.name

  let worker = null
  try {
    worker = await getOcrWorker()
    const decodedImage = await decodeImageForOcr(image)
    const { data } = await worker.recognize(decodedImage, {
      tessedit_char_whitelist: whitelist,
      ...(opts.psm != null ? { tessedit_pageseg_mode: opts.psm } : {}),
    }, { text: true, blocks: false, hocr: false, tsv: false })
    return data
  } catch (err) {
    // OCR must never hard-fail the scan. Reset the (possibly dead) worker so
    // the next call rebuilds it, then return an empty-safe result so callers
    // can apply their own raw-text fallback.
    console.error('OCR recognize failed:', err)
    return { text: '', confidence: 0 }
  } finally {
    if (worker) {
      await worker.terminate().catch(() => {})
    }
    workerPromise = null
  }
}

/** Force a fresh worker (e.g. after a fatal error) so the next call rebuilds it. */
export async function resetOcrWorker() {
  if (workerPromise) {
    try {
      const w = await workerPromise
      await w.terminate()
    } catch {
      /* noop */
    }
  }
  workerPromise = null
}
