# Plano de Limpeza e Reorganização — Frota Infratech

> Documento de referência para a faxina do projeto. Gerado a partir de auditoria real do código-fonte e do `node_modules` (não são suposições — cada item abaixo foi confirmado via grep no `src/`).
>
> **Status: Fases 0 a 3 executadas e validadas** (build, lint e testes passando, servidor local testado no navegador). Ver seção 7 para o resultado real.

## 1. Diagnóstico: por que o projeto pesa 1.3GB

| Pasta | Tamanho | Natureza |
|---|---|---|
| `node_modules/` | 1.07 GB | dependências instaladas |
| `.next/` | 164 MB | cache de build (regenerável, não deveria nem existir versionado) |
| `out/` | 2.7 MB | export estático final (o que realmente vai pro Netlify) |
| `public/` | 0.5 MB | imagens dos veículos |
| `src/` | **0.36 MB** | **todo o código-fonte real da aplicação** |

O código em si é enxuto. O peso é 100% dependências mal podadas — sobras de um scaffold inicial (tudo indica um template "kitchen sink" tipo z.ai/v0, que vem com Prisma, NextAuth, Socket.io-style stack, shadcn completo, editor MDX, drag-and-drop, gráficos etc. por padrão) que nunca foram removidas depois que o app foi direcionado para Firebase Firestore + export estático.

## 2. Comparativo ANTES / DEPOIS (estimado)

| Métrica | Antes | Depois (estimado) |
|---|---|---|
| `node_modules` | ~1.07 GB | ~250–350 MB |
| Dependências em `package.json` (dependencies) | 60 | ~25 |
| Componentes `src/components/ui/*` | 61 arquivos | ~11 arquivos |
| Arquivos órfãos de refatoração | 2 (`page-refactored.tsx`, `SidebarTailwind.tsx`) | 0 |
| Lockfiles simultâneos | 2 (`bun.lock` + `package-lock.json`) | 1 |
| Stack de banco/auth declarada mas inexistente | Prisma + NextAuth (sem uso, sem schema) | removida |
| Controle de versão | inexistente | git inicializado |

## 3. Dependências mortas — confirmadas por grep em `src/`

### 3.1 Sem nenhuma ligação com componentes de UI (remoção direta e segura)

| Pacote | Motivo | Peso aprox. |
|---|---|---|
| `@prisma/client`, `prisma` | Não existe `schema.prisma` no projeto. App é 100% Firebase Firestore. `src/lib/db.ts` (cliente Prisma) não é importado em lugar nenhum. Além disso, `next.config.ts` usa `output: "export"` (site 100% estático) — Prisma/servidor **não funcionariam de qualquer forma** nesse modelo de deploy. | ~202 MB |
| `@mdxeditor/editor` (+ `@codesandbox`, `@codemirror` transitivos) | Zero referências no código | ~71 MB |
| `next-auth` | Zero referências. Sem rotas `app/api`, sem uso possível em export estático | ~2 MB |
| `sharp` (+ `@img`) | Zero referências. `next.config.ts` já usa `images: { unoptimized: true }` | ~19 MB |
| `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` | Zero referências | — |
| `react-syntax-highlighter` | Zero referências | — |
| `framer-motion` | Zero referências | — |
| `@tanstack/react-query` | Zero referências (não há `QueryClientProvider` em lugar nenhum) | — |
| `react-markdown` | Zero referências | — |
| `z-ai-web-dev-sdk` | Zero referências — resíduo de scaffold | — |
| `zustand` | Zero referências | — |
| `next-intl` | Zero referências (a app usa `src/lib/translations.json` + hook próprio `useTranslations.ts`) | — |
| `uuid` | Zero referências | — |
| `@reactuses/core` | Zero referências | — |

### 3.2 Presas a componentes `ui/*` que **nunca são importados pelo app**

Destes 61 arquivos em `src/components/ui/`, apenas 11 são de fato usados pela aplicação: `button`, `dialog`, `input`, `label`, `sheet`, `separator`, `skeleton`, `toast`, `toaster`, `toggle`, `tooltip`.

Os outros 50 arquivos (accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, drawer, dropdown-menu, form, hover-card, input-otp, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, sidebar, slider, sonner, switch, table, tabs, textarea, toggle-group) não são importados por nenhuma tela real — são sobras do gerador shadcn (`npx shadcn add --all` ou similar).

Removendo esses arquivos, as seguintes dependências ficam órfãs e caem junto:

