import Groq from 'groq-sdk'
import { supabase } from './supabase'
import { getTodayRangeUTC, getCurrentWeekStart } from './dates'
import type { DailyLog, MockExam, ErrorEntry, AreaPerformance, StudyConfig, AIInsight, MotivoErro } from '../types'
import {
  ERROR_EXTRACTION_SYSTEM_PROMPT,
  INLINE_ERROR_ANALYSIS_PROMPT,
  DAILY_ERROR_SUMMARY_PROMPT,
  INSIGHTS_SYSTEM_PROMPT,
  FLASHCARD_GENERATION_PROMPT,
  buildClusteringPrompt,
} from './prompts'

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY || '',
  dangerouslyAllowBrowser: true,
})

/**
 * Sanitiza a resposta bruta do LLM removendo blocos markdown (```json ... ```)
 * e extraindo apenas o JSON válido entre o primeiro { ou [ e o último } ou ].
 */
export function parseJsonSafe<T>(raw: string): T | null {
  if (!raw) return null
  let cleaned = raw.trim()
  cleaned = cleaned.replace(/```(?:json|JSON)\s*/g, '').replace(/```\s*/g, '').trim()
  const firstBrace = cleaned.indexOf('{')
  const firstBracket = cleaned.indexOf('[')
  const start =
    firstBrace === -1 && firstBracket === -1
      ? 0
      : firstBrace === -1
        ? firstBracket
        : firstBracket === -1
          ? firstBrace
          : Math.min(firstBrace, firstBracket)
  if (start > 0) cleaned = cleaned.slice(start)
  const lastBrace = cleaned.lastIndexOf('}')
  const lastBracket = cleaned.lastIndexOf(']')
  const end = Math.max(lastBrace, lastBracket)
  if (end > 0) cleaned = cleaned.slice(0, end + 1)
  try {
    return JSON.parse(cleaned) as T
  } catch {
    return null
  }
}

