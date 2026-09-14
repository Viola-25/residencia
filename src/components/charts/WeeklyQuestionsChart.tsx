import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { getWeekLabel, getWeekStartKey } from '../../lib/dates'
import { tooltipStyle, tooltipLabelStyle, tooltipItemStyle } from '../../lib/chartStyles'
import type { DailyLog } from '../../types'

interface WeeklyQuestionsChartProps {
  logs: DailyLog[]
}

export function WeeklyQuestionsChart({ logs }: WeeklyQuestionsChartProps) {
  const data = useMemo(() => {
    const weekMap = new Map<string, { questions: number }>()
    for (const log of logs) {
      const key = getWeekStartKey(log.date)
      const existing = weekMap.get(key) || { questions: 0 }
      existing.questions += log.questions_done
      weekMap.set(key, existing)
    }
    return Array.from(weekMap.entries())
      .map(([week, weekData]) => ({
        week,
        label: getWeekLabel(week),
        questions: weekData.questions,
      }))
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-12)
  }, [logs])

  return (
    <div className="h-64">
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="label" stroke="#71717a" fontSize={12} />
            <YAxis stroke="#71717a" fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
            <Bar dataKey="questions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-zinc-500">
          Nenhum dado semanal ainda
        </div>
      )}
    </div>
  )
}
