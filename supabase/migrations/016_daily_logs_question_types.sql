-- Desempenho por tipo de questão: Acesso Direto (R1) vs R+ (questões de provas anteriores)
-- Guarda, por registro: { "direto": {q,c,avg}, "rplus": {q,c,avg}, "outros": {q,c,avg} }
--   q   = questões respondidas
--   c   = acertos
--   avg = média da plataforma (%) nas mesmas questões

ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS question_types JSONB;

COMMENT ON COLUMN daily_logs.question_types IS
  'Breakdown por tipo de questão (direto = R1 Acesso Direto, rplus = R+ de provas anteriores): {tipo: {q, c, avg}}';