export async function analyzeInlineError(data: {
  topic: string
  enunciado: string
  alternativa_selecionada: string
  alternativa_certa: string
  error_reason: MotivoErro | string
}): Promise<{
  sugestao_revisao: string | null
  error_reason_sugerido: MotivoErro | string
}> {
  if (!data.enunciado || data.enunciado.trim().length < 10) {
    return { sugestao_revisao: null, error_reason_sugerido: data.error_reason }
  }

  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  if (!apiKey) return { sugestao_revisao: null, error_reason_sugerido: data.error_reason }

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: INLINE_ERROR_ANALYSIS_PROMPT },
        {
          role: 'user',
          content: `Tema: ${data.topic}
Enunciado: "${data.enunciado}"
Alternativa selecionada (errada): "${data.alternativa_selecionada}"
Alternativa correta: "${data.alternativa_certa}"
Motivo informado: ${data.error_reason}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 300,
    })

    const text = completion.choices[0]?.message?.content
    if (!text) return { sugestao_revisao: null, error_reason_sugerido: data.error_reason }

    const parsed = parseJsonSafe<{
      sugestao_revisao: string | null
      error_reason_sugerido: string
    }>(text)
    if (!parsed) return { sugestao_revisao: null, error_reason_sugerido: data.error_reason }

    return {
      sugestao_revisao: parsed.sugestao_revisao || null,
      error_reason_sugerido: parsed.error_reason_sugerido || data.error_reason,
    }
  } catch {
    return { sugestao_revisao: null, error_reason_sugerido: data.error_reason }
  }
}

export async function extractErrorsFromNotesAI(notes: string): Promise<{
  topic: string
  error_reason: MotivoErro
  nivel_confianca: 'baixo' | 'medio' | 'alto'
  sugestao_revisao: string | null
}[]> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  if (!apiKey || !notes || notes.trim().length < 5) return []

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: ERROR_EXTRACTION_SYSTEM_PROMPT },
        { role: 'user', content: `Texto do estudante: "${notes}"` },
      ],
      temperature: 0.1,
      max_tokens: 1000,
    })

    const text = completion.choices[0]?.message?.content
    if (!text) return []

    const parsed = parseJsonSafe<{
      topic: string
      error_reason: MotivoErro
      nivel_confianca: 'baixo' | 'medio' | 'alto'
      sugestao_revisao: string | null
    }[]>(text)
    return Array.isArray(parsed) ? parsed.slice(0, 10) : []
  } catch {
    return []
  }
}

export async function loadCachedInsights(): Promise<AIInsight[] | null> {
  try {
    const { start, end } = getTodayRangeUTC()
    const { data } = await supabase
      .from('insights_cache')
      .select('type,title,description,priority,area,generated_at')
      .gte('generated_at', start)
      .lt('generated_at', end)
      .order('generated_at', { ascending: false })

    if (data && data.length > 0) {
      return data.map((row) => ({
        type: row.type as AIInsight['type'],
        title: row.title,
        description: row.description,
        priority: row.priority as AIInsight['priority'],
        area: row.area as AIInsight['area'] | undefined,
      }))
    }
    return null
  } catch {
    return null
  }
}

async function saveInsights(insights: AIInsight[]): Promise<void> {
  try {
    const rows = insights.map((i) => ({
      type: i.type,
      title: i.title,
      description: i.description,
      priority: i.priority,
      area: i.area || null,
      generated_at: new Date().toISOString(),
    }))
    await supabase.from('insights_cache').insert(rows)
  } catch {
    // cache is optional — app works without it
  }
}

export async function loadDailySummaryCache(date: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('daily_summary_cache')
      .select('summary')
      .eq('date', date)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (data && data.summary) {
      return data.summary
    }
    return null
  } catch {
    return null
  }
}

export async function saveDailySummaryCache(date: string, summary: string): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('daily_summary_cache')
      .select('id')
      .eq('date', date)

    if (existing && existing.length > 0) {
      await supabase
        .from('daily_summary_cache')
        .update({ summary, created_at: new Date().toISOString() })
        .eq('date', date)
    } else {
      await supabase
        .from('daily_summary_cache')
        .insert({ summary, date })
    }
  } catch {
    // cache is optional
  }
}

export async function generateDailyErrorSummary(errors: ErrorEntry[]): Promise<string | null> {
  if (errors.length === 0) return null

  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  if (!apiKey) return null

  const errorsText = errors
    .map(
      (e, i) =>
        `${i + 1}. Tema: ${e.topic} | Erro: ${e.question.substring(0, 120)} | Motivo: ${e.error_reason}${e.sugestao_revisao ? ` | Sugestao: ${e.sugestao_revisao}` : ''}`
    )
    .join('\n')

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: DAILY_ERROR_SUMMARY_PROMPT },
        {
          role: 'user',
          content: `Erros registrados hoje pelo interno:\n\n${errorsText}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    })

    const text = completion.choices[0]?.message?.content
    if (!text) return null

    return text.trim()
  } catch {
    return null
  }
}

