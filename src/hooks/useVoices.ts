import { useEffect, useState } from 'react'

export function useVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() =>
    'speechSynthesis' in window ? window.speechSynthesis.getVoices() : [],
  )

  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    function handleVoicesChanged() {
      setVoices(window.speechSynthesis.getVoices())
    }
    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged)
  }, [])

  return voices
}
