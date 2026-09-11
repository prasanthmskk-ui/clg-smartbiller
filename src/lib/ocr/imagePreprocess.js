// Image preprocessing pipeline for OCR.
// Goal: shrink the image to a safe max width with smooth downscaling, convert
// to grayscale and apply a binarization threshold so Tesseract has clean input.
// Contrast is kept neutral so curved/colorful text on packaging is not washed
// out before binarization. All of this runs on the main thread via <canvas>
// (cheap) BEFORE the heavy OCR work is handed to the Web Worker.

export const PREPROCESS_DEFAULTS = {
  maxWidth: 800,
  maxHeight: 800,
  contrast: 1.0,
  brightness: 0,
  // When null we compute an Otsu threshold automatically (best for mixed
  // lighting). Set a fixed 0-255 value only for very consistent label photos.
  threshold: null,
  outputType: 'image/jpeg',
  quality: 0.82,
}

export const PREPROCESS_LABEL_DEFAULTS = {
  maxWidth: 1000,
  maxHeight: 1000,
  contrast: 1.8,
  brightness: 10,
  threshold: null,
  outputType: 'image/jpeg',
  quality: 0.9,
}

function loadSource(source) {
  return new Promise((resolve, reject) => {
    if (source instanceof HTMLCanvasElement || source instanceof OffscreenCanvas) {
      resolve(source)
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    let objectUrl = null
    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      resolve(img)
    }
    img.onerror = (e) => reject(e)
    objectUrl = source instanceof Blob ? URL.createObjectURL(source) : null
    img.src = objectUrl || source
  })
}

function computeOtsuThreshold(histogram, total) {
  let sum = 0
  for (let t = 0; t < 256; t++) sum += t * histogram[t]
  let sumB = 0
  let wB = 0
  let maxVar = 0
  let threshold = 128
  for (let t = 0; t < 256; t++) {
    wB += histogram[t]
    if (wB === 0) continue
    const wF = total - wB
    if (wF === 0) break
    sumB += t * histogram[t]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const between = wB * wF * (mB - mF) * (mB - mF)
    if (between > maxVar) {
      maxVar = between
      threshold = t
    }
  }
  return threshold
}

/**
 * Preprocess an image for OCR.
 * @param {string|Blob|File|HTMLImageElement|HTMLCanvasElement} source
 * @param {Partial<typeof PREPROCESS_DEFAULTS>} [options]
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function preprocessImage(source, options = {}) {
  const cfg = { ...PREPROCESS_DEFAULTS, ...options }
  const img = await loadSource(source)

  let { width, height } = img
  const scale = Math.min(1, cfg.maxWidth / width, cfg.maxHeight / height)
  width = Math.max(1, Math.round(width * scale))
  height = Math.max(1, Math.round(height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas rendering is unavailable')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, width, height)

  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  const factor = cfg.contrast
  const intercept = cfg.brightness

  const histogram = cfg.threshold == null ? new Array(256).fill(0) : null
  let pixelCount = 0
  for (let i = 0; i < data.length; i += 4) {
    let gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
    gray = factor * (gray - 128) + 128 + intercept
    gray = gray < 0 ? 0 : gray > 255 ? 255 : gray
    if (histogram) {
      histogram[gray | 0]++
      pixelCount++
    }
    let v = gray
    if (cfg.threshold != null) {
      v = gray > cfg.threshold ? 255 : 0
    }
    data[i] = data[i + 1] = data[i + 2] = v
  }

  if (cfg.threshold == null) {
    const threshold = computeOtsuThreshold(histogram, pixelCount)
    for (let i = 0; i < data.length; i += 4) {
      const v = data[i] > threshold ? 255 : 0
      data[i] = data[i + 1] = data[i + 2] = v
    }
  }

  ctx.putImageData(imageData, 0, 0)
  return canvas
}

/**
 * Crop a region of an image (region values are fractions 0-1 of the source).
 * Useful to isolate the brand/name zone vs. the price zone before OCR.
 */
export async function cropRegion(source, region, options = {}) {
  const img = await loadSource(source)
  const sx = Math.max(0, Math.round(img.width * region.x))
  const sy = Math.max(0, Math.round(img.height * region.y))
  const sw = Math.max(1, Math.min(img.width - sx, Math.round(img.width * region.w)))
  const sh = Math.max(1, Math.min(img.height - sy, Math.round(img.height * region.h)))

  const canvas = document.createElement('canvas')
  canvas.width = sw
  canvas.height = sh
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas rendering is unavailable')
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
  return preprocessImage(canvas, options)
}

export function canvasToBlob(canvas, type = 'image/jpeg', quality = 0.82) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}
