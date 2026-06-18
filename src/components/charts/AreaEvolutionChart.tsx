import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { AREA_LABELS_SHORT } from '../../types'
import type { AreaPerformance } from '../../types'

const tooltipStyle = {
  backgroundColor: '#18181b',
  border: '1px solid #27272a',
  borderRadius: '8px',
  color: '#e4e4e7',
}

interface AreaEvolutionChartProps {
  areaPerformance: AreaPerformance[]
}

export function AreaEvolutionChart({ areaPerformance }: AreaEvolutionChartProps) {
  const data = useMemo(() => {
    return areaPerformance.map((a) => ({
      name: AREA_LABELS_SHORT[a.area] || a.area,
      hitRate: a.hit_rate,
      fill:
        a.hit_rate >= 80
          ? '#10b981'
          : a.hit_rate >= 70
            ? '#f59e0b'
            : '#ef4444',
    }))
  }, [areaPerformance])

  return (
    <div className="h-64">
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              type="number"
              stroke="#71717a"
              fontSize={12}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis dataKey="name" type="category" stroke="#71717a" fontSize={12} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => [`${value}%`, 'Acerto']}
            />
            <Bar dataKey="hitRate" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-zinc-500">
          Nenhum dado de área cadastrado ainda
        </div>
      )}
    </div>
  )
}
