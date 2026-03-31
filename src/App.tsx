import { HashRouter as BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuthStore } from './store/useAuthStore'
import { EmployeeProvider } from './store/useEmployeeStore'
import Navbar from './components/Navbar'
import ManagePage from './pages/ManagePage'
import DisplayPage from './pages/DisplayPage'
import AuthPage from './pages/AuthPage'

function AppContent() {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid rgba(255,255,255,0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ fontSize: '16px', opacity: 0.8 }}>טוען...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthPage />
  }

  return (
    <EmployeeProvider>
      <BrowserRouter>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <Navbar />
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <Routes>
              <Route path="/" element={<Navigate to="/manage" replace />} />
              <Route path="/manage" element={<ManagePage />} />
              <Route path="/display" element={<DisplayPage />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </EmployeeProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
