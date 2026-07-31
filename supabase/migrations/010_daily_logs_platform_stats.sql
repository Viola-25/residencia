-- Add platform comparison and difficulty distribution columns to daily_logs

ALTER TABLE daily_logs
  ADD COLUMN platform_avg_rate NUMERIC,
  ADD COLUMN score_delta NUMERIC,
  ADD COLUMN easy_correct INTEGER,
  ADD COLUMN easy_total INTEGER,
  ADD COLUMN medium_correct INTEGER,
  ADD COLUMN medium_total INTEGER,
  ADD COLUMN hard_correct INTEGER,
  ADD COLUMN hard_total INTEGER;

COMMENT ON COLUMN daily_logs.platform_avg_rate IS 'Average hit rate on the platform for the same questions/exam';
COMMENT ON COLUMN daily_logs.score_delta IS 'User hit rate minus platform average (user_rate - platform_avg_rate)';
COMMENT ON COLUMN daily_logs.easy_correct IS 'Number of easy-tagged questions answered correctly';
COMMENT ON COLUMN daily_logs.easy_total IS 'Total number of easy-tagged questions attempted';
COMMENT ON COLUMN daily_logs.medium_correct IS 'Number of medium-tagged questions answered correctly';
COMMENT ON COLUMN daily_logs.medium_total IS 'Total number of medium-tagged questions attempted';
COMMENT ON COLUMN daily_logs.hard_correct IS 'Number of hard-tagged questions answered correctly';
COMMENT ON COLUMN daily_logs.hard_total IS 'Total number of hard-tagged questions attempted';
