export type MedicalArea =
  | 'clinica_medica'
  | 'cirurgia'
  | 'pediatria'
  | 'ginecologia'
  | 'obstetricia'
  | 'preventiva'

export type Mood = 'excelente' | 'bom' | 'medio' | 'ruim'

export type ErrorReason = 'nao_sabia' | 'esqueci' | 'interpretacao' | 'pegadinha' | 'pressa'

export interface DailyLog {
  id: string
  date: string
  hours_studied: number
  questions_done: number
  hit_rate: number
  core_review_done: boolean
  flashcards_done: boolean
  mock_exam_done: boolean
  notes: string | null
  mood: Mood
  energy_level: number
  created_at: string
}

export interface DailyLogFormData {
  date: string
  hours_studied: number
  questions_done: number
  hit_rate: number
  core_review_done: boolean
  flashcards_done: boolean
  mock_exam_done: boolean
  notes: string
  mood: Mood
  energy_level: number
}

export interface MockExam {
  id: string
  date: string
  name: string
  total_score: number
  percentage: number
  ranking: number | null
  participants: number | null
  time_spent_minutes: number | null
  created_at: string
}

export interface MockExamFormData {
  date: string
  name: string
  total_score: number
  percentage: number
  ranking: string
  participants: string
  time_spent_minutes: string
}

export interface ErrorEntry {
  id: string
  question: string
  topic: string
  subtopic: string | null
  error_reason: ErrorReason
  needs_review: boolean
  reviewed: boolean
  created_at: string
}

export interface ErrorEntryFormData {
  question: string
  topic: string
  subtopic: string
  error_reason: ErrorReason
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
  { value: 'ginecologia', label: 'Ginecologia' },
  { value: 'obstetricia', label: 'Obstetrícia' },
  { value: 'preventiva', label: 'Preventiva' },
]

export const MOOD_OPTIONS: { value: Mood; label: string }[] = [
  { value: 'excelente', label: 'Excelente' },
  { value: 'bom', label: 'Bom' },
  { value: 'medio', label: 'Médio' },
  { value: 'ruim', label: 'Ruim' },
]

export const ERROR_REASONS: { value: ErrorReason; label: string }[] = [
  { value: 'nao_sabia', label: 'Não sabia' },
  { value: 'esqueci', label: 'Esqueci' },
  { value: 'interpretacao', label: 'Interpretação' },
  { value: 'pegadinha', label: 'Pegadinha' },
  { value: 'pressa', label: 'Pressa' },
]
