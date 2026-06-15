import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'

const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })))
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const DailyLog = lazy(() => import('./pages/DailyLog').then((m) => ({ default: m.DailyLog })))
const MockExams = lazy(() => import('./pages/MockExams').then((m) => ({ default: m.MockExams })))
const Performance = lazy(() => import('./pages/Performance').then((m) => ({ default: m.Performance })))
const ErrorBank = lazy(() => import('./pages/ErrorBank').then((m) => ({ default: m.ErrorBank })))
const ApprovalRadar = lazy(() => import('./pages/ApprovalRadar').then((m) => ({ default: m.ApprovalRadar })))
const StrategicPanel = lazy(() => import('./pages/StrategicPanel').then((m) => ({ default: m.StrategicPanel })))
const AIInsights = lazy(() => import('./pages/AIInsights').then((m) => ({ default: m.AIInsights })))
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })))

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
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
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
