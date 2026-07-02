-- Fix historical areas_data in daily_logs and mock_exams
-- Unifies 'ginecologia' and 'obstetricia' into 'ginecologia_obstetricia'

UPDATE daily_logs
SET areas_data = (
  SELECT jsonb_agg(
    CASE
      WHEN value->>'area' IN ('ginecologia', 'obstetricia')
      THEN jsonb_set(value, '{area}', '"ginecologia_obstetricia"')
      ELSE value
    END
  )
  FROM jsonb_array_elements(
    CASE WHEN areas_data IS NULL THEN '[]'::jsonb ELSE areas_data END
  ) AS value
)
WHERE areas_data IS NOT NULL
  AND areas_data::text LIKE ANY (ARRAY['%ginecologia%', '%obstetricia%']);

UPDATE mock_exams
SET areas_data = (
  SELECT jsonb_agg(
    CASE
      WHEN value->>'area' IN ('ginecologia', 'obstetricia')
      THEN jsonb_set(value, '{area}', '"ginecologia_obstetricia"')
      ELSE value
    END
  )
  FROM jsonb_array_elements(
    CASE WHEN areas_data IS NULL THEN '[]'::jsonb ELSE areas_data END
  ) AS value
)
WHERE areas_data IS NOT NULL
  AND areas_data::text LIKE ANY (ARRAY['%ginecologia%', '%obstetricia%']);

-- Fix error_bank area column for consistency
UPDATE error_bank
SET area = 'ginecologia_obstetricia'
WHERE area IN ('ginecologia', 'obstetricia');
