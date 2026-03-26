import { NavLink } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav className="bg-gradient-to-l from-navy-900 to-blue-900 shadow-lg" style={{ background: 'linear-gradient(to left, #0f172a, #1e3a8a)' }}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <span className="text-white font-bold text-xl tracking-wide">מערכת ניהול ארגון</span>
          </div>

          <div className="flex gap-2">
            <NavLink
              to="/manage"
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-white text-blue-900 shadow-md'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              ניהול ועריכה
            </NavLink>
            <NavLink
              to="/display"
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-white text-blue-900 shadow-md'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              תצוגת עץ
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  )
}
