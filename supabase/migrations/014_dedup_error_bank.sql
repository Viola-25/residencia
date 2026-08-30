-- Corrigir duplicatas de erro no banco de erros.
--
-- A mesma questão foi registrada 3x com texto idêntico em 07/07/2026,
-- com variações de título de tema geradas pelo fluxo de clustering IA.
--
-- Mantemos o primeiro registro (menor id) e removemos as duplicatas que
-- compartilham o mesmo question_text.

BEGIN;

-- Remove as duplicatas de mesmo texto, mantendo apenas o registro de menor id
DELETE FROM error_bank eb
USING (
  SELECT
    question,
    MIN(id::text) AS keep_id
  FROM error_bank
  GROUP BY question
  HAVING COUNT(*) > 1
) d
WHERE eb.question = d.question
  AND eb.id::text <> d.keep_id;

COMMIT;
