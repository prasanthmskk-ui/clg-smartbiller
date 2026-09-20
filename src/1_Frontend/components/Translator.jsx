import { useState, useEffect, useRef } from 'react';

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedValue(value),
      delay
    );

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/*
 * Common English phonetic -> Tamil mappings.
 *
 * Names/words should be handled locally first instead of
 * sending them to a translation API.
 */
const ENGLISH_TO_TAMIL = {
  pazhani: 'பழனி',
  palani: 'பழனி',
  pazani: 'பழனி',
  pazhni: 'பழனி',

  paal: 'பால்',
  pal: 'பால்',

  arisi: 'அரிசி',
  sakkarai: 'சர்க்கரை',
  uppu: 'உப்பு',
  ennai: 'எண்ணெய்',
  theneer: 'தேநீர்',
  kaapi: 'காபி',
  rotti: 'ரொட்டி',

  vanakkam: 'வணக்கம்',
  nandri: 'நன்றி',
  amma: 'அம்மா',
  appa: 'அப்பா',
  anna: 'அண்ணா',
  akka: 'அக்கா',
  thambi: 'தம்பி',
  thangachi: 'தங்கச்சி',
};

/*
 * Normalize English input for local lookup.
 */
const normalizeEnglish = (text) =>
  String(text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

/*
 * Check local phonetic mapping first.
 *
 * Handles both single words and simple sentences.
 */
const translateEnglishLocally = (text) => {
  const normalized = normalizeEnglish(text);

  if (!normalized) return '';

  // Exact match
  if (ENGLISH_TO_TAMIL[normalized]) {
    return ENGLISH_TO_TAMIL[normalized];
  }

  // Word-by-word conversion
  const words = normalized.split(' ');

  const converted = words.map(
    (word) => ENGLISH_TO_TAMIL[word] || null
  );

  // Only use local result if every word is known.
  if (converted.every(Boolean)) {
    return converted.join(' ');
  }

  return null;
};

export default function Translator() {
  const [english, setEnglish] = useState('');
  const [tamil, setTamil] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeField, setActiveField] = useState(null);

  const debouncedEnglish = useDebounce(
    english,
    800
  );

  const debouncedTamil = useDebounce(
    tamil,
    800
  );

  /*
   * Prevent an old API response from overwriting
   * newer user input.
   */
  const requestIdRef = useRef(0);

  const translate = async (
    text,
    from,
    to,
    setter
  ) => {
    if (!text || !String(text).trim()) return;

    const requestId =
      ++requestIdRef.current;

    /*
     * English -> Tamil:
     * Try local phonetic conversion first.
     */
    if (from === 'en' && to === 'ta') {
      const localTamil =
        translateEnglishLocally(text);

      if (localTamil) {
        setter(localTamil);
        setLoading(false);
        return;
      }
    }

    setLoading(true);

    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
          text
        )}&langpair=${from}|${to}`
      );

      const data = await res.json();

      /*
       * Don't allow an older request to overwrite
       * newer input.
       */
      if (
        requestId !== requestIdRef.current
      ) {
        return;
      }

      if (
        data.responseStatus === 200 &&
        data.responseData?.translatedText
      ) {
        setter(
          data.responseData.translatedText
        );
      }
    } catch (e) {
      console.error(
        'Translation error:',
        e
      );
    } finally {
      if (
        requestId === requestIdRef.current
      ) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (
      activeField === 'en' &&
      debouncedEnglish
    ) {
      translate(
        debouncedEnglish,
        'en',
        'ta',
        setTamil
      );
    }
  }, [
    debouncedEnglish,
    activeField,
  ]);

  useEffect(() => {
    if (
      activeField === 'ta' &&
      debouncedTamil
    ) {
      translate(
        debouncedTamil,
        'ta',
        'en',
        setEnglish
      );
    }
  }, [
    debouncedTamil,
    activeField,
  ]);

  return (
    <div
      style={{
        padding: 20,
        maxWidth: 500,
        margin: '0 auto',
      }}
    >
      <h3>
        English ↔ Tamil Translator
      </h3>

      <textarea
        placeholder="Type English..."
        value={english}
        onChange={(e) => {
          setActiveField('en');
          setEnglish(e.target.value);
        }}
        rows={4}
        style={{
          width: '100%',
          marginBottom: 10,
          padding: 8,
        }}
      />

      <textarea
        placeholder="Type Tamil..."
        value={tamil}
        onChange={(e) => {
          setActiveField('ta');
          setTamil(e.target.value);
        }}
        rows={4}
        style={{
          width: '100%',
          marginBottom: 10,
          padding: 8,
        }}
      />

      {loading && (
        <p style={{ color: '#666' }}>
          Translating...
        </p>
      )}
    </div>
  );
}