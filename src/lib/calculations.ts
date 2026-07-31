import type { DailyLog, MockExam, WeeklySummary, AreaPerformance, ApprovalScore, MedicalArea, MotivoErro, ErrorEntry } from '../types'
import { MEDICAL_AREAS } from '../types'

export function roundTo2(value: number): number {
  return Math.round(value * 100) / 100
}

export function calculateLogScore(userCorrect: number, userTotal: number, platformAvgRate?: number): {
  userRate: number
  scoreDelta: number | null
} {
  const userRate = userTotal > 0 ? roundTo2((userCorrect / userTotal) * 100) : 0
  const scoreDelta = platformAvgRate !== undefined ? roundTo2(userRate - platformAvgRate) : null
  return { userRate, scoreDelta }
}

export function formatScoreBadge(scoreDelta: number): {
  text: string
  variant: 'green' | 'yellow' | 'red'
} {
  const sign = scoreDelta > 0 ? '+' : ''
  const text = `${sign}${scoreDelta.toFixed(1)} pts`
  const variant = scoreDelta > 0 ? 'green' : scoreDelta < 0 ? 'red' : 'yellow'
  return { text, variant }
}

export function getHitRateTrend(logs: DailyLog[], days: number = 30) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const periodStart = new Date(today)
  periodStart.setDate(today.getDate() - days)

  const prevPeriodStart = new Date(periodStart)
  prevPeriodStart.setDate(periodStart.getDate() - days)

  const currentLogs = logs.filter(log => {
    const d = new Date(log.date + 'T00:00:00')
    return d >= periodStart
  })

  const prevLogs = logs.filter(log => {
    const d = new Date(log.date + 'T00:00:00')
    return d >= prevPeriodStart && d < periodStart
  })

  const currentRate = calculateGlobalHitRate(currentLogs)
  const prevRate = calculateGlobalHitRate(prevLogs)
  const diff = Math.round((currentRate - prevRate) * 100) / 100

  let trend: 'up' | 'down' | 'neutral' = 'neutral'
  if (diff > 0) trend = 'up'
  if (diff < 0) trend = 'down'

  return { currentRate, prevRate, diff, trend }
}

export function calculateTotalQuestions(logs: DailyLog[]): number {
  return logs.reduce((sum, log) => sum + log.questions_done, 0)
}

export interface DifficultyBreakdown {
  level: 'easy' | 'medium' | 'hard'
  label: string
  correct: number
  total: number
  hit_rate: number | null
}

export function calculateDifficultyBreakdown(logs: DailyLog[]): DifficultyBreakdown[] {
  const levels: { level: DifficultyBreakdown['level']; label: string }[] = [
    { level: 'easy', label: 'Fáceis' },
    { level: 'medium', label: 'Médias' },
    { level: 'hard', label: 'Difíceis' },
  ]

  return levels.map(({ level, label }) => {
    let correct = 0
    let total = 0
    for (const log of logs) {
      const c = log[`${level}_correct`]
      const t = log[`${level}_total`]
      if (c !== null && t !== null) {
        correct += c
        total += t
      }
    }
    return {
      level,
      label,
      correct,
      total,
      hit_rate: total > 0 ? roundTo2((correct / total) * 100) : null,
    }
  })
}

export interface PlatformComparison {
  logs_with_platform: number
  avg_score_delta: number | null
  above_average: number
  above_average_pct: number | null
  user_hit_rate: number
  platform_avg_rate: number | null
}

