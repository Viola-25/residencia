import type {
  DailyLog,
  MockExam,
  ErrorEntry,
  AreaPerformance,
  DashboardMetrics,
  ApprovalScore,
  StudyConfig,
  RegistrationType,
  Mood,
  MedicalArea,
  StrategicData,
} from '../types'
import { AREA_LABELS, MOOD_OPTIONS, REGISTRATION_TYPES } from '../types'
import {
  getHitRateTrend,
  calculateGlobalHitRate,
  calculateTotalQuestions,
  calculateTotalCorrect,
  calculateDifficultyBreakdown,
  calculatePlatformComparison,
  calculatePlatformInference,
  getMockAverage,
  getMockTrend,
  calculateRecentMetrics,
  roundTo2,
} from './calculations'
import { formatDate, formatDateShort } from './dates'

interface PerformanceReportInput {
  logs: DailyLog[]
  mocks: MockExam[]
  errors: ErrorEntry[]
  areaPerformance: AreaPerformance[]
  recentMetrics: ReturnType<typeof calculateRecentMetrics>
  recentWindow: number
  dashboardMetrics: DashboardMetrics
  approvalScore: ApprovalScore
  config: StudyConfig
  strategicData: StrategicData
}

const LINE = '='.repeat(72)
const THIN = '-'.repeat(72)

function pad(s: string, width: number, end: boolean = true): string {
  if (s.length >= width) return s
  const fill = ' '.repeat(width - s.length)
  return end ? s + fill : fill + s
}

function registrationLabel(type: RegistrationType): string {
  return REGISTRATION_TYPES.find((r) => r.value === type)?.label || type
}

function moodLabel(mood: Mood): string {
  return MOOD_OPTIONS.find((m) => m.value === mood)?.label || mood
}

function areaLabel(area: MedicalArea): string {
  return AREA_LABELS[area] || area
}

