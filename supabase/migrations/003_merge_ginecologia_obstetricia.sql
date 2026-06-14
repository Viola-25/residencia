-- Merge ginecologia and obstetricia into ginecologia_obstetricia

-- Update area_performance CHECK constraint
ALTER TABLE area_performance DROP CONSTRAINT IF EXISTS area_performance_area_check;
ALTER TABLE area_performance ADD CONSTRAINT area_performance_area_check
  CHECK (area IN ('clinica_medica', 'cirurgia', 'pediatria', 'ginecologia_obstetricia', 'preventiva'));

-- Update insights_cache CHECK constraint
ALTER TABLE insights_cache DROP CONSTRAINT IF EXISTS insights_cache_area_check;
ALTER TABLE insights_cache ADD CONSTRAINT insights_cache_area_check
  CHECK (area IN ('clinica_medica', 'cirurgia', 'pediatria', 'ginecologia_obstetricia', 'preventiva'));

-- Migrate existing data
UPDATE area_performance SET area = 'ginecologia_obstetricia' WHERE area IN ('ginecologia', 'obstetricia');
UPDATE insights_cache SET area = 'ginecologia_obstetricia' WHERE area IN ('ginecologia', 'obstetricia');