export function calculatePlatformComparison(logs: DailyLog[]): PlatformComparison {
  const withPlatform = logs.filter(
    (l) => l.platform_avg_rate !== null && l.score_delta !== null
  )

  if (withPlatform.length === 0) {
    return {
      logs_with_platform: 0,
      avg_score_delta: null,
      above_average: 0,
      above_average_pct: null,
      user_hit_rate: calculateGlobalHitRate(logs),
      platform_avg_rate: null,
    }
  }

  const userRate = calculateGlobalHitRate(withPlatform)
  const platformTotalQ = withPlatform.reduce((s, l) => s + l.questions_done, 0)
  const platformAvg = roundTo2(
    withPlatform.reduce((s, l) => s + (l.platform_avg_rate ?? 0) * l.questions_done, 0) /
      platformTotalQ
  )
  const avgDelta =
    platformTotalQ > 0
      ? roundTo2(
          withPlatform.reduce((s, l) => s + (l.score_delta ?? 0) * l.questions_done, 0) /
            platformTotalQ
        )
      : roundTo2(
          withPlatform.reduce((s, l) => s + (l.score_delta ?? 0), 0) / withPlatform.length
        )
  const above = withPlatform.filter((l) => (l.score_delta ?? 0) > 0).length

  return {
    logs_with_platform: withPlatform.length,
    avg_score_delta: avgDelta,
    above_average: above,
    above_average_pct: roundTo2((above / withPlatform.length) * 100),
    user_hit_rate: userRate,
    platform_avg_rate: platformAvg,
  }
}

function lgamma(x: number): number {
  const cof = [
    76.18009172947146,
    -86.5053203294168,
    24.01409824083091,
    -1.231739572450155,
    0.1208650973866179e-2,
    -0.5395239384953e-5,
  ]
  let y = x
  let tmp = x + 5.5
  tmp -= (x + 0.5) * Math.log(tmp)
  let ser = 1.000000000190015
  for (const c of cof) ser += c / ++y
  return -tmp + Math.log((2.506628274631 * ser) / x)
}

function betacf(a: number, b: number, x: number): number {
  const MAXIT = 100
  const EPS = 3e-7
  const FPMIN = 1e-30
  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  let c = 1
  let d = 1 - (qab * x) / qap
  if (Math.abs(d) < FPMIN) d = FPMIN
  d = 1 / d
  let h = d
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    h *= d * c
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < EPS) break
  }
  return h
}

function betai(a: number, b: number, x: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const bt = Math.exp(
    lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x)
  )
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a
  return 1 - (bt * betacf(b, a, 1 - x)) / b
}

function twoTailedTTestPValue(t: number, df: number): number {
  const x = df / (df + t * t)
  return betai(df / 2, 0.5, x)
}

function normalCdf(x: number): number {
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x) / Math.SQRT2
  const p = 0.3275911
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const t = 1 / (1 + p * ax)
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax))
  return 0.5 * (1 + sign * y)
}

function wilsonInterval(correct: number, total: number, z = 1.96): { low: number; high: number } {
  const phat = correct / total
  const z2 = z * z
  const denom = 1 + z2 / total
  const center = (phat + z2 / (2 * total)) / denom
  const margin =
    (z * Math.sqrt((phat * (1 - phat)) / total + z2 / (4 * total * total))) / denom
  return {
    low: Math.max(0, roundTo2((center - margin) * 100)),
    high: Math.min(100, roundTo2((center + margin) * 100)),
  }
}

export const ESTIMATED_PLATFORM_SIGMA = 10

export interface PlatformInference {
  sessions: number
  t_stat: number | null
  p_value: number | null
  significant: boolean
  hit_rate_ci: { low: number; high: number } | null
  estimated_z: number | null
  estimated_percentile: number | null
  estimated_quartile: 'Q1' | 'Q2' | 'Q3' | 'Q4' | null
}

