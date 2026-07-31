-- Add total question count of the platform session to daily_logs

ALTER TABLE daily_logs
  ADD COLUMN platform_total_questions INTEGER;

COMMENT ON COLUMN daily_logs.platform_total_questions IS 'Total de questoes na sessao/exame da plataforma (base da media da plataforma em acertos brutos)';
