export type MedicalArea =
  | 'clinica_medica'
  | 'cirurgia'
  | 'pediatria'
  | 'ginecologia_obstetricia'
  | 'preventiva'

export type Mood = 'excelente' | 'bom' | 'medio' | 'ruim'

export type MotivoErro =
  | 'Não sabia'
  | 'Esqueci'
  | 'Falta de atenção'
  | 'Pegadinha'
  | 'Dificuldade de interpretação'

export type GrandeArea =
  | 'Clínica Médica'
  | 'Cirurgia'
  | 'Ginecologia e Obstetrícia'
  | 'Pediatria'
  | 'Preventiva'

export type RegistrationType = 'questoes' | 'simulado' | 'revisao'

export interface AreaDatum {
  area: MedicalArea
  questions_done: number
  correct: number
}

export interface DailyLog {
  id: string
  date: string
  registration_type: RegistrationType
  hours_studied: number
  questions_done: number
  hit_rate: number
  areas_data: AreaDatum[]
  core_review_done: boolean
  flashcards_done: boolean
  notes: string | null
  mood: Mood
  energy_level: number
  platform_avg_rate: number | null
  score_delta: number | null
  easy_correct: number | null
  easy_total: number | null
  medium_correct: number | null
  medium_total: number | null
  hard_correct: number | null
  hard_total: number | null
  created_at: string
}

export interface InlineError {
  topic: string
  enunciado: string
  alternativa_selecionada: string
  alternativa_certa: string
  error_reason: MotivoErro
}

export interface DailyLogFormData {
  date: string
  registration_type: RegistrationType
  hours_studied: number
  areas: Record<MedicalArea, { questions_done: number; correct: number }>
  core_review_done: boolean
  flashcards_done: boolean
  notes: string
  mood: Mood
  energy_level: number
  platform_avg_rate: number | null
  easy_correct: number | null
  easy_total: number | null
  medium_correct: number | null
  medium_total: number | null
  hard_correct: number | null
  hard_total: number | null
}

export interface MockExam {
  id: string
  date: string
  name: string
  total_score: number
  percentage: number
  areas_data: AreaDatum[]
  ranking: number | null
  participants: number | null
  time_spent_minutes: number | null
  created_at: string
}

export interface MockExamFormData {
  date: string
  name: string
  areas: Record<MedicalArea, { questions_done: number; correct: number }>
  ranking: string
  participants: string
  time_spent_minutes: string
}

export interface ErrorEntry {
  id: string
  question: string
  topic: string
  subtopic: string | null
  area: MedicalArea | null
  error_reason: MotivoErro
  needs_review: boolean
  reviewed: boolean
  origem_atividade: string | null
  nivel_confianca: 'baixo' | 'medio' | 'alto' | null
  recorrencia: number
  ultima_ocorrencia: string | null
  sugestao_revisao: string | null
  next_review_date: string | null
  interval_days: number
  ease_factor: number
  repetitions: number
  occurrence_count: number
  history_notes: string[] | null
  created_at: string
}

export interface ErrorEntryFormData {
  question: string
  topic: string
  subtopic: string
  error_reason: MotivoErro
  needs_review: boolean
}

export interface AreaPerformance {
  id: string
  area: MedicalArea
  questions_done: number
  correct: number
  hit_rate: number
  trend: 'up' | 'down' | 'stable'
  priority: 'red' | 'yellow' | 'green'
}

export interface WeeklySummary {
  id: string
  week_start: string
  questions_done: number
  correct: number
  hit_rate: number
  hours_studied: number
  days_studied: number
}

export interface StudyConfig {
  id: string
  enamed_date: string
  first_exam_date: string
  yearly_goal: number
  weekly_goal: number
  monthly_goal: number
  mock_goal_per_week: number
  daily_hours_goal: number
  daily_questions_goal: number
}

export interface DashboardMetrics {
  days_to_enamed: number
  days_to_first_exam: number
  total_questions: number
  total_correct: number
  global_hit_rate: number
  yearly_progress: number
  weekly_progress: number
  evolution_percentage: number
  current_streak: number
  days_without_study: number
}

export interface ApprovalScore {
  score: number
  label: 'Abaixo do esperado' | 'Competitivo' | 'Muito competitivo' | 'Faixa de aprovação'
  components: {
    hit_rate_score: number
    mock_evolution_score: number
    consistency_score: number
    review_score: number
    error_bank_score: number
  }
}

export interface AIInsight {
  type: 'weekly' | 'monthly' | 'suggestion' | 'priority'
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  area?: MedicalArea
}

export interface StrategicData {
  top_strengths: { area: MedicalArea; hit_rate: number }[]
  top_weaknesses: { area: MedicalArea; hit_rate: number }[]
  most_growth: { area: MedicalArea; growth: number } | null
  most_decline: { area: MedicalArea; decline: number } | null
  days_without_study: number
  current_streak: number
  best_week: WeeklySummary | null
}

export const MEDICAL_AREAS: { value: MedicalArea; label: string }[] = [
  { value: 'clinica_medica', label: 'Clínica Médica' },
  { value: 'cirurgia', label: 'Cirurgia' },
  { value: 'pediatria', label: 'Pediatria' },
  { value: 'ginecologia_obstetricia', label: 'Ginecologia e Obstetrícia' },
  { value: 'preventiva', label: 'Preventiva' },
]

export const AREA_LABELS: Record<MedicalArea, string> = {
  clinica_medica: 'Clínica Médica',
  cirurgia: 'Cirurgia',
  pediatria: 'Pediatria',
  ginecologia_obstetricia: 'Ginecologia e Obstetrícia',
  preventiva: 'Preventiva',
}

export const AREA_LABELS_SHORT: Record<MedicalArea, string> = {
  clinica_medica: 'Clínica',
  cirurgia: 'Cirurgia',
  pediatria: 'Pediatria',
  ginecologia_obstetricia: 'G.O.',
  preventiva: 'Preventiva',
}

export const MOOD_OPTIONS: { value: Mood; label: string }[] = [
  { value: 'excelente', label: 'Excelente' },
  { value: 'bom', label: 'Bom' },
  { value: 'medio', label: 'Médio' },
  { value: 'ruim', label: 'Ruim' },
]

export const REGISTRATION_TYPES: { value: RegistrationType; label: string }[] = [
  { value: 'questoes', label: 'Rodada de Questões' },
  { value: 'simulado', label: 'Simulado' },
  { value: 'revisao', label: 'Revisão Núcleo' },
]

export const ERROR_REASONS: { value: MotivoErro; label: string }[] = [
  { value: 'Não sabia', label: 'Não sabia' },
  { value: 'Esqueci', label: 'Esqueci' },
  { value: 'Falta de atenção', label: 'Falta de atenção' },
  { value: 'Pegadinha', label: 'Pegadinha' },
  { value: 'Dificuldade de interpretação', label: 'Dificuldade de interpretação' },
]
