-- Residência 2027 - Authentication & Row Level Security

-- Add user_id to all tables
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE mock_exams ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE error_bank ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE area_performance ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE study_config ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE weekly_summaries ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE insights_cache ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index on user_id for all tables
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_id ON daily_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_mock_exams_user_id ON mock_exams(user_id);
CREATE INDEX IF NOT EXISTS idx_error_bank_user_id ON error_bank(user_id);
CREATE INDEX IF NOT EXISTS idx_area_performance_user_id ON area_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_study_config_user_id ON study_config(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_summaries_user_id ON weekly_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_cache_user_id ON insights_cache(user_id);

-- Each user has one study_config
ALTER TABLE study_config ADD CONSTRAINT study_config_user_id_key UNIQUE (user_id);

-- Enable RLS on all tables
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE area_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights_cache ENABLE ROW LEVEL SECURITY;

-- Create policies for daily_logs
CREATE POLICY "Users can view own daily_logs"
  ON daily_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily_logs"
  ON daily_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily_logs"
  ON daily_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily_logs"
  ON daily_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for mock_exams
CREATE POLICY "Users can view own mock_exams"
  ON mock_exams FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mock_exams"
  ON mock_exams FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mock_exams"
  ON mock_exams FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own mock_exams"
  ON mock_exams FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for error_bank
CREATE POLICY "Users can view own error_bank"
  ON error_bank FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own error_bank"
  ON error_bank FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own error_bank"
  ON error_bank FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own error_bank"
  ON error_bank FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for area_performance
CREATE POLICY "Users can view own area_performance"
  ON area_performance FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own area_performance"
  ON area_performance FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own area_performance"
  ON area_performance FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own area_performance"
  ON area_performance FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for study_config
CREATE POLICY "Users can view own study_config"
  ON study_config FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study_config"
  ON study_config FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study_config"
  ON study_config FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study_config"
  ON study_config FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for weekly_summaries
CREATE POLICY "Users can view own weekly_summaries"
  ON weekly_summaries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly_summaries"
  ON weekly_summaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly_summaries"
  ON weekly_summaries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weekly_summaries"
  ON weekly_summaries FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for insights_cache
CREATE POLICY "Users can view own insights_cache"
  ON insights_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own insights_cache"
  ON insights_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own insights_cache"
  ON insights_cache FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own insights_cache"
  ON insights_cache FOR DELETE
  USING (auth.uid() = user_id);
