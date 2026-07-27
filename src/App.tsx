import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminTeam } from './pages/AdminTeam'
import { DisplayAll } from './pages/DisplayAll'
import { DisplayTeam } from './pages/DisplayTeam'
import { Home } from './pages/Home'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin/:teamId" element={<AdminTeam />} />
        <Route path="/display/all" element={<DisplayAll />} />
        <Route path="/display/:teamId" element={<DisplayTeam />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
