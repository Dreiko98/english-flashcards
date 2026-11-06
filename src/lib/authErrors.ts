const MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'Email o contraseña incorrectos.',
  'User already registered': 'Ya existe una cuenta con ese email.',
  'Password should be at least 6 characters.': 'La contraseña debe tener al menos 6 caracteres.',
  'Email not confirmed': 'Este email todavía no ha sido confirmado.',
  'Unable to validate email address: invalid format': 'El email no tiene un formato válido.',
  'Email rate limit exceeded': 'Demasiados intentos. Espera un momento y vuelve a intentarlo.',
}

export function translateAuthError(message: string): string {
  return MESSAGES[message] ?? message
}
