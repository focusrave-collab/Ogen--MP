import { useState } from 'react'
import { APP_PASSWORD } from '../config/password'

interface Props {
  onSuccess: () => void
}

export default function PasswordGate({ onSuccess }: Props) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password === APP_PASSWORD) {
      sessionStorage.setItem('auth', '1')
      onSuccess()
    } else {
      setError(true)
      setPassword('')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
      direction: 'rtl',
    }}>
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: '48px 40px',
        width: 360,
        boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
        textAlign: 'center',
      }}>
        {/* Icon */}
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
          מערכת ניהול ארגון
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 28 }}>
          הכנס סיסמה כדי להיכנס
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(false) }}
            placeholder="סיסמה"
            autoFocus
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 10,
              border: error ? '2px solid #ef4444' : '1.5px solid #e2e8f0',
              fontSize: 15,
              outline: 'none',
              textAlign: 'center',
              marginBottom: 8,
              boxSizing: 'border-box',
              letterSpacing: 4,
            }}
          />
          {error && (
            <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 8 }}>סיסמה שגויה</p>
          )}
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
              color: 'white',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: 4,
            }}
          >
            כניסה
          </button>
        </form>
      </div>
    </div>
  )
}