export function calculatePlatformInference(
  logs: DailyLog[],
  sigma: number = ESTIMATED_PLATFORM_SIGMA
): PlatformInference {
  const deltas = logs
    .map((l) => l.score_delta)
    .filter((d): d is number => d !== null)

  let tStat: number | null = null
  let pValue: number | null = null
  let significant = false

  if (deltas.length >= 2) {
    const mean = deltas.reduce((s, d) => s + d, 0) / deltas.length
    const sd = Math.sqrt(
      deltas.reduce((s, d) => s + (d - mean) ** 2, 0) / (deltas.length - 1)
    )
    if (sd > 0) {
      tStat = roundTo2(mean / (sd / Math.sqrt(deltas.length)))
      pValue = Math.round(twoTailedTTestPValue(tStat, deltas.length - 1) * 10000) / 10000
      significant = pValue < 0.05
    }
  }

  const totalQ = calculateTotalQuestions(logs)
  const totalCorrect = calculateTotalCorrect(logs)
  const hitRateCi = totalQ > 0 ? wilsonInterval(totalCorrect, totalQ) : null

  const avgDelta = deltas.length > 0 ? deltas.reduce((s, d) => s + d, 0) / deltas.length : null
  const estimatedZ = avgDelta !== null ? roundTo2(avgDelta / sigma) : null
  const estimatedPercentile =
    estimatedZ !== null ? Math.round(normalCdf(estimatedZ) * 1000) / 10 : null
  let estimatedQuartile: PlatformInference['estimated_quartile'] = null
  if (estimatedPercentile !== null) {
    if (estimatedPercentile <= 25) estimatedQuartile = 'Q1'
    else if (estimatedPercentile <= 50) estimatedQuartile = 'Q2'
    else if (estimatedPercentile <= 75) estimatedQuartile = 'Q3'
    else estimatedQuartile = 'Q4'
  }

  return {
    sessions: deltas.length,
    t_stat: tStat,
    p_value: pValue,
    significant,
    hit_rate_ci: hitRateCi,
    estimated_z: estimatedZ,
    estimated_percentile: estimatedPercentile,
    estimated_quartile: estimatedQuartile,
  }
}


export function calculateTotalCorrect(logs: DailyLog[]): number {
  return logs.reduce((sum, log) => sum + Math.round(log.questions_done * (log.hit_rate / 100)), 0)
}

export function calculateGlobalHitRate(logs: DailyLog[]): number {
  const total = calculateTotalQuestions(logs)
  if (total === 0) return 0
  return roundTo2((calculateTotalCorrect(logs) / total) * 100)
}

export function calculateWeeklyProgress(
  logs: DailyLog[],
  weeklyGoal: number,
  weekStart: string
): number {
  const weekLogs = logs.filter((log) => log.date >= weekStart)
  const total = weekLogs.reduce((sum, log) => sum + log.questions_done, 0)
  return weeklyGoal > 0 ? roundTo2((total / weeklyGoal) * 100) : 0
}

