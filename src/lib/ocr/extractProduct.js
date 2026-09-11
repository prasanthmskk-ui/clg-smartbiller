// Turn raw OCR text into structured product name.
// Returns the exact extracted text without forced catalog matching.
const NOISE = /^(?:[0o]{2,}|[il]{3,}|[1l]{3,}|[5s]{3,}|[.]{2,})$/i

/** Clean raw OCR into plausible product-name words (drops noise + pure numbers). */
export function cleanNameWords(text) {
  const cleaned = text
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\d+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
  if (!cleaned) return []

  return cleaned
    .split(/\s+/)
    .filter((word) => {
      if (word.length < 2 || word.length > 20) return false
      if (NOISE.test(word)) return false
      const vowels = (word.match(/[aeiou]/gi) || []).length
      return vowels > 0 && word.length - vowels > 0
    })
}

/** Remove junk/gibberish from OCR text, keeping only English words with 3+ letters. */
export function cleanText(rawText) {
  if (!rawText) return ''
  return rawText
    .split(/\s+/)
    .filter((word) => /^[A-Za-z]{3,}$/.test(word))
    .join(' ')
}

/**
 * Extract a price-like number from OCR text.
 * Matches patterns like: Rs. 20.00, ₹20, 20.00, 20/-, 20
 * @returns {{ price: number | null }}
 */
export function extractPrice(text) {
  if (!text || !text.trim()) return { price: null }
  const cleaned = text.replace(/[^\d.,/-]/g, ' ').trim()
  if (!cleaned) return { price: null }

  const parts = cleaned.split(/\s+/)
  for (const part of parts) {
    const normalized = part.replace(/[,-/]/g, '')
    if (/^\d+(\.\d{1,2})?$/.test(normalized)) {
      const num = Number(normalized)
      if (num > 0 && num < 100000) return { price: num }
    }
  }

  const allNumbers = cleaned.match(/\d+(\.\d{1,2})?/g)
  if (allNumbers) {
    const nums = allNumbers.map(Number).filter((n) => n > 0 && n < 100000)
    if (nums.length) return { price: nums[0] }
  }

  return { price: null }
}

/**
 * Parse OCR text into { name, nameSource, confidence }.
 * Returns exact extracted text without forced catalog matching.
 *
 * @param {string} text - raw OCR text (join all lines first: lines.map(l => l.text).join(' '))
 * @param {number} [ocrConfidence] - Tesseract confidence score (0-100)
 * @returns {{name:string,nameSource:'raw'|null,confidence:number}}
 */
export function parseProductFields(text, ocrConfidence) {
  const result = { name: '', nameSource: null, confidence: 0 }

  if (!text || !text.trim()) return result

  if (typeof ocrConfidence === 'number' && ocrConfidence < 50) {
    return result
  }

  const words = cleanNameWords(text)
  if (words.length) {
    result.name = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    result.nameSource = 'raw'
    result.confidence = ocrConfidence != null ? ocrConfidence / 100 : 0.5
  }

  return result
}
