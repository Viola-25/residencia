-- Residência 2027 - Error Bank SRS & AI Clustering
-- Adds Spaced Repetition System fields and area column for semantic grouping

ALTER TABLE error_bank
ADD COLUMN IF NOT EXISTS area TEXT,
ADD COLUMN IF NOT EXISTS next_review_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS interval_days INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS ease_factor DOUBLE PRECISION DEFAULT 2.5,
ADD COLUMN IF NOT EXISTS repetitions INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS occurrence_count INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS history_notes TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Index for pending review queries
CREATE INDEX IF NOT EXISTS idx_error_bank_review ON error_bank (next_review_date) WHERE next_review_date IS NOT NULL;

-- Index for area-based clustering queries
CREATE INDEX IF NOT EXISTS idx_error_bank_area ON error_bank (area) WHERE area IS NOT NULL;
