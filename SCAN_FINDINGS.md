# Scan Profundo — 14/09/2026

## Resolvido
- [x] `next_review_date: null` escondia erros da revisão (commit 7fe6030)
- [x] Import faltando `isErrorDue` no ErrorBank (commit 26be46a)
- [x] Flashcards: persistência + fallback manual + question com conteúdo real (commit c16ed27)
- [x] ViewLogModal: zero-value difficulty mostra `—` (commit a4bc085)
- [x] Dashboard: TrendingDown icon pra tendência negativa (commit a4bc085)
- [x] calculateTotalCorrect: arredondamento acumulativo (commit a4bc085)
- [x] Settings: save sem error handling (commit a4bc085)
- [x] DailyLog: addDailyLog não awaited (commit a4bc085)
- [x] DailyLogForm: core_review_done/flashcards_done sempre sobrescritos (commit a4bc085)
- [x] useErrorBank: addSmartError sem try/catch + res.error checks (commit 574817a)
- [x] Todos os hooks: res.error nunca checado (commit 574817a)
- [x] user!.id sem guard em todos os hooks (commit 574817a)
- [x] addDailyLog retorna em falha — FK quebrada (commit 574817a)
- [x] Modals: Escape key + backdrop click (commit 27c25d1)
- [x] QuickErrorModal: loading state (commit 27c25d1)
- [x] DailyLog: 30 logs truncados com indicador (commit 27c25d1)
- [x] Performance: chartData/allAreas memoizados (commit 27c25d1)
- [x] moodColors: extraído pra MOOD_COLORS compartilhado (commit 27c25d1)
- [x] ErrorBoundary global + rota 404 (commit 27c25d1)
- [x] DailyLogForm: watch() → per-field watches (commit 41d1934)
- [x] Dead code: saveAreaPerformance + toggleErrorReview removidos (commit 41d1934)
- [x] Badge/StatCard: Record<string,string> → tipos específicos (commit 41d1934)
- [x] Performance: imports duplicados merged (commit 41d1934)
- [x] DailyLog: getMockTrend memoizado (commit 41d1934)
- [x] AuthContext: 'as any' → tipagem adequada (commit 41d1934)
- [x] Migração 014: UUID ordering corrigido (commit 41d1934)

---

## BLOQUEADOR (funcionalidade morta)

| # | Arquivo | Bug | Status |
|---|---------|-----|--------|
| 1 | `.env` | `VITE_GROQ_API_KEY` não existia — features IA em fallback | ✅ Resolvido (chave no Vercel) |
| 2 | `useData.ts:118` | `addExtractedErrors` salvava `question` como label `[Auto: data]` | ✅ Resolvido |
| 3 | `error_bank` (schema) | Sem colunas `flashcard_front`/`flashcard_back` | ✅ Resolvido (migração 015) |

---

## CRÍTICO (perda de dados / crash)

| # | Arquivo:linha | Bug | Status |
|---|---------------|-----|--------|
| 4 | `useErrorBank.ts:107-191` | `addSmartError` — zero try/catch em inserts/updates Supabase | ✅ Resolvido |
| 5 | Todos os hooks | `res.error` da Supabase **nunca checado** — queries falham silenciosamente | ✅ Resolvido |
| 6 | `useData.ts:127`, `useErrorBank.ts:189,199` | `user!.id` sem guard — crash antes do auth | ✅ Resolvido |
| 7 | `useDailyLogs.ts:101` | `addDailyLog` retorna resultado mesmo se insert falhar — FK quebrada | ✅ Resolvido |
| 8 | `ErrorBank.tsx:340-348` | Flashcard navigation sem `.catch()` — loading trava | ✅ Resolvido (refatorado) |

---

## ALTO (bugs visíveis pro usuário)

| # | Arquivo:linha | Bug | Status |
|---|---------------|-----|--------|
| 9 | `DailyLogForm.tsx:209-210` | `core_review_done` e `flashcards_done` sempre sobrescrevidos no submit | ✅ Resolvido |
| 10 | `ViewLogModal.tsx:165,171,177` | `easy_total=0` mostra `—` em vez de `0/0` (truthiness check) | ✅ Resolvido |
| 11 | `DailyLog.tsx:124-126` | `addDailyLog` não awaits — formulário fecha antes de confirmar save | ✅ Resolvido |
| 12 | `Settings.tsx:12-17` | Save sem try/catch — "Configurações salvas!" mesmo se falhar | ✅ Resolvido |
| 13 | `calculations.ts:326-328` | `calculateTotalCorrect` arredonda por log → erro acumula | ✅ Resolvido |
| 14 | `Dashboard.tsx:64` | Ícone `TrendingUp` usado pra `'down'` em vez de `TrendingDown` | ✅ Resolvido |

---

## MÉDIO (UX / performance)

| # | Descrição | Status |
|---|-----------|--------|
| 15 | Modals sem Escape key pra fechar | ✅ Resolvido |
| 16 | `EditLogModal` sem backdrop click | ✅ Resolvido |
| 17 | `QuickErrorModal` sem loading state (click duplo) | ✅ Resolvido |
| 18 | `DailyLog.tsx:183` — 30 logs truncados sem indicador | ✅ Resolvido |
| 19 | `DailyLogForm.tsx:153` — `watch()` sem selector, re-render a cada keystroke | ✅ Resolvido |
| 20 | `Performance.tsx:93-119` — `chartData` e `allAreas` não memoizados | ✅ Resolvido |
| 21 | `moodColors` definido 3x em arquivos diferentes | ✅ Resolvido |
| 22 | `ErrorBoundary` só no `/erros` — crash em outra página = tela branca | ✅ Resolvido |
| 23 | Sem rota 404/catch-all | ✅ Resolvido |

---

## BAIXO (qualidade de código)

| # | Descrição | Status |
|---|-----------|--------|
| 24 | `saveAreaPerformance` em `useData` — dead code | ✅ Resolvido |
| 25 | `config` desestruturado mas não usado no Dashboard | Pendente |
| 26 | `toggleErrorReview` importado mas não usado no ErrorBank | ✅ Resolvido |
| 27 | `Record<string, string>` em vez de tipos específicos (Badge, StatCard) | ✅ Resolvido |
| 28 | Imports duplicados do mesmo módulo (Performance.tsx) | ✅ Resolvido |
| 29 | `getMockTrend` chamado 3x no render (DailyLog.tsx) | ✅ Resolvido |

---

## SEGURANÇA

| # | Descrição | Status |
|---|-----------|--------|
| 30 | Groq API key exposta no bundle do browser (`dangerouslyAllowBrowser: true`) | Pendente |
| 31 | `AuthContext.tsx:24` — `supabase.auth as any` bypassa type safety | ✅ Resolvido |
| 32 | Migração `014` — `MIN(id::text)` compara UUID como texto (ordenação lexical) | ✅ Resolvido |

---

## Flashcard Flow (atualizado)

```
Erro já tem flashcard_front? → usa direto (sem IA)
  ↓ não
Chama LLM com topic + question + sugestao_revisao + history_notes
  ↓ sucesso
Salva front/back no DB → mostra
  ↓ falha
Mostra: "IA não foi capaz de gerar o flashcard automaticamente."
  → Botão "Criar manualmente" → textarea → Salvar e Continuar
  → Botão "Pular" → próximo flashcard
```
