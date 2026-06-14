import Groq from 'groq-sdk'
import { supabase } from './supabase'
import type { DailyLog, MockExam, ErrorEntry, AreaPerformance, StudyConfig, AIInsight, ErrorReason } from '../types'

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY || '',
  dangerouslyAllowBrowser: true,
})

const ERROR_EXTRACTION_SYSTEM_PROMPT = `Você é um assistente que extrai erros de estudo de observações de estudantes de medicina.

Analise o texto fornecido e extraia TODOS os erros, dificuldades, assuntos fracos, temas para revisão e conceitos confundidos mencionados.

Responda APENAS com um array JSON. Se nada for encontrado, retorne array vazio [].
Formato esperado:
[
  {
    "topic": "nome do tema extraído",
    "error_reason": "nao_sabia" | "esqueci" | "interpretacao" | "pegadinha" | "pressa",
    "nivel_confianca": "baixo" | "medio" | "alto",
    "sugestao_revisao": "sugestão curta de revisão ou null"
  }
]

Regras:
- topic: extraia o assunto específico (ex: "insuficiência cardíaca", "farmacologia", "cirurgia geral")
- error_reason: classifique o motivo
  - "nao_sabia": quando o aluno não sabia o conteúdo
  - "esqueci": quando sabia mas esqueceu
  - "interpretacao": quando errou por interpretação ou confusão
  - "pegadinha": quando caiu em pegadinha
  - "pressa": quando errou por pressa
- nivel_confianca: "baixo" se parecer muito inseguro, "medio" normalmente, "alto" se parecer confiante
- sugestao_revisao: gere uma sugestão prática de revisão ou null se não aplicável`

export async function extractErrorsFromNotesAI(notes: string): Promise<{
  topic: string
  error_reason: ErrorReason
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

    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const parsed = JSON.parse(cleaned) as {
      topic: string
      error_reason: ErrorReason
      nivel_confianca: 'baixo' | 'medio' | 'alto'
      sugestao_revisao: string | null
    }[]
    return Array.isArray(parsed) ? parsed.slice(0, 10) : []
  } catch {
    return []
  }
}

const SYSTEM_PROMPT = `Você é um assistente especializado em análise de desempenho para preparação de residência médica.

Com base nos dados de estudo fornecidos, gere insights em português no formato JSON:
[
  {
    "type": "weekly" | "monthly" | "suggestion" | "priority",
    "title": "título curto",
    "description": "descrição detalhada com análise e recomendação (máx 3 frases)",
    "priority": "low" | "medium" | "high",
    "area": "clinica_medica" | "cirurgia" | "pediatria" | "ginecologia_obstetricia" | "preventiva" | null
  }
]

Regras:
- Seja direto e específico com números concretos
- Sugira ações práticas
- Destaque áreas com desempenho abaixo de 70%
- Compare áreas entre si
- Apenas JSON válido, sem texto extra`

export async function loadCachedInsights(): Promise<AIInsight[] | null> {
  try {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('insights_cache')
      .select('*')
      .gte('generated_at', today)
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

  const userPrompt = `DADOS DE ESTUDO:
- Total de dias registrados: ${data.logs.length}
- Total de questões: ${totalQuestions}
- Total de acertos: ${totalCorrect}
- Taxa global de acerto: ${globalHitRate}%
- Total de simulados: ${data.mocks.length}
- Total de erros registrados: ${data.errors.length}
- Meta semanal: ${data.config.weekly_goal} questões
- Dias sem estudar: ${calculateDaysSinceLastLog(data.logs)}

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
        { role: 'system', content: SYSTEM_PROMPT },
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

    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const parsed = JSON.parse(cleaned) as AIInsight[]
    const result = parsed.slice(0, 5)
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
