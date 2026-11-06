const AUTO_READ_KEY = 'flashcards:auto-read'
const PREFERRED_VOICE_KEY = 'flashcards:preferred-voice'

export function getAutoRead(): boolean {
  return localStorage.getItem(AUTO_READ_KEY) === 'true'
}

export function setAutoRead(value: boolean) {
  localStorage.setItem(AUTO_READ_KEY, String(value))
}

export function getPreferredVoiceName(): string | null {
  return localStorage.getItem(PREFERRED_VOICE_KEY)
}

export function setPreferredVoiceName(name: string | null) {
  if (name) localStorage.setItem(PREFERRED_VOICE_KEY, name)
  else localStorage.removeItem(PREFERRED_VOICE_KEY)
}
