import { useState } from 'react'
import { useAuthStore } from '../store/useAuthStore'

export default function AuthPage() {
  const { login, register } = useAuthStore()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const errorMessages: Record<string, string> = {
    'Invalid login credentials': 'אימייל או סיסמה שגויים',
    'Email not confirmed': 'יש לאשר את כתובת האימייל תחילה',
    'User already registered': 'משתמש עם אימייל זה כבר קיים',
    'Password should be at least 6 characters': 'הסיסמה חייבת להכיל לפחות 6 תווים',
    'Unable to validate email address: invalid format': 'פורמט האימייל אינו תקין',
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, password)
      }
    } catch (err: any) {
      const msg = err?.message ?? 'אירעה שגיאה, נסה שוב'
      setError(errorMessages[msg] ?? msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #1e40af 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'inherit',
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
          padding: '48px 40px',
          width: '100%',
          maxWidth: '420px',
        }}
      >
        {/* Logo / Title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1e3a8a, #1e40af)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px' }}>
            מערכת ניהול ארגון
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            {mode === 'login' ? 'ברוכים הבאים, אנא התחברו' : 'צרו חשבון חדש'}
          </p>
        </div>

        {/* Toggle tabs */}
        <div
          style={{
            display: 'flex',
            background: '#f1f5f9',
            borderRadius: '10px',
            padding: '4px',
            marginBottom: '24px',
          }}
        >
          {(['login', 'register'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(null) }}
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s',
                background: mode === m ? 'white' : 'transparent',
                color: mode === m ? '#1e3a8a' : '#64748b',
                boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
              }}
            >
              {m === 'login' ? 'כניסה' : 'הרשמה'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              כתובת אימייל
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="example@email.com"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1.5px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box',
                direction: 'ltr',
                textAlign: 'left',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = '#1e40af')}
              onBlur={e => (e.target.style.borderColor = '#d1d5db')}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              סיסמה
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1.5px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box',
                direction: 'ltr',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = '#1e40af')}
              onBlur={e => (e.target.style.borderColor = '#d1d5db')}
            />
          </div>

          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '16px',
                color: '#b91c1c',
                fontSize: '14px',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '12px',
              background: submitting ? '#93c5fd' : 'linear-gradient(135deg, #1e3a8a, #1e40af)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s',
            }}
          >
            {submitting
              ? 'אנא המתן...'
              : mode === 'login' ? 'כניסה' : 'הרשמה'}
          </button>
        </form>
      </div>
    </div>
  )
}
