import type { DailyLog, MockExam, WeeklySummary, AreaPerformance, ApprovalScore, MedicalArea, ErrorReason } from '../types'
import { MEDICAL_AREAS } from '../types'

export function calculateTotalQuestions(logs: DailyLog[]): number {
  return logs.reduce((sum, log) => sum + log.questions_done, 0)
}

export function calculateTotalCorrect(logs: DailyLog[]): number {
  return logs.reduce((sum, log) => sum + Math.round(log.questions_done * (log.hit_rate / 100)), 0)
}

export function calculateGlobalHitRate(logs: DailyLog[]): number {
  const total = calculateTotalQuestions(logs)
  if (total === 0) return 0
  return Math.round((calculateTotalCorrect(logs) / total) * 100 * 100) / 100
}

export function calculateWeeklyProgress(
  logs: DailyLog[],
  weeklyGoal: number,
  weekStart: string
): number {
  const weekLogs = logs.filter((log) => log.date >= weekStart)
  const total = weekLogs.reduce((sum, log) => sum + log.questions_done, 0)
  return weeklyGoal > 0 ? Math.round((total / weeklyGoal) * 100 * 100) / 100 : 0
}

export function calculateYearlyProgress(logs: DailyLog[], yearlyGoal: number): number {
  const total = calculateTotalQuestions(logs)
  return yearlyGoal > 0 ? Math.round((total / yearlyGoal) * 100 * 100) / 100 : 0
}

export function calculateEvolution(logs: DailyLog[]): number {
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length < 2) return 0
  const half = Math.floor(sorted.length / 2)
  const firstHalf = sorted.slice(0, half)
  const secondHalf = sorted.slice(half)
  const firstAvg =
    firstHalf.length > 0
      ? firstHalf.reduce((s, l) => s + l.hit_rate, 0) / firstHalf.length
      : 0
  const secondAvg =
    secondHalf.length > 0
      ? secondHalf.reduce((s, l) => s + l.hit_rate, 0) / secondHalf.length
      : 0
  if (firstAvg === 0) return 0
  return Math.round(((secondAvg - firstAvg) / firstAvg) * 100 * 100) / 100
}

export function getMockAverage(mocks: MockExam[]): number {
  if (mocks.length === 0) return 0
  return Math.round((mocks.reduce((s, m) => s + m.percentage, 0) / mocks.length) * 100) / 100
}

export function getMockTrend(mocks: MockExam[]): number {
  const sorted = [...mocks].sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length < 2) return 0
  const last = sorted[sorted.length - 1].percentage
  const first = sorted[0].percentage
  return Math.round((last - first) * 100) / 100
}

