# AGENTS.md — Residência 2027

App de estudo para residência médica (Brasil). Rastreia daily logs de estudo, simulados, revisão espaçada de questões erradas, metas e gera insights com IA.

## Stack
- React 19 + Vite 8 + TypeScript 6 + Tailwind CSS 4
- Supabase (auth própria via `supabase.auth` + PostgreSQL)
- react-router-dom v7, react-hook-form + zod, recharts, date-fns
- groq-sdk para insights IA (`src/lib/groq.ts` + `src/lib/prompts.ts`)
- Vercel (deploy automático no push da `main`)

## Commands
- `npm run dev` — dev server
- `npm run build` — tsc -b + vite build
- `npm run lint` — eslint
- `npx tsc -b` — typecheck real (tsconfig raiz só tem references; `--noEmit` puro não checa nada)
- `npm run db:migrate` / `db:link` — Supabase CLI

## Estrutura
- `src/types/index.ts` — tipos de domínio + constantes (MEDICAL_AREAS, MOOD_OPTIONS, etc.)
- `src/types/database.ts` — tipos Row/Insert do Supabase (espelhar mudanças de schema)
- `src/lib/calculations.ts` — toda lógica de cálculo (hit rate, score, SRS, area performance); **novos**: `RECENT_WINDOW_DAYS=90`, `filterRecentLogs()`, `calculateRecentMetrics()` (hit rate, questions, platform comparison, inference, area performance para janela móvel), `calculateNextQuestionSRSState()` (errou/chutei/difícil/médio/fácil)
- `src/lib/html.ts` — sanitização do enunciado/comentários (DOMPurify) + `stripHtml()`
- `src/lib/groq.ts` + `src/lib/prompts.ts` — prompts e chamadas IA
- `src/hooks/useData.ts` — composição de hooks por domínio; expõe `recentMetrics`, `recentWindow` (30/60/90 dias), `setRecentWindow` com persistência no `localStorage`
- `src/components/RecentWindowSelector.tsx` — dropdown para escolher janela recente
- `src/pages/` — Dashboard, DailyLog, Performance, Review, ApprovalRadar, StrategicPanel, AIInsights, Settings
- `src/components/review/QuestionContent.tsx` — enunciação (HTML sanitizado), alternativas clicáveis, feedback e comentários
- `src/components/review/ReviewSession.tsx` — sessão de revisão: responder → feedback → avaliar fácil/médio/difícil/chutei
- `src/components/forms/DailyLogForm.tsx` — form de daily log (compartilhado entre criar e editar); bloco "Dados do Simulado" (name, ranking, participants, time_spent_minutes) aparece quando tipo = simulado
- `src/components/modals/EditLogModal.tsx` — converte DailyLog → DailyLogFormData
- `src/components/modals/ViewLogModal.tsx` — preview do log (plataforma + dificuldade + dados de simulado quando presentes)
- `src/components/PlatformPerformance.tsx` — cards de comparação com média da plataforma + inferência estatística (compact no Dashboard, full no Performance) + card **Acesso Direto vs R+** (grid de 3 colunas no full)
- `src/components/charts/MockEvolutionChart.tsx` — gráfico de evolução de simulados (dados de logs tipo simulado)
- `public/extensao/medcof-extensao.zip` — extensão do Chrome servida pelo site (botão em `/configuracoes`)
- `supabase/migrations/` — migrações SQL versionadas (001–017)

## Rotas
`/` dashboard, `/diario`, `/desempenho`, `/revisao`, `/radar`, `/estrategico`, `/ia`, `/configuracoes`, `/login` (`/erros` redireciona para `/revisao`)

