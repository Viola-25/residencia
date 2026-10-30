# Residência 2027

App de estudo para residência médica (Brasil). Rastreia daily logs de estudo, simulados, banco de erros, metas e gera insights com IA.

## Stack

- React 19 + Vite 8 + TypeScript + Tailwind CSS 4
- Supabase (PostgreSQL + auth)
- react-router-dom, react-hook-form + zod, recharts, date-fns
- groq-sdk para insights IA
- Deploy: Vercel (push na `main` = produção)

## Como rodar

```bash
npm install
npm run dev
```

Variáveis de ambiente (`.env`, veja `.env.example`):
- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
- `VITE_GROQ_API_KEY`

## Comandos

| Comando | Descrição |
| --- | --- |
| `npm run dev` | dev server |
| `npm run build` | typecheck (`tsc -b`) + build Vite |
| `npm run lint` | eslint |
| `npx tsc -b` | typecheck |
| `npm run db:migrate` | aplicar migrações Supabase |
| `npm run db:link` | linkar projeto Supabase |

## Estrutura

- `src/types/` — tipos de domínio + constantes, tipos Row/Insert do Supabase
- `src/lib/` — cálculos, datas, prompts e chamadas IA (groq), cliente Supabase
- `src/hooks/` — composição de hooks por domínio (`useData`, `hooks/domains/`)
- `src/pages/` — páginas das rotas
- `src/components/` — componentes compartilhados, charts, forms, modals
- `public/extensao/` — zip da extensão do Chrome (download em `/configuracoes`)
- `supabase/migrations/` — migrações SQL versionadas

## Rotas

`/` dashboard, `/diario`, `/desempenho`, `/erros`, `/radar`, `/estrategico`, `/ia`, `/configuracoes`, `/login`

## Banco de dados

Migrações em `supabase/migrations/NNN_nome.sql`, aplicadas via `supabase db push`. Mudança de coluna exige atualizar `src/types/database.ts` e `src/types/index.ts` em paralelo.

## Extensão do Chrome

Os testes do MedCof QBank chegam por uma extensão que lê a sessão já aberta no navegador (sem senha) e grava em `daily_logs` + `error_bank`.

- Download: `/configuracoes` → "Extensão do Chrome" (arquivo em `public/extensao/`)
- Instalação: `chrome://extensions` → Modo do desenvolvedor → Carregar sem compactação
- Fonte: repo `revisor` (`extension/`), publicado aqui por `npm run ext:publish`