export function calculateCurrentStreak(logs: DailyLog[]): number {
  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date))
  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 0; i < sorted.length; i++) {
    const logDate = new Date(sorted[i].date + 'T00:00:00')
    const expectedDate = new Date(today)
    expectedDate.setDate(expectedDate.getDate() - streak)
    const diff = Math.round(
      (logDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (diff === 0) {
      streak++
    } else {
      break
    }
  }
  return streak
}

export function calculateDaysWithoutStudy(logs: DailyLog[]): number {
  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date))
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (sorted.length === 0) return 0
  const lastDate = new Date(sorted[0].date + 'T00:00:00')
  const diff = Math.round((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

export function calculateApprovalScore(
  logs: DailyLog[],
  mocks: MockExam[],
  weeklySummaries: WeeklySummary[],
  areaPerformance: AreaPerformance[]
): ApprovalScore {
  const hitRate = calculateGlobalHitRate(logs)
  const mockAvg = getMockAverage(mocks)

  const hitRateScore = Math.min(100, Math.round(hitRate * 1.2))
  const mockEvolutionScore = Math.min(100, Math.round(mockAvg * 1.1))
  const consistencyScore = Math.min(
    100,
    weeklySummaries.length > 0
      ? Math.round(
          (weeklySummaries.filter((w) => w.days_studied >= 5).length /
            weeklySummaries.length) *
            100
        )
      : 0
  )
  const reviewScore = Math.min(
    100,
    logs.length > 0
      ? Math.round((logs.filter((l) => l.core_review_done).length / logs.length) * 100)
      : 0
  )
  const errorBankScore = areaPerformance.length > 0 ? 70 : 0

  const score = Math.round(
    hitRateScore * 0.3 +
      mockEvolutionScore * 0.25 +
      consistencyScore * 0.2 +
      reviewScore * 0.15 +
      errorBankScore * 0.1
  )

  let label: ApprovalScore['label']
  if (score < 40) label = 'Abaixo do esperado'
  else if (score < 60) label = 'Competitivo'
  else if (score < 80) label = 'Muito competitivo'
  else label = 'Faixa de aprovação'

  return {
    score,
    label,
    components: {
      hit_rate_score: hitRateScore,
      mock_evolution_score: mockEvolutionScore,
      consistency_score: consistencyScore,
      review_score: reviewScore,
      error_bank_score: errorBankScore,
    },
  }
}

export function generateWeeklySummary(logs: DailyLog[], weekStart: string): WeeklySummary {
  const weekLogs = logs.filter((log) => log.date >= weekStart)
  const weekEnd = new Date(weekStart + 'T00:00:00')
  weekEnd.setDate(weekEnd.getDate() + 7)
  const weekLogsFiltered = weekLogs.filter((log) => {
    const logDate = new Date(log.date + 'T00:00:00')
    return logDate < weekEnd
  })

  const questions_done = weekLogsFiltered.reduce((s, l) => s + l.questions_done, 0)
  const correct = weekLogsFiltered.reduce(
    (s, l) => s + Math.round(l.questions_done * (l.hit_rate / 100)),
    0
  )
  const hit_rate = questions_done > 0 ? Math.round((correct / questions_done) * 100 * 100) / 100 : 0
  const hours_studied =
    Math.round(weekLogsFiltered.reduce((s, l) => s + l.hours_studied, 0) * 100) / 100
  const days_studied = new Set(weekLogsFiltered.map((l) => l.date)).size

  return {
    id: weekStart,
    week_start: weekStart,
    questions_done,
    correct,
    hit_rate,
    hours_studied,
    days_studied,
  }
}

export function getAreaPriority(hitRate: number): 'red' | 'yellow' | 'green' {
  if (hitRate < 70) return 'red'
  if (hitRate < 80) return 'yellow'
  return 'green'
}

export function calculateAreaPerformanceFromLogs(logs: DailyLog[]): AreaPerformance[] {
  const areaMap = new Map<MedicalArea, { questions_done: number; correct: number }>()

  for (const log of logs) {
    if (log.areas_data && log.areas_data.length > 0) {
      for (const ad of log.areas_data) {
        const existing = areaMap.get(ad.area) || { questions_done: 0, correct: 0 }
        existing.questions_done += ad.questions_done
        existing.correct += ad.correct
        areaMap.set(ad.area, existing)
      }
    } else if (log.questions_done > 0) {
      const correct = Math.round(log.questions_done * (log.hit_rate / 100))
      const area = 'clinica_medica' as MedicalArea
      const existing = areaMap.get(area) || { questions_done: 0, correct: 0 }
      existing.questions_done += log.questions_done
      existing.correct += correct
      areaMap.set(area, existing)
    }
  }

  const areas = Array.from(areaMap.entries()).map(([area, data]) => {
    const hit_rate = data.questions_done > 0
      ? Math.round((data.correct / data.questions_done) * 100 * 100) / 100
      : 0
    return {
      id: area,
      area,
      questions_done: data.questions_done,
      correct: data.correct,
      hit_rate,
      trend: 'stable' as const,
      priority: getAreaPriority(hit_rate),
    }
  })

  return MEDICAL_AREAS.map(({ value }) => {
    const existing = areas.find((a) => a.area === value)
    return existing || {
      id: value,
      area: value,
      questions_done: 0,
      correct: 0,
      hit_rate: 0,
      trend: 'stable' as const,
      priority: 'red' as const,
    }
  })
}

export function extractErrorsFromNotes(notes: string): { topic: string; error_reason: ErrorReason; nivel_confianca: 'baixo' | 'medio' | 'alto' }[] {
  const results: { topic: string; error_reason: ErrorReason; nivel_confianca: 'baixo' | 'medio' | 'alto' }[] = []
  const lower = notes.toLowerCase()

  const patterns: { regex: RegExp; reason: ErrorReason }[] = [
    { regex: /errei\s+(\w+(?:\s+\w+){0,3})/gi, reason: 'nao_sabia' },
    { regex: /não\s*sei\s+(\w+(?:\s+\w+){0,3})/gi, reason: 'nao_sabia' },
    { regex: /esqueci\s+(\w+(?:\s+\w+){0,3})/gi, reason: 'esqueci' },
    { regex: /interpret[eaç]\w+\s+(\w+(?:\s+\w+){0,3})/gi, reason: 'interpretacao' },
    { regex: /confundi\s+(\w+(?:\s+\w+){0,3})/gi, reason: 'interpretacao' },
    { regex: /pegadinha\s+(\w+(?:\s+\w+){0,3})/gi, reason: 'pegadinha' },
    { regex: /pressa\s+(\w+(?:\s+\w+){0,3})/gi, reason: 'pressa' },
    { regex: /dificuldade\s+(\w+(?:\s+\w+){0,3})/gi, reason: 'nao_sabia' },
    { regex: /revisar\s+(\w+(?:\s+\w+){0,3})/gi, reason: 'esqueci' },
  ]

  for (const { regex, reason } of patterns) {
    let match: RegExpExecArray | null
    const r = new RegExp(regex.source, 'gi')
    while ((match = r.exec(lower)) !== null) {
      const topic = match[1].trim()
      if (topic && topic.length > 2) {
        const hasContext = lower.includes('muito') || lower.includes('demais') || lower.includes('dificil')
        results.push({
          topic,
          error_reason: reason,
          nivel_confianca: hasContext ? 'baixo' : 'medio',
        })
      }
    }
  }

  return results
}
