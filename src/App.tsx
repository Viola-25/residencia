import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { DailyLog } from './pages/DailyLog'
import { MockExams } from './pages/MockExams'
import { Performance } from './pages/Performance'
import { ErrorBank } from './pages/ErrorBank'
import { ApprovalRadar } from './pages/ApprovalRadar'
import { StrategicPanel } from './pages/StrategicPanel'
import { AIInsights } from './pages/AIInsights'
import { Settings } from './pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/diario" element={<DailyLog />} />
              <Route path="/simulados" element={<MockExams />} />
              <Route path="/desempenho" element={<Performance />} />
              <Route path="/erros" element={<ErrorBank />} />
              <Route path="/radar" element={<ApprovalRadar />} />
              <Route path="/estrategico" element={<StrategicPanel />} />
              <Route path="/ia" element={<AIInsights />} />
              <Route path="/configuracoes" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
