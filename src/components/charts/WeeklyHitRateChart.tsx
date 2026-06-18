import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { getWeekLabel } from '../../lib/dates'
import type { DailyLog } from '../../types'

const tooltipStyle = {
  backgroundColor: '#18181b',
  border: '1px solid #27272a',
  borderRadius: '8px',
  color: '#e4e4e7',
}

interface WeeklyHitRateChartProps {
  logs: DailyLog[]
}

export function WeeklyHitRateChart({ logs }: WeeklyHitRateChartProps) {
  const data = useMemo(() => {
    const weekMap = new Map<string, { questions: number; hits: number; total: number }>()
    for (const log of logs) {
      const d = new Date(log.date + 'T00:00:00')
      const dayOfWeek = d.getDay()
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      const weekStart = new Date(d)
      weekStart.setDate(d.getDate() - diff)
      const key = weekStart.toISOString().split('T')[0]
      const existing = weekMap.get(key) || { questions: 0, hits: 0, total: 0 }
      existing.questions += log.questions_done
      existing.total += log.questions_done
      existing.hits += Math.round(log.questions_done * (log.hit_rate / 100))
      weekMap.set(key, existing)
    }
    return Array.from(weekMap.entries())
      .map(([week, weekData]) => ({
        week,
        label: getWeekLabel(week),
        hitRate: weekData.total > 0 ? Math.round((weekData.hits / weekData.total) * 100 * 10) / 10 : 0,
      }))
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-12)
  }, [logs])

  return (
    <div className="h-64">
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="hitRateGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="label" stroke="#71717a" fontSize={12} />
            <YAxis
              stroke="#71717a"
              fontSize={12}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Area
              type="monotone"
              dataKey="hitRate"
              stroke="#8b5cf6"
              fill="url(#hitRateGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-zinc-500">
          Nenhum dado semanal ainda
        </div>
      )}
    </div>
  )
}
