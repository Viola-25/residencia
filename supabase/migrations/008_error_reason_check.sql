-- Residência 2027 - CHECK constraint for error_reason field
-- Restricts the error_reason column to exactly 5 standardized values
-- and migrates legacy values to the new format.

-- First, migrate existing legacy values to the new standardized format
UPDATE error_bank
SET error_reason = 'Não sabia'
WHERE error_reason = 'nao_sabia';

UPDATE error_bank
SET error_reason = 'Esqueci'
WHERE error_reason = 'esqueci';

UPDATE error_bank
SET error_reason = 'Dificuldade de interpretação'
WHERE error_reason IN ('interpretacao', 'interpretação');

UPDATE error_bank
SET error_reason = 'Pegadinha'
WHERE error_reason = 'pegadinha';

UPDATE error_bank
SET error_reason = 'Falta de atenção'
WHERE error_reason IN ('pressa', 'Falta de atencao');

-- Add CHECK constraint to prevent LLM hallucinations from polluting the database
ALTER TABLE error_bank
ADD CONSTRAINT error_bank_error_reason_check
CHECK (error_reason IN (
  'Não sabia',
  'Esqueci',
  'Falta de atenção',
  'Pegadinha',
  'Dificuldade de interpretação'
));
