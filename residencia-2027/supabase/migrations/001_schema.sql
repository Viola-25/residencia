-- Residência 2027 Dashboard - Database Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE daily_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  hours_studied DECIMAL(4,2) NOT NULL DEFAULT 0,
  questions_done INTEGER NOT NULL DEFAULT 0,
  hit_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  core_review_done BOOLEAN NOT NULL DEFAULT false,
  flashcards_done BOOLEAN NOT NULL DEFAULT false,
  mock_exam_done BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  mood TEXT NOT NULL CHECK (mood IN ('excelente', 'bom', 'medio', 'ruim')),
  energy_level INTEGER NOT NULL CHECK (energy_level >= 0 AND energy_level <= 10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mock_exams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  total_score DECIMAL(6,2) NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  ranking INTEGER,
  participants INTEGER,
  time_spent_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE error_bank (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  topic TEXT NOT NULL,
  subtopic TEXT,
  error_reason TEXT NOT NULL CHECK (error_reason IN ('nao_sabia', 'interpretacao', 'pegadinha', 'pressa', 'esqueci')),
  needs_review BOOLEAN NOT NULL DEFAULT false,
  reviewed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE area_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  area TEXT NOT NULL CHECK (area IN ('clinica_medica', 'cirurgia', 'pediatria', 'ginecologia', 'obstetricia', 'preventiva')),
  questions_done INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  hit_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  trend TEXT DEFAULT 'stable' CHECK (trend IN ('up', 'down', 'stable')),
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE study_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enamed_date DATE NOT NULL,
  first_exam_date DATE NOT NULL,
  yearly_goal INTEGER NOT NULL DEFAULT 10000,
  weekly_goal INTEGER NOT NULL DEFAULT 200,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE weekly_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start DATE NOT NULL,
  questions_done INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  hit_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  hours_studied DECIMAL(5,2) NOT NULL DEFAULT 0,
  days_studied INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_daily_logs_date ON daily_logs(date);
CREATE INDEX idx_mock_exams_date ON mock_exams(date);
CREATE INDEX idx_error_bank_topic ON error_bank(topic);
CREATE INDEX idx_error_bank_reason ON error_bank(error_reason);
CREATE INDEX idx_area_performance_area ON area_performance(area);
CREATE INDEX idx_area_performance_date ON area_performance(date);
CREATE INDEX idx_weekly_summaries_week_start ON weekly_summaries(week_start);
