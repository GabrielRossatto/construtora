import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import EmpreendimentosPage from './pages/EmpreendimentosPage'
import CadastrosPage from './pages/CadastrosPage'
import UsuariosPage from './pages/UsuariosPage'
import CampanhasPage from './pages/CampanhasPage'
import IaHubPage from './pages/IaHubPage'
import PublicMateriaisPage from './pages/PublicMateriaisPage'
import MeusDadosPage from './pages/MeusDadosPage'
import { useAuth } from './hooks/useAuth'

const CREATE_PERMISSIONS = ['CREATE_DEVELOPMENT', 'CREATE_USER', 'CREATE_MATERIAL']

function ProtectedRoute({ children, requireAnyPermission = null }) {
  const { isAuthenticated, hasPermission } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (requireAnyPermission && !requireAnyPermission.some(hasPermission)) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/public/materiais/:publicToken" element={<PublicMateriaisPage />} />

      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/empreendimentos" element={<ProtectedRoute><EmpreendimentosPage /></ProtectedRoute>} />
      <Route
        path="/cadastros"
        element={
          <ProtectedRoute requireAnyPermission={CREATE_PERMISSIONS}>
            <CadastrosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/usuarios"
        element={
          <ProtectedRoute requireAnyPermission={['VIEW_USER']}>
            <UsuariosPage />
          </ProtectedRoute>
        }
      />
      <Route path="/meus-dados" element={<ProtectedRoute><MeusDadosPage /></ProtectedRoute>} />
      <Route path="/campanhas" element={<ProtectedRoute><CampanhasPage /></ProtectedRoute>} />
      <Route path="/ia-hub" element={<ProtectedRoute><IaHubPage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
