import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { AuthCard, ErrorMessage } from '@/components/AuthCard'
import { inputClassName, primaryButtonClassName } from '@/lib/formStyles'
import { translateAuthError } from '@/lib/authErrors'
import { supabase } from '@/lib/supabase'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (signInError) {
      setError(translateAuthError(signInError.message))
      return
    }
    const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'
    navigate(from, { replace: true })
  }

  return (
    <AuthCard title="Iniciar sesión">
      <form onSubmit={handleSubmit} noValidate>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <div className="mb-4">
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
        <div className="mb-6">
          <label htmlFor="password" className="block text-sm font-medium">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClassName}
          />
        </div>
        <button type="submit" disabled={loading} className={primaryButtonClassName}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
        <div className="mt-4 flex justify-between text-sm">
          <Link to="/register" className="text-blue-600 dark:text-blue-400">
            Crear cuenta
          </Link>
          <Link to="/forgot-password" className="text-blue-600 dark:text-blue-400">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </form>
    </AuthCard>
  )
}