## Convenções de domínio
- **Simulados**: unificados em `daily_logs` com `registration_type = 'simulado'`. Tabela `mock_exams` removida (migração 012). Stats de simulados exibidos no `/diario` (contagem, média `getMockAverage`, tendência `getMockTrend`, gráfico)
- **Campos de simulado em `daily_logs`**: `name` (TEXT), `ranking`/`participants`/`time_spent_minutes` (INTEGER), todos nullable e opcionais. `time_spent_minutes` é duplicado como `hours_studied` (minutos/60) para o cálculo de tempo total
- **hit_rate**: percentual 0–100 (ex: 75.5), arredondado com `roundTo2`
- **platform_avg_rate** (DB): percentual 0–100. **Form**: inputs em acertos brutos — "Média da plataforma" (ex: 13) e "Total de questões" da sessão na plataforma (`platform_total_questions`, ex: 20) — convertido via `roundTo2((raw / platformTotalQ) * 100)` no submit, onde `platformTotalQ = platform_total_questions ?? questions_done`. `logToFormValues` converte % → bruto ao editar usando `platform_total_questions` quando presente
- **score_delta** = userRate − platformAvgRate (pontos percentuais, pode ser negativo)
- **platform_avg_rate null** quando não informado; score_delta também null. `platform_total_questions` é a base da média bruta da plataforma (pode diferir de `questions_done` do usuário)
- **Estatística em `calculations.ts`**: `calculatePlatformComparison` (ponderado por `platform_total_questions ?? questions_done`, restrito a sessões com plataforma), `calculateDifficultyBreakdown`, `calculatePlatformInference` (t-test de 1 amostra sobre score_deltas, IC binomial de Wilson global sobre todos os registros, percentil estimado com `ESTIMATED_PLATFORM_SIGMA = 10`pp — aproximação com σ assumido, sempre rotulada como estimativa)
- **question_types** (migração 016, JSONB em `daily_logs`): `{ direto | rplus | outros: { q, c, avg } }` — `q` questões, `c` acertos, `avg` média da plataforma (%) nas mesmas questões. Preenchido pelo sync do MedCof (repo `revisor`). UI: `calculateQuestionTypeBreakdown()` + card "Acesso Direto vs R+" em `PlatformPerformance`
- **Revisão de questões** (migração 017): `error_bank` guarda a questão errada completa — `statement_html`, `alternatives` JSONB (`[{ id, letter, text, comment, is_correct }]`), `correct_answer_id`, `chosen_answer_id`, `tags TEXT[]`, `question_identifier`, `exam_name`, `take_home_message`, `platform_difficulty`, `success_rate`. `review_attempts` registra cada resposta (`result`, `rating`, `chosen_answer_id`, intervalo/ease/repetições resultantes)
- **SRS de questões**: `calculateNextQuestionSRSState(state, result, rating)`. Errou = qualidade 1 (volta 1 dia); acertou + chutei = 2 (reset 1 dia); difícil = 3; médio = 4; fácil = 5. `correct_count`/`review_count`/`lapses` agregados em `error_bank`
- **Pesos do Radar** (`APPROVAL_WEIGHTS` em `calculations.ts`): acerto 30%, evolução simulados 25%, consistência 20%, revisão de questões 20%, banco de erros 5%
- **Flashcards removidos**: colunas `flashcard_front/back` ficam só por legado; UI, prompts e cálculo de aprovação não usam mais
- Áreas: `ginecologia`/`obstetricia` → alias para `ginecologia_obstetricia` via `normalizeArea`
- UI inteira em pt-BR (labels, placeholders, prompts de IA)
- Testes em `src/lib/calculations.test.ts`; validação via `npx tsc -b` + `npm run lint` + `npm run test`

## Banco de dados
- Migrações em `supabase/migrations/NNN_nome.sql`, aplicadas via `supabase db push` (não roda Docker local)
- Qualquer mudança em coluna: atualizar `src/types/database.ts` + `src/types/index.ts` em paralelo

## Convenções de código
- Sem comentários no código (a menos que pedido)
- Tipos explícitos, snake_case para colunas DB, camelCase para vars TS
- Formulários: react-hook-form + zod, `optNum()` para números opcionais (preprocess vazio → null)
- Componentes com Tailwind, tema dark zinc + violet accent

## Integração com o MedCof

Os dados do MedCof QBank entram por dois caminhos, ambos no repo separado `revisor` (não versionado aqui):

1. **`npm run sync`** no `revisor` — CLI que lê a API do MedCof e faz `INSERT` em `daily_logs` + `error_bank`.
2. **Extensão do Chrome "MedCof → Residência 2027"** — mesmo fluxo em 1 clique. Fonte em `revisor/extension/`, zip publicado em `public/extensao/` por `npm run ext:publish`. Card de download em `/configuracoes`.

Regras que o site depende (não quebrar):
- `notes` guarda o nome do teste (ou `"Revisão Núcleo"`); `registration_type` = `questoes` ou `revisao`.
- `error_bank.question` guarda **só o enunciado** (texto puro). O snapshot completo da questão vai em `statement_html` + `alternatives` + `correct_answer_id`; `history_notes` fica por legado.
- A extensão precisa estar sincronizada com o schema: ela envia `statement_html`, `alternatives`, `tags`, `question_identifier` etc. Aplique a migração 017 antes de usar a versão nova.
- O sync só faz `INSERT`; `UPDATE`/`DELETE` são exceções deliberadas (reincidência atualiza contagem e snapshot).
