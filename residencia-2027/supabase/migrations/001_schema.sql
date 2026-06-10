-- Residência 2027 Dashboard - Database Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS daily_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  registration_type TEXT NOT NULL DEFAULT 'questoes' CHECK (registration_type IN ('questoes', 'simulado', 'revisao')),
  hours_studied DECIMAL(4,2) NOT NULL DEFAULT 0,
  questions_done INTEGER NOT NULL DEFAULT 0,
  hit_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  areas_data JSONB NOT NULL DEFAULT '[]',
  core_review_done BOOLEAN NOT NULL DEFAULT false,
  flashcards_done BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  mood TEXT NOT NULL CHECK (mood IN ('excelente', 'bom', 'medio', 'ruim')),
  energy_level INTEGER NOT NULL CHECK (energy_level >= 0 AND energy_level <= 10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mock_exams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  total_score DECIMAL(6,2) NOT NULL DEFAULT 0,
  percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  areas_data JSONB NOT NULL DEFAULT '[]',
  ranking INTEGER,
  participants INTEGER,
  time_spent_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS error_bank (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  topic TEXT NOT NULL,
  subtopic TEXT,
  error_reason TEXT NOT NULL CHECK (error_reason IN ('nao_sabia', 'interpretacao', 'pegadinha', 'pressa', 'esqueci')),
  needs_review BOOLEAN NOT NULL DEFAULT false,
  reviewed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS area_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  area TEXT NOT NULL CHECK (area IN ('clinica_medica', 'cirurgia', 'pediatria', 'ginecologia', 'obstetricia', 'preventiva')),
  questions_done INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  hit_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  trend TEXT DEFAULT 'stable' CHECK (trend IN ('up', 'down', 'stable')),
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enamed_date DATE NOT NULL,
  first_exam_date DATE NOT NULL,
  yearly_goal INTEGER NOT NULL DEFAULT 10000,
  weekly_goal INTEGER NOT NULL DEFAULT 200,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weekly_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start DATE NOT NULL,
  questions_done INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  hit_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  hours_studied DECIMAL(5,2) NOT NULL DEFAULT 0,
  days_studied INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(date);
CREATE INDEX IF NOT EXISTS idx_mock_exams_date ON mock_exams(date);
CREATE INDEX IF NOT EXISTS idx_error_bank_topic ON error_bank(topic);
CREATE INDEX IF NOT EXISTS idx_error_bank_reason ON error_bank(error_reason);
CREATE INDEX IF NOT EXISTS idx_area_performance_area ON area_performance(area);
CREATE INDEX IF NOT EXISTS idx_area_performance_date ON area_performance(date);
CREATE INDEX IF NOT EXISTS idx_weekly_summaries_week_start ON weekly_summaries(week_start);

CREATE TABLE IF NOT EXISTS insights_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('weekly', 'monthly', 'suggestion', 'priority')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  area TEXT CHECK (area IN ('clinica_medica', 'cirurgia', 'pediatria', 'ginecologia', 'obstetricia', 'preventiva')),
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insights_cache_generated ON insights_cache(generated_at);

-- Add new goal columns to study_config if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='study_config' AND column_name='monthly_goal') THEN
    ALTER TABLE study_config ADD COLUMN monthly_goal INTEGER NOT NULL DEFAULT 800;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='study_config' AND column_name='mock_goal_per_week') THEN
    ALTER TABLE study_config ADD COLUMN mock_goal_per_week INTEGER NOT NULL DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='study_config' AND column_name='daily_hours_goal') THEN
    ALTER TABLE study_config ADD COLUMN daily_hours_goal INTEGER NOT NULL DEFAULT 4;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='study_config' AND column_name='daily_questions_goal') THEN
    ALTER TABLE study_config ADD COLUMN daily_questions_goal INTEGER NOT NULL DEFAULT 40;
  END IF;
END $$;

-- Insert default config if not exists
INSERT INTO study_config (enamed_date, first_exam_date, yearly_goal, weekly_goal, monthly_goal, mock_goal_per_week, daily_hours_goal, daily_questions_goal)
SELECT '2026-10-18', '2026-10-25', 10000, 200, 800, 1, 4, 40
WHERE NOT EXISTS (SELECT 1 FROM study_config);

-- Add new columns to existing tables if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='daily_logs' AND column_name='registration_type') THEN
    ALTER TABLE daily_logs ADD COLUMN registration_type TEXT NOT NULL DEFAULT 'questoes' CHECK (registration_type IN ('questoes', 'simulado', 'revisao'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='daily_logs' AND column_name='areas_data') THEN
    ALTER TABLE daily_logs ADD COLUMN areas_data JSONB NOT NULL DEFAULT '[]';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='daily_logs' AND column_name='mock_exam_done') THEN
    ALTER TABLE daily_logs DROP COLUMN mock_exam_done;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mock_exams' AND column_name='areas_data') THEN
    ALTER TABLE mock_exams ADD COLUMN areas_data JSONB NOT NULL DEFAULT '[]';
  END IF;
END $$;