| Pacote | Só usado por | 
|---|---|
| `react-hook-form`, `@hookform/resolvers`, `zod` | `form.tsx` (não usado) |
| `sonner`, `next-themes` | `sonner.tsx` (não usado — o toast real da app é o `toaster.tsx`/Radix) |
| `recharts` | `chart.tsx` (não usado) |
| `cmdk` | `command.tsx` (não usado) |
| `vaul` | `drawer.tsx` (não usado) |
| `embla-carousel-react` | `carousel.tsx` (não usado) |
| `input-otp` (pacote) | `input-otp.tsx` (não usado) |
| `react-resizable-panels` | `resizable.tsx` (não usado) |
| `date-fns`, `date-fns-jalali`, `react-day-picker` | `calendar.tsx` (não usado) |
| `@tanstack/react-table` | `table.tsx` (não usado, e nem usa tanstack de fato) |
| ~15 pacotes `@radix-ui/react-*` | primitivas correspondentes não usadas (accordion, alert-dialog, aspect-ratio, avatar, checkbox, collapsible, context-menu, hover-card, menubar, navigation-menu, popover, progress, radio-group, scroll-area, select, slider, switch, tabs, toggle-group) |

### 3.3 Dependências confirmadas em uso — **manter**

`firebase`, `jspdf` + `jspdf-autotable`, `lucide-react` (19 arquivos), `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss-animate`, `next`, `react`/`react-dom`, `@radix-ui/react-dialog`, `@radix-ui/react-label`, `@radix-ui/react-separator`, `@radix-ui/react-slot`, `@radix-ui/react-toast`, `@radix-ui/react-toggle`, `@radix-ui/react-tooltip`.

## 4. Outros problemas estruturais encontrados

1. **Arquivos órfãos de refatoração abandonada**: `src/app/page-refactored.tsx` (225 linhas) e `src/components/layout/SidebarTailwind.tsx` (165 linhas) — nunca importados por nada. Provavelmente tentativa de refatorar o monólito `page.tsx` (1118 linhas) que não foi concluída nem removida.
2. **Dois lockfiles simultâneos**: `bun.lock` e `package-lock.json` — indica troca de gerenciador de pacotes no meio do projeto sem limpeza. Precisamos escolher um só.
3. **`typescript.ignoreBuildErrors: true`** em `next.config.ts` — erros de tipo são ignorados silenciosamente no build. Deveria ser removido e os erros reais corrigidos.
4. **CI/CD decorativo e inconsistente** (`.github/workflows/ci.yml`): builda esperando artefato `.next/standalone`, mas o projeto gera `out/` (export estático puro). Os steps de deploy são placeholders (`echo "Add your deployment script here"`) — não fazem nada de verdade.
5. **PINs de administrador expostos**: `NEXT_PUBLIC_ADMIN_PIN_1/2/3` vão embutidos em texto puro no bundle JS público (o próprio `.env.example` admite isso), e os valores padrão (`1234`, `2024`, `9999`) estão documentados abertamente no `README.md` e `NETLIFY_ENV_VARS.txt`. Qualquer pessoa com acesso ao bundle publicado ou ao repo vê os PINs administrativos.
6. **`page.tsx` monolítico**: 1118 linhas concentrando estado, lógica de negócio e boa parte da UI num único arquivo — dificulta trabalho em equipe (conflitos de merge, revisão de PR, testes).
7. **Sem controle de versão git** no diretório do projeto.

## 5. Plano de ação (fases)

### Fase 0 — Rede de segurança
- [ ] Inicializar repositório git local e commit inicial do estado atual (snapshot antes de qualquer mudança, para permitir reverter).
- [ ] Confirmar que o app sobe localmente (`npm run dev`) **antes** de qualquer alteração, como baseline de comparação.

### Fase 1 — Remover arquivos órfãos de código
- [ ] Apagar `src/app/page-refactored.tsx`
- [ ] Apagar `src/components/layout/SidebarTailwind.tsx`
- [ ] Apagar `src/lib/db.ts` (cliente Prisma não utilizado)
- [ ] Apagar os 50 componentes `ui/*` não utilizados (lista completa na seção 3.2)

### Fase 2 — Podar `package.json`
- [ ] Remover todas as dependências listadas nas seções 3.1 e 3.2 do `dependencies`
- [ ] Remover scripts `db:push`, `db:generate`, `db:migrate`, `db:reset` (Prisma)
- [ ] Escolher um único gerenciador de pacotes (recomendo **npm**, já que é o que o CI usa e o lockfile mais recente) e apagar o lockfile do outro (`bun.lock`)
- [ ] Rodar instalação limpa e medir o novo tamanho de `node_modules`

