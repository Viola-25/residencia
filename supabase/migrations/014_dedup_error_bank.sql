-- Corrigir duplicatas de erro no banco de erros.
--
-- A mesma questão foi registrada 3x com texto idêntico em 07/07/2026,
-- com variações de título de tema geradas pelo fluxo de clustering IA.
--
-- Mantemos o primeiro registro (menor created_at) e removemos as duplicatas que
-- compartilham o mesmo question_text.

BEGIN;

-- Remove as duplicatas de mesmo texto, mantendo apenas o registro mais antigo
DELETE FROM error_bank eb
USING (
  SELECT
    question,
    (array_agg(id ORDER BY created_at ASC))[1] AS keep_id
  FROM error_bank
  GROUP BY question
  HAVING COUNT(*) > 1
) d
WHERE eb.question = d.question
  AND eb.id <> d.keep_id;

COMMIT;
