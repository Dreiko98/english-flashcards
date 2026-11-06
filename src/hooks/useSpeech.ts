import { useCallback } from 'react'

export function useSpeech() {
  const speak = useCallback((text: string, lang: string) => {
    if (!('speechSynthesis' in window) || !text.trim()) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    const voices = window.speechSynthesis.getVoices()
    const exactMatch = voices.find((voice) => voice.lang === lang)
    const languageMatch = voices.find((voice) => voice.lang.startsWith(lang.split('-')[0]))
    const voice = exactMatch ?? languageMatch
    if (voice) utterance.voice = voice
    window.speechSynthesis.speak(utterance)
  }, [])

  return { speak }
}
