-- Residência 2027 - Revisão espaçada de questões (substitui flashcards)

ALTER TABLE error_bank
  ADD COLUMN IF NOT EXISTS statement_html TEXT,
  ADD COLUMN IF NOT EXISTS alternatives JSONB,
  ADD COLUMN IF NOT EXISTS correct_answer_id TEXT,
  ADD COLUMN IF NOT EXISTS chosen_answer_id TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS question_identifier TEXT,
  ADD COLUMN IF NOT EXISTS exam_name TEXT,
  ADD COLUMN IF NOT EXISTS exam_identifier TEXT,
  ADD COLUMN IF NOT EXISTS institution TEXT,
  ADD COLUMN IF NOT EXISTS question_year TEXT,
  ADD COLUMN IF NOT EXISTS take_home_message TEXT,
  ADD COLUMN IF NOT EXISTS overall_comment TEXT,
  ADD COLUMN IF NOT EXISTS platform_difficulty TEXT,
  ADD COLUMN IF NOT EXISTS success_rate DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS last_result TEXT CHECK (last_result IN ('correct', 'incorrect')),
  ADD COLUMN IF NOT EXISTS last_rating TEXT CHECK (last_rating IN ('easy', 'medium', 'hard', 'guess')),
  ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS correct_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lapses INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_error_bank_question_identifier ON error_bank(question_identifier);
CREATE INDEX IF NOT EXISTS idx_error_bank_tags ON error_bank USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_error_bank_last_reviewed ON error_bank(last_reviewed_at DESC);

CREATE TABLE IF NOT EXISTS review_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  error_id UUID NOT NULL REFERENCES error_bank(id) ON DELETE CASCADE,
  result TEXT NOT NULL CHECK (result IN ('correct', 'incorrect')),
  rating TEXT NOT NULL CHECK (rating IN ('easy', 'medium', 'hard', 'guess')),
  chosen_answer_id TEXT,
  interval_after INTEGER NOT NULL DEFAULT 0,
  ease_after DOUBLE PRECISION NOT NULL DEFAULT 2.5,
  repetitions_after INTEGER NOT NULL DEFAULT 0,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_attempts_error ON review_attempts(error_id, answered_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_attempts_user ON review_attempts(user_id, answered_at DESC);

ALTER TABLE review_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own review_attempts"
  ON review_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own review_attempts"
  ON review_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own review_attempts"
  ON review_attempts FOR DELETE
  USING (auth.uid() = user_id);
