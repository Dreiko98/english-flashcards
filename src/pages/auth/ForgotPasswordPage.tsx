import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { AuthCard, ErrorMessage } from '@/components/AuthCard'
import { inputClassName, primaryButtonClassName } from '@/lib/formStyles'
import { translateAuthError } from '@/lib/authErrors'
import { supabase } from '@/lib/supabase'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (resetError) {
      setError(translateAuthError(resetError.message))
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <AuthCard title="Revisa tu email">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Te hemos enviado un enlace a <strong>{email}</strong> para restablecer tu contraseña.
        </p>
        <Link to="/login" className="mt-4 inline-block text-sm text-blue-600 dark:text-blue-400">
          Volver a iniciar sesión
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Recuperar contraseña">
      <form onSubmit={handleSubmit} noValidate>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <div className="mb-6">
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClassName}
          />
        </div>
        <button type="submit" disabled={loading} className={primaryButtonClassName}>
          {loading ? 'Enviando…' : 'Enviar enlace'}
        </button>
        <div className="mt-4 text-sm">
          <Link to="/login" className="text-blue-600 dark:text-blue-400">
            Volver a iniciar sesión
          </Link>
        </div>
      </form>
    </AuthCard>
  )
}
