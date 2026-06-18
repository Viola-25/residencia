import Groq from 'groq-sdk'
import { supabase } from './supabase'
import { getTodayRangeUTC } from './dates'
import type { DailyLog, MockExam, ErrorEntry, AreaPerformance, StudyConfig, AIInsight, MotivoErro } from '../types'

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

const ERROR_EXTRACTION_SYSTEM_PROMPT = `Você é um assistente especializado em extração de erros de estudo para estudantes de medicina.

Analise o relato do estudante e extraia APENAS erros EXPLÍCITOS — situações onde ele claramente mencionou ter errado, não sabido, esquecido, confundido ou tido dificuldade.

IGNORE menções genéricas como "estudei", "fiz questões", "revisei", "li", "completei tópico". Estas NÃO são erros.

REGRAS ESTRITAS:

1. TEMA (campo "topic"):
   - É ESTRITAMENTE PROIBIDO copiar a descrição do erro do usuário.
   - O tema DEVE ser curto, padronizado e iniciar OBRIGATORIAMENTE com uma das 5 grandes áreas da residência médica:
     "Clínica Médica", "Cirurgia", "Ginecologia e Obstetrícia", "Pediatria" ou "Preventiva".
   - Formato: "Grande Área - Subárea/Doença"
   - Exemplo válido: "Clínica Médica - Insuficiência Cardíaca"
   - Exemplo válido: "Cirurgia - Abdome Agudo Obstrutivo"
   - Exemplo INVÁLIDO: "insuficiência cardíaca" (falta a grande área)

2. MOTIVO (campo "error_reason"):
   - Escolha EXATAMENTE UMA das opções abaixo LENDO as palavras do estudante:
     "Não sabia" — quando ele disse que não sabia o conteúdo
     "Esqueci" — quando disse "deu branco", "sabia mas esqueci"
     "Falta de atenção" — quando disse "não vi a palavra exceto", "li rápido demais", "pulei informação"
     "Pegadinha" — quando disse que a questão tinha uma pegadinha
     "Dificuldade de interpretação" — quando confundiu conceitos ou interpretou errado
   - RESOLUÇÃO DE CONFLITOS: Se o relato contiver múltiplos motivos (ex: "era pegadinha e eu esqueci"), priorize a CAUSA RAIZ ESTRUTURAL da questão sobre a falha cognitiva secundária. Neste exemplo, "Pegadinha" é a causa raiz.

3. NÍVEL DE CONFIANÇA (campo "nivel_confianca"):
   "baixo" — se o aluno pareceu muito inseguro
   "medio" — normalmente
   "alto" — se pareceu confiante

4. SUGESTÃO DE REVISÃO (campo "sugestao_revisao"):
   Gere uma dica prática e curta de revisão, ou null se não aplicável.

SAÍDA:
Responda EXCLUSIVAMENTE com um JSON válido — SEM formatação markdown (\`\`\`json), SEM texto antes ou depois.
Se nada for encontrado, retorne array vazio [].

Formato:
[
  {
    "topic": "Grande Área - Subárea/Doença",
    "error_reason": "Não sabia" | "Esqueci" | "Falta de atenção" | "Pegadinha" | "Dificuldade de interpretação",
    "nivel_confianca": "baixo" | "medio" | "alto",
    "sugestao_revisao": "dica curta de revisão ou null"
  }
]`

const INLINE_ERROR_ANALYSIS_PROMPT = `Você é um assistente que analisa erros de estudantes de medicina.

Com base no enunciado da questão, na alternativa que o aluno selecionou (errada) e na alternativa correta, gere uma sugestão de revisão curta e prática.

Responda APENAS com um JSON — SEM markdown, SEM texto extra:
{
  "sugestao_revisao": "sugestão curta de revisão ou null",
  "error_reason_sugerido": "Não sabia" | "Esqueci" | "Falta de atenção" | "Pegadinha" | "Dificuldade de interpretação"
}

Regras:
- sugestao_revisao: dica prática do que revisar com base no erro
- error_reason_sugerido: classifique o motivo mais provável do erro
  - "Dificuldade de interpretação": se o aluno confundiu conceitos ou interpretou errado
  - "Não sabia": se parece que o aluno não sabia o conteúdo
  - "Esqueci": se parece que sabia mas esqueceu
  - "Pegadinha": se a questão tem uma pegadinha clássica
  - "Falta de atenção": se parece erro por pressa/desatenção
- Se não houver dados suficientes, retorne null para sugestao_revisao e "Não sabia" para error_reason_sugerido`

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

