import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import EmpreendimentosPage from './pages/EmpreendimentosPage'
import CadastrosPage from './pages/CadastrosPage'
import UsuariosPage from './pages/UsuariosPage'
import CampanhasPage from './pages/CampanhasPage'
import IaHubPage from './pages/IaHubPage'
import PublicMateriaisPage from './pages/PublicMateriaisPage'
import { useAuth } from './hooks/useAuth'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/public/materiais/:publicToken" element={<PublicMateriaisPage />} />

      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/empreendimentos" element={<ProtectedRoute><EmpreendimentosPage /></ProtectedRoute>} />
      <Route path="/cadastros" element={<ProtectedRoute><CadastrosPage /></ProtectedRoute>} />
      <Route path="/usuarios" element={<ProtectedRoute><UsuariosPage /></ProtectedRoute>} />
      <Route path="/campanhas" element={<ProtectedRoute><CampanhasPage /></ProtectedRoute>} />
      <Route path="/ia-hub" element={<ProtectedRoute><IaHubPage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
