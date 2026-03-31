import { NavLink } from 'react-router-dom'

interface Props {
  onLogout: () => void
}

export default function Navbar({ onLogout }: Props) {
  return (
    <nav style={{ background: 'linear-gradient(to left, #0f172a, #1e3a8a)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>

          {/* Logo + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 20 }}>מערכת ניהול ארגון</span>
          </div>

          {/* Nav links */}
          <div style={{ display: 'flex', gap: 8 }}>
            <NavLink to="/manage" style={({ isActive }) => ({
              padding: '8px 16px', borderRadius: 8, fontWeight: 500, fontSize: 14,
              textDecoration: 'none', transition: 'all 0.2s',
              background: isActive ? 'white' : 'transparent',
              color: isActive ? '#1e3a8a' : 'rgba(219,234,254,0.9)',
            })}>ניהול ועריכה</NavLink>
            <NavLink to="/display" style={({ isActive }) => ({
              padding: '8px 16px', borderRadius: 8, fontWeight: 500, fontSize: 14,
              textDecoration: 'none', transition: 'all 0.2s',
              background: isActive ? 'white' : 'transparent',
              color: isActive ? '#1e3a8a' : 'rgba(219,234,254,0.9)',
            })}>תצוגת עץ</NavLink>
          </div>

          {/* Logout */}
          <button onClick={onLogout} style={{
            padding: '6px 14px', borderRadius: 8,
            border: '1.5px solid rgba(255,255,255,0.35)',
            background: 'transparent', color: 'white',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            יציאה
          </button>
        </div>
      </div>
    </nav>
  )
}