export function buildPerformanceReport(input: PerformanceReportInput): string {
  const { logs, mocks, errors, areaPerformance, recentMetrics, recentWindow } = input
  const out: string[] = []

  const sortedLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date))
  const globalTotal = calculateTotalQuestions(logs)
  const globalCorrect = calculateTotalCorrect(logs)
  const globalErrors = globalTotal - globalCorrect
  const globalRate = calculateGlobalHitRate(logs)
  const totalHours = roundTo2(logs.reduce((s, l) => s + (l.hours_studied || 0), 0))
  const uniqueDates = Array.from(new Set(logs.map((l) => l.date)))
  const firstDate = sortedLogs.length > 0 ? sortedLogs[0].date : null
  const lastDate = sortedLogs.length > 0 ? sortedLogs[sortedLogs.length - 1].date : null

  const t30 = getHitRateTrend(logs, 30)
  const t60 = getHitRateTrend(logs, 60)
  const t90 = getHitRateTrend(logs, 90)

  const difficulty = calculateDifficultyBreakdown(logs)
  const recentLogs = logs.filter((l) => {
    const cutoff = new Date()
    cutoff.setHours(0, 0, 0, 0)
    cutoff.setDate(cutoff.getDate() - recentWindow)
    return new Date(l.date + 'T00:00:00') >= cutoff
  })
  const recentDifficulty = calculateDifficultyBreakdown(recentLogs)

  const weekMap = new Map<string, { questions: number; hits: number }>()
  for (const log of logs) {
    const d = new Date(log.date + 'T00:00:00')
    const dayOfWeek = d.getDay()
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - diff)
    const key = weekStart.toISOString().split('T')[0]
    const existing = weekMap.get(key) || { questions: 0, hits: 0 }
    existing.questions += log.questions_done
    const correct =
      log.areas_data && log.areas_data.length > 0
        ? log.areas_data.reduce((s, a) => s + a.correct, 0)
        : Math.round(log.questions_done * (log.hit_rate / 100))
    existing.hits += correct
    weekMap.set(key, existing)
  }
  const weekly = Array.from(weekMap.entries())
    .map(([week, data]) => ({
      week,
      questions: data.questions,
      hits: data.hits,
      errors: data.questions - data.hits,
      hitRate: data.questions > 0 ? roundTo2((data.hits / data.questions) * 100) : 0,
    }))
    .sort((a, b) => a.week.localeCompare(b.week))

  const platformGlobal = calculatePlatformComparison(logs)
  const platformInferenceGlobal = calculatePlatformInference(logs)

  const reasonCounts = new Map<string, number>()
  for (const e of errors) {
    reasonCounts.set(e.error_reason, (reasonCounts.get(e.error_reason) || 0) + 1)
  }

  const srsTotal = errors.length
  const srsConsolidated = errors.filter(
    (e) => e.repetitions >= 3 && e.interval_days >= 14 && e.reviewed
  ).length
  const srsPending = errors.filter((e) => !e.reviewed).length
  const srsDueNow = errors.filter((e) => {
    if (!e.next_review_date) return false
    return new Date(e.next_review_date) <= new Date() && !e.reviewed
  }).length
  const healthyRate = srsTotal > 0 ? Math.round((srsConsolidated / srsTotal) * 100) : 0

  const typeCounts = new Map<RegistrationType, number>()
  for (const l of logs) {
    typeCounts.set(l.registration_type, (typeCounts.get(l.registration_type) || 0) + 1)
  }

  const mockSorted = [...mocks].sort((a, b) => a.date.localeCompare(b.date))

  const generatedAt = formatDate(new Date().toISOString())

  out.push(LINE)
  out.push('RELATORIO DE DESEMPENHO - RESIDENCIA MEDICA')
  out.push(LINE)
  out.push('Gerado em: ' + generatedAt)
  out.push('Janela recente analisada: ' + recentWindow + ' dias')
  if (firstDate && lastDate) {
    out.push(
      'Periodo coberto pelos registros: ' +
        formatDateShort(firstDate) +
        ' a ' +
        formatDateShort(lastDate)
    )
  }
  out.push('Total de registros de estudo: ' + logs.length)
  out.push('')

  out.push(LINE)
  out.push('1. RESUMO GERAL')
  out.push(LINE)
  out.push('Total de questoes:              ' + globalTotal.toLocaleString())
  out.push('Total de acertos:               ' + globalCorrect.toLocaleString())
  out.push('Total de erros:                 ' + globalErrors.toLocaleString())
  out.push('Taxa de acerto global:          ' + globalRate + '%')
  out.push('Tempo total estudado:           ' + totalHours + ' h')
  out.push('Dias com registro de estudo:    ' + uniqueDates.length)
  out.push('Sequencia atual (streak):       ' + input.dashboardMetrics.current_streak + ' dias')
  out.push('Dias sem estudar:               ' + input.dashboardMetrics.days_without_study + ' dias')
  out.push('')
  out.push('Registros por tipo:')
  for (const [type, count] of typeCounts) {
    out.push('  - ' + registrationLabel(type) + ': ' + count)
  }
  out.push('')

  out.push(LINE)
  out.push('2. METAS E PROVAS')
  out.push(LINE)
  out.push('Dias para ENAMED:        ' + input.dashboardMetrics.days_to_enamed)
  out.push('Dias para 1a prova:      ' + input.dashboardMetrics.days_to_first_exam)
  out.push(
    'Meta anual:               ' +
      input.dashboardMetrics.yearly_progress +
      '% (' +
      globalTotal.toLocaleString() +
      ' / ' +
      input.config.yearly_goal.toLocaleString() +
      ')'
  )
  out.push(
    'Meta semanal:             ' +
      input.dashboardMetrics.weekly_progress +
      '% (' +
      input.config.weekly_goal +
      ' questoes/semana)'
  )
  out.push(
    'Meta mensal:              ' +
      input.config.monthly_goal.toLocaleString() +
      ' questoes/mes'
  )
  out.push('Meta diaria:              ' + input.config.daily_questions_goal + ' questoes, ' + input.config.daily_hours_goal + ' h')
  out.push('Meta de simulados/semana: ' + input.config.mock_goal_per_week)
  out.push('')

  out.push(LINE)
  out.push('3. TAXA DE ACERTO POR JANELA TEMPORAL')
  out.push(LINE)
  out.push('Janela            Atual      Anterior    Variacao')
  for (const t of [
    { label: '30 dias', d: t30 },
    { label: '60 dias', d: t60 },
    { label: '90 dias', d: t90 },
  ]) {
    out.push(
      pad(t.label, 18) +
        pad(t.d.currentRate.toFixed(2) + '%', 11) +
        pad(t.d.prevRate.toFixed(2) + '%', 12) +
        (t.d.diff > 0 ? '+' : '') +
        t.d.diff.toFixed(2) +
        ' pp (' +
        (t.d.diff > 0 ? 'subindo' : t.d.diff < 0 ? 'caindo' : 'estavel') +
        ')'
    )
  }
  out.push(pad('Global (todo periodo)', 18) + pad(globalRate.toFixed(2) + '%', 11) + '-')
  out.push(
    'Recente (' +
      recentWindow +
      ' dias): ' +
      recentMetrics.hit_rate +
      '% (questoes: ' +
      recentMetrics.total_questions.toLocaleString() +
      ')'
  )
  out.push('')
  out.push('Evolucao geral: ' + (input.dashboardMetrics.evolution_percentage > 0 ? '+' : '') + input.dashboardMetrics.evolution_percentage + '% (comparacao entre metades do historico)')
  out.push('')

  out.push(LINE)
  out.push('4. EVOLUCAO SEMANAL')
  out.push(LINE)
  if (weekly.length === 0) {
    out.push('Nenhum registro semanal disponivel.')
  } else {
    out.push(pad('Semana', 12) + pad('Questoes', 10) + pad('Acertos', 9) + pad('Erros', 8) + pad('Taxa', 8))
    out.push(THIN)
    for (const w of weekly) {
      const [, m, d] = w.week.split('-').map(Number)
      const label = 'Sem ' + m + '/' + d
      out.push(
        pad(label, 12) +
          pad(String(w.questions), 10) +
          pad(String(w.hits), 9) +
          pad(String(w.errors), 8) +
          pad(w.hitRate.toFixed(1) + '%', 8)
      )
    }
  }
  out.push('')

  out.push(LINE)
  out.push('5. COMPARACAO COM A PLATAFORMA')
  out.push(LINE)
  if (platformGlobal.logs_with_platform === 0) {
    out.push('Nenhuma sessao com media da plataforma registrada.')
  } else {
    out.push('Sessoes com media da plataforma: ' + platformGlobal.logs_with_platform)
    out.push('Seu aproveitamento (nessas sessoes): ' + platformGlobal.user_hit_rate + '%')
    out.push(
      'Media da plataforma (ponderada): ' +
        (platformGlobal.platform_avg_rate !== null ? platformGlobal.platform_avg_rate + '%' : '-')
    )
    out.push(
      'Diferenca media (score delta): ' +
        (platformGlobal.avg_score_delta !== null
          ? (platformGlobal.avg_score_delta > 0 ? '+' : '') + platformGlobal.avg_score_delta + ' pp'
          : '-')
    )
    out.push(
      'Registros acima da media: ' +
        platformGlobal.above_average +
        ' de ' +
        platformGlobal.logs_with_platform +
        ' (' +
        (platformGlobal.above_average_pct !== null ? platformGlobal.above_average_pct : '-') +
        '%)'
    )
    out.push('')
    out.push('Inferencia estatistica:')
    out.push(
      '  Teste t de 1 amostra: t = ' +
        (platformInferenceGlobal.t_stat !== null ? platformInferenceGlobal.t_stat : '-') +
        ', p = ' +
        (platformInferenceGlobal.p_value !== null ? platformInferenceGlobal.p_value : '-') +
        ' (' +
        (platformInferenceGlobal.significant
          ? 'estatisticamente significativo'
          : 'sem significancia estatistica') +
        ')'
    )
    out.push(
      '  IC 95% do seu hit rate (Wilson): ' +
        (platformInferenceGlobal.hit_rate_ci
          ? platformInferenceGlobal.hit_rate_ci.low + '% a ' + platformInferenceGlobal.hit_rate_ci.high + '%'
          : '-')
    )
    out.push(
      '  Percentil estimado: ' +
        (platformInferenceGlobal.estimated_percentile !== null
          ? 'P' +
            platformInferenceGlobal.estimated_percentile +
            ' (z = ' +
            platformInferenceGlobal.estimated_z +
            ', quartil ' +
            platformInferenceGlobal.estimated_quartile +
            ') - estimativa, sigma assumido de 10pp'
          : '-')
    )
  }
  out.push('')

  out.push(LINE)
  out.push('6. DESEMPENHO POR DIFICULDADE')
  out.push(LINE)
  const difficultyLabels: Record<string, string> = {
    easy: 'Faceis',
    medium: 'Medias',
    hard: 'Dificeis',
  }
  out.push(pad('Nivel', 10) + pad('Global', 20) + pad('Recente (' + recentWindow + 'd)', 24))
  for (const d of difficulty) {
    const recent = recentDifficulty.find((r) => r.level === d.level)
    const gText =
      d.total > 0
        ? d.correct + '/' + d.total + ' (' + d.hit_rate + '%)'
        : 'sem dados'
    const rText =
      recent && recent.total > 0
        ? recent.correct + '/' + recent.total + ' (' + recent.hit_rate + '%)'
        : 'sem dados'
    out.push(pad(difficultyLabels[d.level], 10) + pad(gText, 20) + rText)
  }
  out.push('')

  out.push(LINE)
  out.push('7. DESEMPENHO POR GRANDE AREA (GLOBAL vs RECENTE)')
  out.push(LINE)
  out.push(
    pad('Area', 24) +
      pad('Global', 16) +
      pad('Recente', 16) +
      pad('Diferenca', 10) +
      pad('Prioridade', 12)
  )
  out.push(THIN)
  for (const area of areaPerformance) {
    const recent = recentMetrics.area_performance.find((r) => r.area === area.area)
    const globalRateArea = area.hit_rate
    const recentRate = recent ? recent.hit_rate : 0
    const diff = roundTo2(recentRate - globalRateArea)
    const gText = area.questions_done + ' q | ' + globalRateArea + '%'
    const rText = (recent ? recent.questions_done : 0) + ' q | ' + recentRate + '%'
    const diffText = (diff > 0 ? '+' : '') + diff + ' pp'
    const priorityText =
      area.priority === 'red'
        ? 'Alta'
        : area.priority === 'yellow'
          ? 'Atencao'
          : 'Bom desempenho'
    out.push(
      pad(areaLabel(area.area), 24) +
        pad(gText, 16) +
        pad(rText, 16) +
        pad(diffText, 10) +
        priorityText
    )
  }
  out.push('')
  out.push('Pontos fortes (melhores taxas):')
  for (const s of input.strategicData.top_strengths) {
    out.push('  - ' + areaLabel(s.area) + ': ' + s.hit_rate + '%')
  }
  out.push('Pontos fracos (piores taxas):')
  for (const s of input.strategicData.top_weaknesses) {
    out.push('  - ' + areaLabel(s.area) + ': ' + s.hit_rate + '%')
  }
  if (input.strategicData.most_growth) {
    out.push(
      'Maior crescimento: ' +
        areaLabel(input.strategicData.most_growth.area) +
        ' (+' +
        input.strategicData.most_growth.growth +
        ' pp vs media)'
    )
  }
  if (input.strategicData.most_decline) {
    out.push(
      'Maior queda: ' +
        areaLabel(input.strategicData.most_decline.area) +
        ' (-' +
        input.strategicData.most_decline.decline +
        ' pp vs media)'
    )
  }
  out.push('')

  out.push(LINE)
  out.push('8. SIMULADOS E PROVAS ANTIGAS')
  out.push(LINE)
  if (mockSorted.length === 0) {
    out.push('Nenhum simulado registrado.')
  } else {
    out.push('Total de simulados: ' + mockSorted.length)
    out.push('Media de aproveitamento: ' + getMockAverage(mocks) + '%')
    out.push(
      'Tendencia (ultimo - primeiro): ' +
        (getMockTrend(mocks) > 0 ? '+' : '') +
        getMockTrend(mocks) +
        ' pp'
    )
    out.push('')
    out.push(
      pad('Data', 12) +
        pad('Nome', 24) +
        pad('Aproveit.', 10) +
        pad('Ranking', 9) +
        pad('Particip.', 11) +
        pad('Tempo (min)', 12)
    )
    out.push(THIN)
    for (const m of mockSorted) {
      out.push(
        pad(formatDateShort(m.date), 12) +
          pad(m.name.length > 22 ? m.name.slice(0, 22) + '...' : m.name, 24) +
          pad(m.percentage + '%', 10) +
          pad(m.ranking !== null ? String(m.ranking) : '-', 9) +
          pad(m.participants !== null ? String(m.participants) : '-', 11) +
          (m.time_spent_minutes !== null ? String(m.time_spent_minutes) : '-')
      )
    }
  }
  out.push('')

  out.push(LINE)
  out.push('9. SCORE DE APROVACAO')
  out.push(LINE)
  out.push('Score: ' + input.approvalScore.score + ' - ' + input.approvalScore.label)
  out.push(
    '  Taxa de acerto (30%):        ' + input.approvalScore.components.hit_rate_score
  )
  out.push(
    '  Evolucao simulados (25%):    ' + input.approvalScore.components.mock_evolution_score
  )
  out.push(
    '  Consistencia (20%):          ' + input.approvalScore.components.consistency_score
  )
  out.push(
    '  Revisao do nucleo (15%):     ' + input.approvalScore.components.review_score
  )
  out.push(
    '  Banco de erros (10%):        ' + input.approvalScore.components.error_bank_score
  )
  out.push('')

  out.push(LINE)
  out.push('10. BANCO DE ERROS E REVISAO ESPACADA')
  out.push(LINE)
  out.push('Total de erros registrados: ' + srsTotal)
  out.push('Consolidados (SRS):        ' + srsConsolidated)
  out.push('Pendentes de revisao:      ' + srsPending)
  out.push('Atrasados:                 ' + srsDueNow)
  out.push('Saude do banco:            ' + healthyRate + '%')
  out.push('')
  if (reasonCounts.size > 0) {
    out.push('Distribuicao por motivo de erro:')
    for (const [reason, count] of Array.from(reasonCounts.entries()).sort((a, b) => b[1] - a[1])) {
      out.push('  - ' + reason + ': ' + count)
    }
    out.push('')
  }
  out.push('Topicos mais recorrentes no banco de erros:')
  const topicCounts = new Map<string, number>()
  for (const e of errors) {
    topicCounts.set(e.topic, (topicCounts.get(e.topic) || 0) + 1)
  }
  const topTopics = Array.from(topicCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10)
  if (topTopics.length === 0) {
    out.push('  - Nenhum topico registrado.')
  } else {
    for (const [topic, count] of topTopics) {
      out.push('  - ' + topic + ' (' + count + 'x)')
    }
  }
  out.push('')

  out.push(LINE)
  out.push('11. DETALHAMENTO DOS REGISTROS (CRONOLOGICO)')
  out.push(LINE)
  if (sortedLogs.length === 0) {
    out.push('Nenhum registro de estudo encontrado.')
  } else {
    out.push(
      pad('Data', 12) +
        pad('Tipo', 26) +
        pad('Questoes', 10) +
        pad('Acertos', 9) +
        pad('Taxa', 8) +
        pad('Horas', 8) +
        pad('Humor', 10) +
        pad('Energia', 9) +
        'Plataforma'
    )
    out.push(THIN)
    for (const l of sortedLogs) {
      const correct =
        l.areas_data && l.areas_data.length > 0
          ? l.areas_data.reduce((s, a) => s + a.correct, 0)
          : Math.round(l.questions_done * (l.hit_rate / 100))
      const platform =
        l.platform_avg_rate !== null && l.score_delta !== null
          ? l.platform_avg_rate + '% (delta ' + (l.score_delta > 0 ? '+' : '') + l.score_delta + ')'
          : '-'
      out.push(
        pad(formatDateShort(l.date), 12) +
          pad(registrationLabel(l.registration_type), 26) +
          pad(String(l.questions_done), 10) +
          pad(String(correct), 9) +
          pad(l.hit_rate + '%', 8) +
          pad(String(l.hours_studied), 8) +
          pad(moodLabel(l.mood), 10) +
          pad(String(l.energy_level), 9) +
          platform
      )
    }
  }
  out.push('')
  out.push(LINE)
  out.push('Fim do relatorio. Dados gerados localmente a partir do app de residencia.')
  out.push(LINE)

  return out.join('\n')
}

export function downloadPerformanceReport(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
