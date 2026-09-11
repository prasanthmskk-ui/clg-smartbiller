import { useState, useEffect, useRef } from 'react';

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function Translator() {
  const [english, setEnglish] = useState('');
  const [tamil, setTamil] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const debouncedEnglish = useDebounce(english, 800);
  const debouncedTamil = useDebounce(tamil, 800);

  const translate = async (text, from, to, setter) => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`
      );
      const data = await res.json();
      if (data.responseStatus === 200) setter(data.responseData.translatedText);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeField === 'en' && debouncedEnglish) translate(debouncedEnglish, 'en', 'ta', setTamil);
  }, [debouncedEnglish]);

  useEffect(() => {
    if (activeField === 'ta' && debouncedTamil) translate(debouncedTamil, 'ta', 'en', setEnglish);
  }, [debouncedTamil]);

  return (
    <div style={{ padding: 20, maxWidth: 500, margin: '0 auto' }}>
      <h3>English ↔ Tamil Translator</h3>
      <textarea
        placeholder="Type English..."
        value={english}
        onChange={(e) => { setActiveField('en'); setEnglish(e.target.value); }}
        rows={4}
        style={{ width: '100%', marginBottom: 10, padding: 8 }}
      />
      <textarea
        placeholder="Type Tamil..."
        value={tamil}
        onChange={(e) => { setActiveField('ta'); setTamil(e.target.value); }}
        rows={4}
        style={{ width: '100%', marginBottom: 10, padding: 8 }}
      />
      {loading && <p style={{ color: '#666' }}>Translating...</p>}
    </div>
  );
}
