-- Corrigir areas_data corrompido do registro de 2026-07-09.
-- questions_done = 15 e hit_rate = 73.33 (11 acertos), mas areas_data somava
-- 60 questões (clínica 55 + gineco 5), inflando o total por área em +45
-- e quebrando a reconciliação soma(areas_data) vs questions_done.
--
-- O registro é de origem clínica (55 das 60 questões), então consolidamos
-- em uma única entrada de clínica_medica totalizando exatamente as 15
-- questões / 11 acertos declarados no log.

UPDATE daily_logs
SET areas_data = '[{"area":"clinica_medica","questions_done":15,"correct":11}]'::jsonb
WHERE id = '22cc061d-085b-4283-bada-d96cf3c1ccff';