const DAILY_ERROR_SUMMARY_PROMPT = `Você é um preceptor experiente dando uma aula particular para um interno de medicina do 11º semestre.

Com base nos erros que ele cometeu hoje, ensine o conteúdo POR TRÁS de cada erro. Não faça um resumo genérico — seja específico e dirigido ao erro cometido. Explique por que a alternativa correta é a certa e onde o raciocínio dele falhou.

Para cada erro:
1. Contextualize o que a questão estava avaliando (o tema específico)
2. Explique o conceito por trás da resposta correta, com clareza e precisão técnica
3. Aponte o erro de raciocínio que ele provavelmente cometeu
4. Diferencie a alternativa correta das erradas, deixando claro o porquê

Organize o texto de forma clara (parágrafos separados por erro), com linguagem técnica mas didática. Seja direto ao ponto — nada de explicações vagas ou genéricas.`

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

const FLASHCARD_GENERATION_PROMPT = `Você é um especialista em criação de flashcards médicos para residência.

Sua tarefa é transformar o erro que o aluno cometeu em um flashcard de alta qualidade para Active Recall.

Regras estritas:
1. A FRENTE (front) do card DEVE ser uma pergunta clínica direta e específica baseada no erro do usuário, ou a última frase de um mini-caso clínico. NUNCA coloque apenas o tema ou assunto.
2. O VERSO (back) do card DEVE conter a resposta direta com a conduta, diagnóstico ou conceito exato, seguida de uma única frase curta de justificativa.

Exemplo:
- Erro: "Não sabia que na cetoacidose diabética o potássio total está baixo"
- Front: "Paciente com cetoacidose diabética chega com potássio sérico de 4,2 mEq/L. Qual a conduta em relação à reposição de potássio?"
- Back: "Repor potássio assim que o nível sérico cair abaixo de 5,3 mEq/L, pois o potássio total corporal está depletado, mesmo que o sérico esteja normal."

Responda APENAS com um JSON no formato:
{ "front": "pergunta clínica aqui", "back": "resposta direta + justificativa aqui" }`

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

  const prompt = `
Você é o motor de inteligência de um software de preparação para residência médica.
Sua tarefa é analisar uma nova anotação de erro de questão e verificar se ela pertence a um tema/tópico que o usuário JÁ errou anteriormente, para podermos agrupar em um único registro em vez de duplicar.

Nova anotação de erro: "${newErrorText}"

Lista de tópicos que o usuário já errou nessa mesma área médica:
${JSON.stringify(existingErrorsOfArea)}

Regras de Negócio:
1. Erros sobre a mesma patologia, conduta errada ou complicação específica devem ser agrupados (Ex: "ICFER tratamento" e "Manejo medicamentoso da insuficiência cardíaca com fração de ejeção reduzida" são o mesmo erro).
2. Se for um erro repetido, retorne isDuplicate: true e o correspondente existingErrorId.
3. Se for um erro inédito, retorne isDuplicate: false e existingErrorId: null.
4. Sempre retorne em suggestedCleanTitle uma versão limpa, padronizada e puramente médica do tópico (Ex: "Cetoacidose Diabética - Manejo Inicial").

Responda ESTRITAMENTE com um objeto JSON no formato:
{
  "isDuplicate": boolean,
  "existingErrorId": string | null,
  "suggestedCleanTitle": string
}
`

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
