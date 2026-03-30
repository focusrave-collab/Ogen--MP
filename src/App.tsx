import { HashRouter as BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { EmployeeProvider } from './store/useEmployeeStore'
import Navbar from './components/Navbar'
import ManagePage from './pages/ManagePage'
import DisplayPage from './pages/DisplayPage'

export default function App() {
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
