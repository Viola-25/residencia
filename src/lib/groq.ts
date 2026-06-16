import Groq from 'groq-sdk'
import { supabase } from './supabase'
import { getTodayRangeUTC } from './dates'
import type { DailyLog, MockExam, ErrorEntry, AreaPerformance, StudyConfig, AIInsight, ErrorReason } from '../types'

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY || '',
  dangerouslyAllowBrowser: true,
})

const ERROR_EXTRACTION_SYSTEM_PROMPT = `Você é um assistente que extrai erros de estudo de observações de estudantes de medicina.

Analise o texto fornecido e extraia APENAS erros EXPLÍCITOS — situações onde o aluno claramente mencionou ter errado, não sabido, esquecido, confundido ou tido dificuldade com um assunto específico.

IGNORE menções genéricas de estudo, como "estudei sobre X", "fiz questões de Y", "revisei Z", "li sobre W", "completei tópico". Estas não são erros.

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
- topic: extraia apenas o assunto específico do erro (ex: "insuficiência cardíaca", "farmacologia", "cirurgia geral")
- error_reason: classifique o motivo
  - "nao_sabia": quando o aluno disse explicitamente que não sabia o conteúdo
  - "esqueci": quando disse que sabia mas esqueceu
  - "interpretacao": quando disse que errou por interpretação ou confusão
  - "pegadinha": quando disse que caiu em pegadinha
  - "pressa": quando disse que errou por pressa
- nivel_confianca: "baixo" se parecer muito inseguro, "medio" normalmente, "alto" se parecer confiante
- sugestao_revisao: gere uma sugestão prática de revisão ou null se não aplicável
- IMPORTANTE: Só extraia se houver palavra explícita de erro (errei, não sei, esqueci, confundi, dificuldade, etc). Nunca extraia de frases genéricas como "estudei", "fiz", "revisei", "completei", "li".`

const INLINE_ERROR_ANALYSIS_PROMPT = `Você é um assistente que analisa erros de estudantes de medicina.

Com base no enunciado da questão, na alternativa que o aluno selecionou (errada) e na alternativa correta, gere uma sugestão de revisão curta e prática.

Responda APENAS com um JSON:
{
  "sugestao_revisao": "sugestão curta de revisão ou null",
  "error_reason_sugerido": "nao_sabia" | "esqueci" | "interpretacao" | "pegadinha" | "pressa"
}

Regras:
- sugestao_revisao: dica prática do que revisar com base no erro
- error_reason_sugerido: classifique o motivo mais provável do erro
  - "interpretacao": se o aluno confundiu conceitos ou interpretou errado
  - "nao_sabia": se parece que o aluno não sabia o conteúdo
  - "esqueci": se parece que sabia mas esqueceu
  - "pegadinha": se a questão tem uma pegadinha clássica
  - "pressa": se parece erro por pressa/desatenção
- Se não houver dados suficientes, retorne null para sugestao_revisao e "nao_sabia" para error_reason_sugerido`

export async function analyzeInlineError(data: {
  topic: string
  enunciado: string
  alternativa_selecionada: string
  alternativa_certa: string
  error_reason: string
}): Promise<{
  sugestao_revisao: string | null
  error_reason_sugerido: string
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

    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const parsed = JSON.parse(cleaned) as {
      sugestao_revisao: string | null
      error_reason_sugerido: string
    }
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

const DAILY_ERROR_SUMMARY_PROMPT = `Você é um preceptor experiente orientando um interno de medicina do 11º semestre.

Com base nos erros registrados pelo interno hoje, forneça um parágrafo ÚNICO, curto, direto e incisivo elucidando os principais conceitos errados, com foco exclusivo na correção de raciocínio clínico e prático.

Seja objetivo e prático, como um preceptor à beira do leito. Aponte o que precisa ser revisto com urgência e dê direcionamentos claros. NÃO use formatação, NÃO liste tópicos — apenas um parágrafo contínuo.`

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
      max_tokens: 500,
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
