import { HashRouter as BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { EmployeeProvider } from './store/useEmployeeStore'
import Navbar from './components/Navbar'
import ManagePage from './pages/ManagePage'
import DisplayPage from './pages/DisplayPage'

export default function App() {
  return (
    <EmployeeProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Navigate to="/manage" replace />} />
          <Route path="/manage" element={<ManagePage />} />
          <Route path="/display" element={<DisplayPage />} />
        </Routes>
      </BrowserRouter>
    </EmployeeProvider>
  )
}
