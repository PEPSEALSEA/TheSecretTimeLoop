import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AdminGate } from './components/AdminGate'
import { Admin } from './pages/Admin'
import { DisplayAll } from './pages/DisplayAll'
import { Home } from './pages/Home'
import { StaffTeam } from './pages/StaffTeam'

function StaffRedirect() {
  const { teamId } = useParams()
  return <Navigate to={`/staff/${teamId ?? '1'}`} replace />
}

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
        <Route
          path="/staff/:teamId"
          element={
            <AdminGate>
              <StaffTeam />
            </AdminGate>
          }
        />
        <Route path="/admin/:teamId" element={<StaffRedirect />} />
        <Route path="/display/all" element={<DisplayAll layout="stage" />} />
        <Route path="/display/other-devices" element={<DisplayAll layout="fluid" />} />
        <Route path="/display/:teamId" element={<Navigate to="/display/all" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
