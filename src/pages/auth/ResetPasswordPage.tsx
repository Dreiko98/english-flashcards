import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { AuthCard, ErrorMessage } from '@/components/AuthCard'
import { inputClassName, primaryButtonClassName } from '@/lib/formStyles'
import { translateAuthError } from '@/lib/authErrors'
import { supabase } from '@/lib/supabase'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updateError) {
      setError(translateAuthError(updateError.message))
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <AuthCard title="Elegir nueva contraseña">
      <form onSubmit={handleSubmit} noValidate>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <div className="mb-6">
          <label htmlFor="password" className="block text-sm font-medium">
            Nueva contraseña
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
          {loading ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </AuthCard>
  )
}