export function calculateYearlyProgress(logs: DailyLog[], yearlyGoal: number): number {
  const total = calculateTotalQuestions(logs)
  return yearlyGoal > 0 ? roundTo2((total / yearlyGoal) * 100) : 0
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
  return roundTo2(((secondAvg - firstAvg) / firstAvg) * 100)
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
  const uniqueDates = Array.from(new Set(logs.map((log) => log.date)))
    .sort((a, b) => b.localeCompare(a))

  if (uniqueDates.length === 0) return 0

  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const lastLogDate = new Date(uniqueDates[0] + 'T00:00:00')
  const daysSinceLastLog = Math.round((today.getTime() - lastLogDate.getTime()) / (1000 * 60 * 60 * 24))
  if (daysSinceLastLog > 1) return 0

  const anchor = lastLogDate

  for (let i = 0; i < uniqueDates.length; i++) {
    const logDate = new Date(uniqueDates[i] + 'T00:00:00')
    const expectedDate = new Date(anchor)
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
  areaPerformance: AreaPerformance[],
  errors?: ErrorEntry[]
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
  let errorBankScore = 0
  if (errors && errors.length > 0) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const overdue = errors.filter((e) => {
      if (!e.next_review_date) return false
      const reviewDate = new Date(e.next_review_date)
      reviewDate.setHours(0, 0, 0, 0)
      return reviewDate <= today && !e.reviewed
    }).length
    errorBankScore = Math.round(((errors.length - overdue) / errors.length) * 100)
  } else if (areaPerformance.length > 0) {
    errorBankScore = 70
  }

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

export function getAreaPriority(hitRate: number): 'red' | 'yellow' | 'green' {
  if (hitRate < 70) return 'red'
  if (hitRate < 80) return 'yellow'
  return 'green'
}

const AREA_ALIAS: Record<string, MedicalArea> = {
  ginecologia: 'ginecologia_obstetricia',
  obstetricia: 'ginecologia_obstetricia',
}

export function normalizeArea(area: string): MedicalArea {
  return AREA_ALIAS[area] || (area as MedicalArea)
}

export function calculateAreaPerformanceFromLogs(logs: DailyLog[]): AreaPerformance[] {
  const areaMap = new Map<MedicalArea, { questions_done: number; correct: number }>()

  for (const log of logs) {
    if (log.areas_data && log.areas_data.length > 0) {
      for (const ad of log.areas_data) {
        const normalized = normalizeArea(ad.area)
        const existing = areaMap.get(normalized) || { questions_done: 0, correct: 0 }
        existing.questions_done += ad.questions_done
        existing.correct += ad.correct
        areaMap.set(normalized, existing)
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
      ? roundTo2((data.correct / data.questions_done) * 100)
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

export function extractErrorsFromNotes(notes: string): { topic: string; error_reason: MotivoErro; nivel_confianca: 'baixo' | 'medio' | 'alto' }[] {
  const results: { topic: string; error_reason: MotivoErro; nivel_confianca: 'baixo' | 'medio' | 'alto' }[] = []
  const lower = notes.toLowerCase()

  const patterns: { regex: RegExp; reason: MotivoErro }[] = [
    { regex: /errei\s+(\w+(?:\s+\w+){0,3})/gi, reason: 'Não sabia' },
    { regex: /não\s*sei\s+(\w+(?:\s+\w+){0,3})/gi, reason: 'Não sabia' },
    { regex: /esqueci\s+(\w+(?:\s+\w+){0,3})/gi, reason: 'Esqueci' },
    { regex: /interpret[eaç]\w+\s+(\w+(?:\s+\w+){0,3})/gi, reason: 'Dificuldade de interpretação' },
    { regex: /confundi\s+(\w+(?:\s+\w+){0,3})/gi, reason: 'Dificuldade de interpretação' },
    { regex: /pegadinha\s+(\w+(?:\s+\w+){0,3})/gi, reason: 'Pegadinha' },
    { regex: /pressa\s+(\w+(?:\s+\w+){0,3})/gi, reason: 'Falta de atenção' },
    { regex: /dificuldade\s+(\w+(?:\s+\w+){0,3})/gi, reason: 'Não sabia' },
    { regex: /revisar\s+(\w+(?:\s+\w+){0,3})/gi, reason: 'Esqueci' },
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

export interface SRSRating {
  id: string
  quality: 'easy' | 'good' | 'hard' | 'forgot'
}

const SRS_QUALITY_MAP: Record<'easy' | 'good' | 'hard' | 'forgot', number> = {
  forgot: 1,
  hard: 2,
  good: 4,
  easy: 5,
}

export function calculateNextSRSState(currentState: {
  interval_days: number
  ease_factor: number
  repetitions: number
}, quality: 'easy' | 'good' | 'hard' | 'forgot') {
  let { interval_days, ease_factor, repetitions } = currentState
  const q = SRS_QUALITY_MAP[quality]

  if (q < 3) {
    repetitions = 0
    interval_days = 1
  } else {
    if (repetitions === 0) {
      interval_days = 1
    } else if (repetitions === 1) {
      interval_days = 6
    } else {
      interval_days = Math.ceil(interval_days * ease_factor)
    }
    repetitions += 1
  }

  ease_factor = ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  if (ease_factor < 1.3) ease_factor = 1.3

  const nextReviewDate = new Date()
  nextReviewDate.setDate(nextReviewDate.getDate() + interval_days)
  nextReviewDate.setHours(0, 0, 0, 0)

  return {
    interval_days,
    ease_factor: Math.round(ease_factor * 100) / 100,
    repetitions,
    next_review_date: nextReviewDate.toISOString(),
  }
}