export async function generateInsights(data: {
  logs: DailyLog[]
  mocks: MockExam[]
  errors: ErrorEntry[]
  areaPerformance: AreaPerformance[]
  config: StudyConfig
}): Promise<AIInsight[]> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  if (!apiKey) {
    const fallback = fallbackInsights(data)
    await saveInsights(fallback)
    return fallback
  }

  const totalQuestions = data.logs.reduce((s, l) => s + l.questions_done, 0)
  const totalCorrect = data.logs.reduce(
    (s, l) => s + l.areas_data.reduce((a, d) => a + d.correct, 0),
    0
  )
  const globalHitRate = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100 * 100) / 100 : 0

  const areasSummary = data.areaPerformance.map((a) => ({
    area: a.area,
    questions: a.questions_done,
    correct: a.correct,
    hitRate: a.hit_rate,
    trend: a.trend,
  }))

  const mockSummary = data.mocks.map((m) => ({
    name: m.name,
    date: m.date,
    percentage: m.percentage,
    ranking: m.ranking,
    totalQuestions: m.areas_data.reduce((s, a) => s + a.questions_done, 0),
    totalCorrect: m.total_score,
  }))

  const logsWithScore = data.logs.filter((l) => l.score_delta !== null)
  const avgScoreDelta = logsWithScore.length > 0
    ? Math.round((logsWithScore.reduce((s, l) => s + (l.score_delta ?? 0), 0) / logsWithScore.length) * 10) / 10
    : null
  const positiveScores = logsWithScore.filter((l) => (l.score_delta ?? 0) > 0).length
  const negativeScores = logsWithScore.filter((l) => (l.score_delta ?? 0) < 0).length

  const hardLogs = data.logs.filter((l) => l.hard_total !== null && l.hard_total > 0)
  const hardTotal = hardLogs.reduce((s, l) => s + (l.hard_total ?? 0), 0)
  const hardCorrect = hardLogs.reduce((s, l) => s + (l.hard_correct ?? 0), 0)
  const hardHitRate = hardTotal > 0 ? Math.round((hardCorrect / hardTotal) * 100 * 10) / 10 : null

  const easyLogs = data.logs.filter((l) => l.easy_total !== null && l.easy_total > 0)
  const easyTotal = easyLogs.reduce((s, l) => s + (l.easy_total ?? 0), 0)
  const easyCorrect = easyLogs.reduce((s, l) => s + (l.easy_correct ?? 0), 0)
  const easyHitRate = easyTotal > 0 ? Math.round((easyCorrect / easyTotal) * 100 * 10) / 10 : null

  const userPrompt = `DADOS DE ESTUDO:
- Total de dias registrados: ${data.logs.length}
- Total de questões: ${totalQuestions}
- Total de acertos: ${totalCorrect}
- Taxa global de acerto: ${globalHitRate}%
- Total de simulados: ${data.mocks.length}
- Total de erros registrados: ${data.errors.length}
- Meta semanal: ${data.config.weekly_goal} questões
- Dias sem estudar: ${calculateDaysSinceLastLog(data.logs)}

SCORE VS MÉDIA DA PLATAFORMA:
- Dias com score registrado: ${logsWithScore.length}
- Score médio (score_delta médio): ${avgScoreDelta !== null ? `${avgScoreDelta > 0 ? '+' : ''}${avgScoreDelta} pts` : 'N/A'}
- Dias acima da média: ${positiveScores}
- Dias abaixo da média: ${negativeScores}

DIFICULDADE DAS QUESTÕES:
- Fáceis: ${easyTotal} questões (${easyCorrect} acertos, ${easyHitRate !== null ? `${easyHitRate}%` : 'N/A'})
- Difíceis: ${hardTotal} questões (${hardCorrect} acertos, ${hardHitRate !== null ? `${hardHitRate}%` : 'N/A'})

DESEMPENHO POR ÁREA:
${JSON.stringify(areasSummary, null, 2)}

SIMULADOS:
${JSON.stringify(mockSummary, null, 2)}

ERROS MAIS FREQUENTES:
${JSON.stringify(countErrors(data.errors), null, 2)}

Gere de 3 a 5 insights com análise realista e recomendações práticas.`

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: INSIGHTS_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    })

    const text = completion.choices[0]?.message?.content
    if (!text) {
      const fallback = fallbackInsights(data)
      await saveInsights(fallback)
      return fallback
    }

    const parsed = parseJsonSafe<AIInsight[]>(text)
    const result = (parsed ?? []).slice(0, 5)
    await saveInsights(result)
    return result
  } catch {
    const fallback = fallbackInsights(data)
    await saveInsights(fallback)
    return fallback
  }
}

function countErrors(errors: ErrorEntry[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const e of errors) {
    counts[e.error_reason] = (counts[e.error_reason] || 0) + 1
  }
  return counts
}

function calculateDaysSinceLastLog(logs: DailyLog[]): number {
  if (logs.length === 0) return 0
  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date))
  const last = new Date(sorted[0].date + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.max(0, Math.round((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)))
}

