// Downloads the English LSTM language pack into public/tessdata so OCR works
// fully offline (no CDN). Run once: `npm run fetch-tessdata`.
//
// tesseract.js (OEM.LSTM_ONLY) expects /tessdata/eng.traineddata.gz on our origin.
import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pipeline } from 'node:stream/promises'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, '../public/tessdata')
const TESSDATA_URL = 'https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz'
const OUT = resolve(OUT_DIR, 'eng.traineddata.gz')

await mkdir(OUT_DIR, { recursive: true })

const res = await fetch(TESSDATA_URL)
if (!res.ok || !res.body) {
  throw new Error(`Failed to download language data: ${res.status} ${res.statusText}`)
}

await pipeline(res.body, createWriteStream(OUT))

console.log(`Saved ${OUT}`)
console.log('OCR language data is now vendored locally for offline use.')
