-- Unify mock exams into daily_logs (registration_type = 'simulado')

ALTER TABLE daily_logs
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS ranking INTEGER,
  ADD COLUMN IF NOT EXISTS participants INTEGER,
  ADD COLUMN IF NOT EXISTS time_spent_minutes INTEGER;

COMMENT ON COLUMN daily_logs.name IS 'Nome do simulado/prova antiga (opcional, apenas tipo simulado)';
COMMENT ON COLUMN daily_logs.ranking IS 'Classificacao do usuario no simulado (opcional)';
COMMENT ON COLUMN daily_logs.participants IS 'Numero de participantes do simulado (opcional)';
COMMENT ON COLUMN daily_logs.time_spent_minutes IS 'Tempo gasto no simulado em minutos (opcional)';

-- Migrate existing mock_exams into daily_logs as simulado registrations
INSERT INTO daily_logs (
  user_id, date, registration_type, hours_studied, questions_done, hit_rate,
  areas_data, core_review_done, flashcards_done, notes, mood, energy_level,
  platform_avg_rate, platform_total_questions, score_delta,
  easy_correct, easy_total, medium_correct, medium_total, hard_correct, hard_total,
  created_at, name, ranking, participants, time_spent_minutes
)
SELECT
  user_id,
  date,
  'simulado',
  CASE WHEN time_spent_minutes IS NOT NULL
    THEN LEAST(ROUND(time_spent_minutes::numeric / 60, 2), 99.99)
    ELSE 0
  END,
  COALESCE((SELECT SUM((a->>'questions_done')::int) FROM jsonb_array_elements(areas_data) a), 0),
  percentage,
  areas_data,
  false, false, NULL, 'bom', 7,
  NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NULL, NULL,
  created_at, name, ranking, participants, time_spent_minutes
FROM mock_exams;

DROP TABLE IF EXISTS mock_exams;
