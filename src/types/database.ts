export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      daily_logs: {
        Row: {
          id: string
          date: string
          registration_type: string
          hours_studied: number
          questions_done: number
          hit_rate: number
          areas_data: Json
          core_review_done: boolean
          flashcards_done: boolean
          notes: string | null
          mood: string
          energy_level: number
          platform_avg_rate: number | null
          platform_total_questions: number | null
          score_delta: number | null
          easy_correct: number | null
          easy_total: number | null
          medium_correct: number | null
          medium_total: number | null
          hard_correct: number | null
          hard_total: number | null
          created_at: string
          user_id: string
        }
        Insert: {
          id?: string
          date: string
          registration_type?: string
          hours_studied?: number
          questions_done?: number
          hit_rate?: number
          areas_data?: Json
          core_review_done?: boolean
          flashcards_done?: boolean
          notes?: string | null
          mood: string
          energy_level: number
          platform_avg_rate?: number | null
          platform_total_questions?: number | null
          score_delta?: number | null
          easy_correct?: number | null
          easy_total?: number | null
          medium_correct?: number | null
          medium_total?: number | null
          hard_correct?: number | null
          hard_total?: number | null
          created_at?: string
          user_id: string
        }
      }
      mock_exams: {
        Row: {
          id: string
          date: string
          name: string
          total_score: number
          percentage: number
          areas_data: Json
          ranking: number | null
          participants: number | null
          time_spent_minutes: number | null
          created_at: string
          user_id: string
        }
        Insert: {
          id?: string
          date: string
          name: string
          total_score: number
          percentage: number
          areas_data?: Json
          ranking?: number | null
          participants?: number | null
          time_spent_minutes?: number | null
          created_at?: string
          user_id: string
        }
      }
      error_bank: {
        Row: {
          id: string
          question: string
          topic: string
          subtopic: string | null
          area: string | null
          error_reason: string
          needs_review: boolean
          reviewed: boolean
          origem_atividade: string | null
          nivel_confianca: string | null
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
          user_id: string
        }
        Insert: {
          id?: string
          question: string
          topic: string
          subtopic?: string | null
          area?: string | null
          error_reason: string
          needs_review?: boolean
          reviewed?: boolean
          origem_atividade?: string | null
          nivel_confianca?: string | null
          recorrencia?: number
          ultima_ocorrencia?: string | null
          sugestao_revisao?: string | null
          next_review_date?: string | null
          interval_days?: number
          ease_factor?: number
          repetitions?: number
          occurrence_count?: number
          history_notes?: string[] | null
          created_at?: string
          user_id: string
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
          user_id: string
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
          user_id: string
        }
      }
      daily_summary_cache: {
        Row: {
          id: string
          summary: string
          date: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          summary: string
          date: string
          user_id?: string
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
          monthly_goal: number
          mock_goal_per_week: number
          daily_hours_goal: number
          daily_questions_goal: number
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          enamed_date: string
          first_exam_date: string
          yearly_goal?: number
          weekly_goal?: number
          monthly_goal?: number
          mock_goal_per_week?: number
          daily_hours_goal?: number
          daily_questions_goal?: number
          updated_at?: string
          user_id: string
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
          user_id: string
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
          user_id: string
        }
      }
      insights_cache: {
        Row: {
          id: string
          type: string
          title: string
          description: string
          priority: string
          area: string | null
          generated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          type: string
          title: string
          description: string
          priority: string
          area?: string | null
          generated_at?: string
          user_id: string
        }
      }
    }
  }
}
