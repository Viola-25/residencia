-- Residência 2027 - Error Bank Enhancements & Performance Fix

-- Add new columns to error_bank for enriched error tracking
ALTER TABLE error_bank ADD COLUMN IF NOT EXISTS origem_atividade UUID REFERENCES daily_logs(id) ON DELETE SET NULL;
ALTER TABLE error_bank ADD COLUMN IF NOT EXISTS nivel_confianca TEXT CHECK (nivel_confianca IN ('baixo', 'medio', 'alto'));
ALTER TABLE error_bank ADD COLUMN IF NOT EXISTS recorrencia INTEGER NOT NULL DEFAULT 1;
ALTER TABLE error_bank ADD COLUMN IF NOT EXISTS ultima_ocorrencia DATE;
ALTER TABLE error_bank ADD COLUMN IF NOT EXISTS sugestao_revisao TEXT;

-- Add areas_data computed cache columns to area_performance (optional, kept for backward compat)
-- No changes needed to area_performance, we'll compute from daily_logs instead

CREATE INDEX IF NOT EXISTS idx_error_bank_origem ON error_bank(origem_atividade);
CREATE INDEX IF NOT EXISTS idx_error_bank_recorrencia ON error_bank(recorrencia DESC);
CREATE INDEX IF NOT EXISTS idx_error_bank_ultima_ocorrencia ON error_bank(ultima_ocorrencia DESC);
