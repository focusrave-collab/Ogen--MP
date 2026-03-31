import { useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { EmployeeProvider } from './store/useEmployeeStore'
import { OrgUnitProvider } from './store/useOrgUnitStore'
import Navbar from './components/Navbar'
import ManagePage from './pages/ManagePage'
import DisplayPage from './pages/DisplayPage'
import PasswordGate from './pages/PasswordGate'

export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('auth') === '1')

  if (!authed) {
    return <PasswordGate onSuccess={() => setAuthed(true)} />
  }

  return (
    <EmployeeProvider>
      <OrgUnitProvider>
      <HashRouter>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <Navbar onLogout={() => { sessionStorage.removeItem('auth'); setAuthed(false) }} />
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <Routes>
              <Route path="/" element={<Navigate to="/manage" replace />} />
              <Route path="/manage" element={<ManagePage />} />
              <Route path="/display" element={<DisplayPage />} />
            </Routes>
          </div>
        </div>
      </HashRouter>
      </OrgUnitProvider>
    </EmployeeProvider>
  )
}
