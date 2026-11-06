import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { AuthCard, ErrorMessage } from '@/components/AuthCard'
import { inputClassName, primaryButtonClassName } from '@/lib/formStyles'
import { translateAuthError } from '@/lib/authErrors'
import { supabase } from '@/lib/supabase'

export function RegisterPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (signUpError) {
      setError(translateAuthError(signUpError.message))
      return
    }
    if (!data.session) {
      // Email confirmation is enabled on this project; there's no session yet.
      setError('Cuenta creada. Revisa tu email para confirmarla y después inicia sesión.')
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <AuthCard title="Crear cuenta">
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
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClassName}
          />
        </div>
        <button type="submit" disabled={loading} className={primaryButtonClassName}>
          {loading ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
        <div className="mt-4 text-sm">
          <Link to="/login" className="text-blue-600 dark:text-blue-400">
            Ya tengo cuenta
          </Link>
        </div>
      </form>
    </AuthCard>
  )
}