function fallbackInsights(data: {
  logs: DailyLog[]
  mocks: MockExam[]
  errors: ErrorEntry[]
  areaPerformance: AreaPerformance[]
}): AIInsight[] {
  const insights: AIInsight[] = []
  const lowAreas = data.areaPerformance.filter((a) => a.priority === 'red')
  for (const area of lowAreas) {
    insights.push({
      type: 'priority',
      title: 'Área prioritária detectada',
      description: `${area.area} com ${area.hit_rate}% de acerto. Aumente o volume de questões nesta área.`,
      priority: 'high',
      area: area.area,
    })
  }

  const weekStart = getCurrentWeekStart()
  const weekLogs = data.logs.filter((l) => l.date >= weekStart)
  if (weekLogs.length > 0) {
    const weekQs = weekLogs.reduce((s, l) => s + l.questions_done, 0)
    const weekHr = Math.round(weekLogs.reduce((s, l) => s + l.hours_studied, 0) * 10) / 10
    insights.push({
      type: 'weekly',
      title: 'Resumo da semana',
      description: `Você registrou ${weekLogs.length} dia(s), ${weekQs} questões e ${weekHr}h de estudo nesta semana. Mantenha o ritmo para cumprir sua meta.`,
      priority: 'medium',
    })
  }

  if (data.logs.length === 0) {
    insights.push({
      type: 'suggestion',
      title: 'Comece a registrar',
      description: 'Adicione registros diários para receber análises personalizadas.',
      priority: 'medium',
    })
  }
  if (insights.length === 0) {
    insights.push({
      type: 'suggestion',
      title: 'Bom trabalho!',
      description: 'Continue consistente. Registre mais simulados para acompanhar sua evolução.',
      priority: 'low',
    })
  }
  return insights
}

export interface ClusteringResult {
  isDuplicate: boolean
  existingErrorId: string | null
  suggestedCleanTitle: string
}

export interface GeneratedFlashcard {
  front: string
  back: string
}

export async function generateErrorFlashcard(error: {
  topic: string
  question: string
  error_reason: MotivoErro | string
  sugestao_revisao: string | null
}): Promise<GeneratedFlashcard> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  if (!apiKey) {
    return {
      front: error.topic,
      back: error.question,
    }
  }

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: FLASHCARD_GENERATION_PROMPT },
        {
          role: 'user',
          content: `Tema do erro: "${error.topic}"
Descrição do erro: "${error.question}"
Motivo: ${error.error_reason}${error.sugestao_revisao ? `\nSugestão de revisão: "${error.sugestao_revisao}"` : ''}

Gere o flashcard seguindo estritamente as regras do system prompt.`,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    })

    const text = completion.choices[0]?.message?.content
    if (!text) return { front: error.topic, back: error.question }

    const parsed = parseJsonSafe<GeneratedFlashcard>(text)
    if (!parsed) return { front: error.topic, back: error.question }
    return {
      front: parsed.front || error.topic,
      back: parsed.back || error.question,
    }
  } catch {
    return { front: error.topic, back: error.question }
  }
}

export async function analyzeAndClusterError(
  newErrorText: string,
  existingErrorsOfArea: { id: string; topic: string }[]
): Promise<ClusteringResult> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  if (!apiKey || existingErrorsOfArea.length === 0) {
    return { isDuplicate: false, existingErrorId: null, suggestedCleanTitle: newErrorText }
  }

  const prompt = buildClusteringPrompt(newErrorText, existingErrorsOfArea)

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'Você é um assistente que responta apenas JSON válido.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    })

    const text = completion.choices[0]?.message?.content
    if (!text) {
      return { isDuplicate: false, existingErrorId: null, suggestedCleanTitle: newErrorText }
    }

    const parsed = parseJsonSafe<ClusteringResult>(text)
    if (!parsed) return { isDuplicate: false, existingErrorId: null, suggestedCleanTitle: newErrorText }
    return {
      isDuplicate: parsed.isDuplicate ?? false,
      existingErrorId: parsed.existingErrorId ?? null,
      suggestedCleanTitle: parsed.suggestedCleanTitle || newErrorText,
    }
  } catch {
    return { isDuplicate: false, existingErrorId: null, suggestedCleanTitle: newErrorText }
  }
}
