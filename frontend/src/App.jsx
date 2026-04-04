import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import CadastroEmpresaPage from './pages/CadastroEmpresaPage'
import DashboardPage from './pages/DashboardPage'
import EmpreendimentosPage from './pages/EmpreendimentosPage'
import CadastrosPage from './pages/CadastrosPage'
import UsuariosPage from './pages/UsuariosPage'
import IaHubPage from './pages/IaHubPage'
import PublicMateriaisPage from './pages/PublicMateriaisPage'
import PublicTabelaVendasPage from './pages/PublicTabelaVendasPage'
import MeusDadosPage from './pages/MeusDadosPage'
import InstitucionalPage from './pages/InstitucionalPage'
import TabelaVendasBackofficePage from './pages/TabelaVendasBackofficePage'
import { useAuth } from './hooks/useAuth'

const CREATE_PERMISSIONS = ['CREATE_DEVELOPMENT', 'CREATE_USER', 'CREATE_MATERIAL']
const INTERNAL_ADMIN_EMAILS = ['admin.teste.20260328090502@construtora.local', 'dasdasdosdos1212@gmail.com']

function ProtectedRoute({ children, requireAnyPermission = null, requireInternalAdmin = false }) {
  const { isAuthenticated, hasPermission, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (requireAnyPermission && !requireAnyPermission.some(hasPermission)) {
    return <Navigate to="/dashboard" replace />
  }
  if (requireInternalAdmin && !INTERNAL_ADMIN_EMAILS.includes((user?.email || '').toLowerCase())) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<CadastroEmpresaPage />} />
      <Route path="/_hubio-interno/cadastrar-empresa-7f3k9p" element={<CadastroEmpresaPage />} />
      <Route path="/materiais-publicos/:publicToken" element={<PublicMateriaisPage />} />
      <Route path="/tabela-vendas-publica/:publicToken" element={<PublicTabelaVendasPage />} />

      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/empreendimentos" element={<ProtectedRoute><EmpreendimentosPage /></ProtectedRoute>} />
      <Route path="/institucional" element={<ProtectedRoute><InstitucionalPage /></ProtectedRoute>} />
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
      <Route path="/ia-hub" element={<ProtectedRoute><IaHubPage /></ProtectedRoute>} />
      <Route
        path="/_hubio-interno/tabela-vendas"
        element={
          <ProtectedRoute requireInternalAdmin>
            <TabelaVendasBackofficePage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
