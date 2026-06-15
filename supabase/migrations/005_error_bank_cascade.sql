-- Residência 2027 - Add cascade delete from error_bank to daily_logs
-- When a daily log is deleted, all linked errors are automatically deleted

ALTER TABLE error_bank
ADD CONSTRAINT fk_error_bank_daily_log
FOREIGN KEY (origem_atividade)
REFERENCES daily_logs(id)
ON DELETE CASCADE;
