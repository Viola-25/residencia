# AGENTS.md — Residência 2027

App de estudo para residência médica (Brasil). Rastreia daily logs de estudo, simulados, banco de erros, metas e gera insights com IA.

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
- `src/lib/calculations.ts` — toda lógica de cálculo (hit rate, score, SRS, area performance); **novos**: `RECENT_WINDOW_DAYS=90`, `filterRecentLogs()`, `calculateRecentMetrics()` (hit rate, questions, platform comparison, inference, area performance para janela móvel)
- `src/lib/groq.ts` + `src/lib/prompts.ts` — prompts e chamadas IA
- `src/hooks/useData.ts` — composição de hooks por domínio; expõe `recentMetrics`, `recentWindow` (30/60/90 dias), `setRecentWindow` com persistência no `localStorage`
- `src/components/RecentWindowSelector.tsx` — dropdown para escolher janela recente
- `src/pages/` — Dashboard, DailyLog, Performance, ErrorBank, ApprovalRadar, StrategicPanel, AIInsights, Settings
- `src/components/forms/DailyLogForm.tsx` — form de daily log (compartilhado entre criar e editar); bloco "Dados do Simulado" (name, ranking, participants, time_spent_minutes) aparece quando tipo = simulado
- `src/components/modals/EditLogModal.tsx` — converte DailyLog → DailyLogFormData
- `src/components/modals/ViewLogModal.tsx` — preview do log (plataforma + dificuldade + dados de simulado quando presentes)
- `src/components/PlatformPerformance.tsx` — cards de comparação com média da plataforma + inferência estatística (compact no Dashboard, full no Performance) + card **Acesso Direto vs R+** (grid de 3 colunas no full)
- `src/components/charts/MockEvolutionChart.tsx` — gráfico de evolução de simulados (dados de logs tipo simulado)
- `public/extensao/medcof-extensao.zip` — extensão do Chrome servida pelo site (botão em `/configuracoes`)
- `supabase/migrations/` — migrações SQL versionadas (001–016)

## Rotas
`/` dashboard, `/diario`, `/desempenho`, `/erros`, `/radar`, `/estrategico`, `/ia`, `/configuracoes`, `/login`

## Convenções de domínio
- **Simulados**: unificados em `daily_logs` com `registration_type = 'simulado'`. Tabela `mock_exams` removida (migração 012). Stats de simulados exibidos no `/diario` (contagem, média `getMockAverage`, tendência `getMockTrend`, gráfico)
- **Campos de simulado em `daily_logs`**: `name` (TEXT), `ranking`/`participants`/`time_spent_minutes` (INTEGER), todos nullable e opcionais. `time_spent_minutes` é duplicado como `hours_studied` (minutos/60) para o cálculo de tempo total
- **hit_rate**: percentual 0–100 (ex: 75.5), arredondado com `roundTo2`
- **platform_avg_rate** (DB): percentual 0–100. **Form**: inputs em acertos brutos — "Média da plataforma" (ex: 13) e "Total de questões" da sessão na plataforma (`platform_total_questions`, ex: 20) — convertido via `roundTo2((raw / platformTotalQ) * 100)` no submit, onde `platformTotalQ = platform_total_questions ?? questions_done`. `logToFormValues` converte % → bruto ao editar usando `platform_total_questions` quando presente
- **score_delta** = userRate − platformAvgRate (pontos percentuais, pode ser negativo)
- **platform_avg_rate null** quando não informado; score_delta também null. `platform_total_questions` é a base da média bruta da plataforma (pode diferir de `questions_done` do usuário)
- **Estatística em `calculations.ts`**: `calculatePlatformComparison` (ponderado por `platform_total_questions ?? questions_done`, restrito a sessões com plataforma), `calculateDifficultyBreakdown`, `calculatePlatformInference` (t-test de 1 amostra sobre score_deltas, IC binomial de Wilson global sobre todos os registros, percentil estimado com `ESTIMATED_PLATFORM_SIGMA = 10`pp — aproximação com σ assumido, sempre rotulada como estimativa)
- **question_types** (migração 016, JSONB em `daily_logs`): `{ direto | rplus | outros: { q, c, avg } }` — `q` questões, `c` acertos, `avg` média da plataforma (%) nas mesmas questões. Preenchido pelo sync do MedCof (repo `revisor`). UI: `calculateQuestionTypeBreakdown()` + card "Acesso Direto vs R+" em `PlatformPerformance`
- Áreas: `ginecologia`/`obstetricia` → alias para `ginecologia_obstetricia` via `normalizeArea`
- UI inteira em pt-BR (labels, placeholders, prompts de IA)
- Sem testes no projeto; validação via `npx tsc --noEmit` + `npm run lint`

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
- `error_bank.question` guarda **só o enunciado** — a alternativa marcada e a correta vão em `history_notes` (senão a IA do flashcard trata a marcação errada como resposta correta).
- O sync só faz `INSERT`; `UPDATE`/`DELETE` são exceções deliberadas.
