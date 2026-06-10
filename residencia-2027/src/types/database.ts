export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      daily_logs: {
        Row: {
          id: string
          date: string
          hours_studied: number
          questions_done: number
          hit_rate: number
          core_review_done: boolean
          flashcards_done: boolean
          mock_exam_done: boolean
          notes: string | null
          mood: string
          energy_level: number
          created_at: string
        }
        Insert: {
          id?: string
          date: string
          hours_studied?: number
          questions_done?: number
          hit_rate?: number
          core_review_done?: boolean
          flashcards_done?: boolean
          mock_exam_done?: boolean
          notes?: string | null
          mood: string
          energy_level: number
          created_at?: string
        }
      }
      mock_exams: {
        Row: {
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
        Insert: {
          id?: string
          date: string
          name: string
          total_score: number
          percentage: number
          ranking?: number | null
          participants?: number | null
          time_spent_minutes?: number | null
          created_at?: string
        }
      }
      error_bank: {
        Row: {
          id: string
          question: string
          topic: string
          subtopic: string | null
          error_reason: string
          needs_review: boolean
          reviewed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          question: string
          topic: string
          subtopic?: string | null
          error_reason: string
          needs_review?: boolean
          reviewed?: boolean
          created_at?: string
        }
      }
      area_performance: {
        Row: {
          id: string
          area: string
          questions_done: number
          correct: number
          hit_rate: number
          trend: string
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          area: string
          questions_done?: number
          correct?: number
          hit_rate?: number
          trend?: string
          date: string
          created_at?: string
        }
      }
      study_config: {
        Row: {
          id: string
          enamed_date: string
          first_exam_date: string
          yearly_goal: number
          weekly_goal: number
          updated_at: string
        }
        Insert: {
          id?: string
          enamed_date: string
          first_exam_date: string
          yearly_goal?: number
          weekly_goal?: number
          updated_at?: string
        }
      }
      weekly_summaries: {
        Row: {
          id: string
          week_start: string
          questions_done: number
          correct: number
          hit_rate: number
          hours_studied: number
          days_studied: number
          created_at: string
        }
        Insert: {
          id?: string
          week_start: string
          questions_done?: number
          correct?: number
          hit_rate?: number
          hours_studied?: number
          days_studied?: number
          created_at?: string
        }
      }
    }
  }
}
