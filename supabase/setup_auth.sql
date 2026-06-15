-- ============================================================
-- PASSO 1: Rodar isso no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. Primeiro, execute a migration de autenticação:
--    (copie todo o conteúdo do arquivo 004_auth_rls.sql e cole aqui)

-- 2. DEPOIS de criar sua conta no login da plataforma,
--    rode o comando abaixo para vincular seus dados existentes
--    (substitua SEU_EMAIL pelo email que você cadastrou):

-- BEGIN;
--   DO $$
--   DECLARE
--     uid uuid;
--   BEGIN
--     SELECT id INTO uid FROM auth.users WHERE email = 'SEU_EMAIL';
-- 
--     UPDATE daily_logs SET user_id = uid WHERE user_id IS NULL;
--     UPDATE mock_exams SET user_id = uid WHERE user_id IS NULL;
--     UPDATE error_bank SET user_id = uid WHERE user_id IS NULL;
--     UPDATE area_performance SET user_id = uid WHERE user_id IS NULL;
--     UPDATE study_config SET user_id = uid WHERE user_id IS NULL AND id = 'default';
--     UPDATE weekly_summaries SET user_id = uid WHERE user_id IS NULL;
--     UPDATE insights_cache SET user_id = uid WHERE user_id IS NULL;
--   END $$;
-- COMMIT;