### Fase 3 — Corrigir configuração e build
- [ ] Remover `typescript.ignoreBuildErrors: true` do `next.config.ts` e corrigir os erros de tipo que aparecerem
- [ ] Corrigir `.github/workflows/ci.yml` para refletir o build real (`out/`, não `.next/standalone`)
- [ ] Rodar `npm run build`, `npm run lint`, `npm run test` e confirmar que tudo passa

### Fase 4 — Segurança dos PINs (aguarda decisão sua)
- [ ] Trocar os PINs padrão documentados publicamente
- [ ] Avaliar mover a validação de PIN para um lugar não embutido no bundle público (ou aceitar o risco conscientemente, já que é uma app 100% client-side)
- [ ] Remover PINs em texto puro do `README.md` / `NETLIFY_ENV_VARS.txt`

### Fase 5 — Organização para trabalho em equipe (opcional, discutir escopo)
- [ ] Quebrar `page.tsx` (1118 linhas) em componentes/hooks menores, seguindo o padrão que já existe em `src/lib/hooks/`
- [ ] Padronizar estrutura de pastas e convenções (documentar em `CONTRIBUTING.md`)

## 6. Critério de sucesso
- `node_modules` reduzido para a faixa de 250–350 MB
- `npm run build` e `npm run test` passam sem erros
- App funciona identicamente no `npm run dev` local (mesmas telas, mesmos fluxos de retirada/devolução/manutenção)
- Nenhuma mudança publicada/deployada sem autorização explícita

## 7. Resultado real da execução (Fases 0–3)

| Métrica | Antes | Depois (real) |
|---|---|---|
| `node_modules` | 1.07 GB | **642 MB** (-40%, 480 pacotes removidos) |
| Dependências em `package.json` | 60 | 18 |
| Arquivos em `src/components/ui/` | 61 | 11 |
| Arquivos em `src/` (total) | ~85 | 38 |
| `npm run build` | passava com `ignoreBuildErrors: true` mascarando erros | passa limpo, sem a flag |
| `npm run lint` | **quebrado** (ESLint 9 exigia flat config, só existia `.eslintrc.json`) | migrado para `eslint.config.mjs`, 0 erros, 9 warnings pré-existentes |
| `npm run test` | **5 de 12 testes falhando** (`setupFilesAfterSetup` era um typo; deveria ser `setupFilesAfterEnv`, então os matchers do `jest-dom` nunca carregavam) | 12/12 passando |
| Git | inexistente | inicializado, com histórico da faxina |

O número final (642 MB) ficou acima da estimativa inicial (250–350 MB) porque Next.js + Firebase sozinhos já somam ~380 MB — peso legítimo do framework/backend em uso, não gordura.

### Achado crítico de segurança (fora do escopo original, descoberto durante a Fase 3)
`DEPLOY.md`, `DEPLOY_RAPIDO.md` e `NETLIFY_ENV_VARS.txt` continham a config real do Firebase e os **PINs de administrador reais em produção** (`3577`, `1521`, `0274`) em texto puro. Os três arquivos foram sanitizados (valores reais removidos). **Pendência do usuário**: trocar os PINs reais no painel do Netlify, já que a troca em produção exige deploy e não foi feita aqui.

### Bugs de código corrigidos (fora do escopo original, descobertos pelo lint depois de consertado)
1. `Date.now()` chamado de forma impura dentro do componente (`page.tsx`) — extraído para `generateVehicleId()` em `helpers.ts`.
2. `ManageModal.tsx` sincronizava props para state via `useEffect` (anti-padrão) — trocado por ajuste de state durante o render (padrão oficial do React para esse caso), validado no navegador trocando entre veículos diferentes.
3. `src/lib/hooks/useFirebase.ts` — outro arquivo órfão (nunca importado, duplicava lógica que já existia inline em `page.tsx`, e tinha um bug real de closure obsoleta no array de dependências). Removido.
4. `jest.config.js` tinha `setupFilesAfterSetup` (chave inválida) em vez de `setupFilesAfterEnv` — corrigido, restaurando os 5 testes que falhavam silenciosamente.

### Pendências em aberto (não executadas nesta rodada)
- Fase 4 (segurança dos PINs): sanitização de texto feita; troca dos PINs reais em produção depende de ação do usuário no painel do Netlify.
- Fase 5 (organização para trabalho em equipe): quebrar `page.tsx` (ainda ~1120 linhas) em componentes/hooks menores — não iniciado, escopo maior que o desta rodada.
- Warnings de lint remanescentes (tipos `any`, variável não usada, uso de `<img>` em vez de `next/image`) — cosméticos, não bloqueiam.
- Um console warning pré-existente de CSS (mistura de `border`/`borderTop` shorthand) nos cards de filtro do dashboard — cosmético, não corrigido nesta rodada.
