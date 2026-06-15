-- Residência 2027 - Daily summary cache for AI-generated error summaries

CREATE TABLE IF NOT EXISTS daily_summary_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  summary TEXT NOT NULL,
  date DATE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_summary_cache_date ON daily_summary_cache(date);
CREATE INDEX IF NOT EXISTS idx_daily_summary_cache_user_id ON daily_summary_cache(user_id);

ALTER TABLE daily_summary_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily_summary_cache"
  ON daily_summary_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily_summary_cache"
  ON daily_summary_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily_summary_cache"
  ON daily_summary_cache FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily_summary_cache"
  ON daily_summary_cache FOR DELETE
  USING (auth.uid() = user_id);
