import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminGate } from './components/AdminGate'
import { Admin } from './pages/Admin'
import { DisplayAll } from './pages/DisplayAll'
import { Home } from './pages/Home'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/admin"
          element={
            <AdminGate>
              <Admin />
            </AdminGate>
          }
        />
        <Route path="/admin/:teamId" element={<Navigate to="/admin" replace />} />
        <Route path="/display/all" element={<DisplayAll />} />
        <Route path="/display/:teamId" element={<Navigate to="/display/all" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
