import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { MockExam } from '../../types'

const tooltipStyle = {
  backgroundColor: '#18181b',
  border: '1px solid #27272a',
  borderRadius: '8px',
  color: '#e4e4e7',
}

interface MockEvolutionChartProps {
  mocks: MockExam[]
}

export function MockEvolutionChart({ mocks }: MockEvolutionChartProps) {
  const data = useMemo(() => {
    return [...mocks]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-10)
      .map((m) => ({
        name: m.name.length > 15 ? m.name.slice(0, 15) + '...' : m.name,
        percentage: m.percentage,
      }))
  }, [mocks])

  return (
    <div className="h-64">
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
            <YAxis
              stroke="#71717a"
              fontSize={12}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Line
              type="monotone"
              dataKey="percentage"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-zinc-500">
          Nenhum simulado cadastrado ainda
        </div>
      )}
    </div>
  )
}
