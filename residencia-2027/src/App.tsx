import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { DailyLog } from './pages/DailyLog'
import { MockExams } from './pages/MockExams'
import { Performance } from './pages/Performance'
import { ErrorBank } from './pages/ErrorBank'
import { ApprovalRadar } from './pages/ApprovalRadar'
import { StrategicPanel } from './pages/StrategicPanel'
import { AIInsights } from './pages/AIInsights'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/diario" element={<DailyLog />} />
          <Route path="/simulados" element={<MockExams />} />
          <Route path="/desempenho" element={<Performance />} />
          <Route path="/erros" element={<ErrorBank />} />
          <Route path="/radar" element={<ApprovalRadar />} />
          <Route path="/estrategico" element={<StrategicPanel />} />
          <Route path="/ia" element={<AIInsights />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
