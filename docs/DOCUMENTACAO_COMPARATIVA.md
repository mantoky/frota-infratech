# Documentação Comparativa — Redução de Peso do Projeto Frota Infratech

> Este documento existe para justificar, com evidência técnica e não por "achismo", cada corte feito na faxina do projeto. Serve como registro para a equipe e para qualquer revisão futura: o que foi removido, por que era seguro remover, e como isso foi comprovado.

## 1. Contexto

O projeto rodava com **1.3 GB** em disco, sendo:

| Pasta | Tamanho | Natureza |
|---|---|---|
| `node_modules/` | 1.07 GB | dependências instaladas |
| `.next/` | 164 MB | cache de build (regenerável) |
| `out/` | 2.7 MB | export estático final (o que vai pro Netlify) |
| `public/` | 0.5 MB | imagens dos veículos |
| `src/` | 0.36 MB | todo o código-fonte da aplicação |

O código-fonte real (`src/`) sempre foi enxuto — 360 KB. O peso todo estava concentrado em dependências declaradas no `package.json` que nunca chegaram a ser usadas pela aplicação. Isso é consistente com o histórico do projeto: tudo indica que ele nasceu de um scaffold "kitchen sink" (Prisma + NextAuth + shadcn completo + editor MDX + drag-and-drop + gráficos, etc.) e foi redirecionado para uma stack bem mais simples — Firebase Firestore no cliente, export estático via Netlify — sem que o scaffold original fosse podado.

## 2. Metodologia: como cada corte foi validado

Nenhuma dependência ou arquivo foi removido por suposição. Para cada item, o critério foi:

1. **Busca textual (`grep`) em todo o `src/`** por qualquer import do pacote/arquivo — zero ocorrências = candidato a remoção.
2. **Verificação de cascata**: quando um componente `ui/*` não usado foi removido, suas dependências exclusivas (ex.: `recharts` só usado por `chart.tsx`) também viraram candidatas, mas só foram removidas depois de confirmar que nenhum outro arquivo as referenciava.
3. **Verificação de compatibilidade estrutural**: `next.config.ts` usa `output: "export"` (site 100% estático, sem servidor). Isso foi usado como segunda camada de evidência para Prisma/NextAuth — mesmo se houvesse uso residual, eles **não poderiam funcionar** nesse modelo de deploy.
4. **Validação pós-remoção**: depois de cada fase, rodamos `npm run build`, `npm run lint`, `npm run test` e o servidor local (`npm run dev`), incluindo teste manual no navegador abrindo modais e trocando entre veículos.
5. **Rede de segurança**: repositório git foi inicializado com um commit de snapshot do estado original *antes* de qualquer alteração, permitindo reverter qualquer decisão a qualquer momento.

## 3. Comparativo geral

| Métrica | Antes | Depois | Variação |
|---|---|---|---|
| `node_modules` | 1.07 GB | 642 MB | **-40% (-430 MB)** |
| Pacotes instalados (árvore completa) | ~1.250 | ~770 | -480 pacotes |
| Dependências diretas (`dependencies`) | 69 | 18 | -51 |
| Dependências de dev (`devDependencies`) | 18 | 16 | -2 |
| Arquivos em `src/components/ui/` | 61 | 11 | -50 |
| Arquivos totais em `src/` | ~85 | 38 | -47 |
| Lockfiles simultâneos | 2 (`bun.lock` + `package-lock.json`) | 1 (`package-lock.json`) | unificado |
| `npm run lint` | quebrado (ESLint 9 sem config compatível) | funcional, 0 erros | corrigido |
| `npm run test` | 5 de 12 falhando (typo de config) | 12/12 passando | corrigido |
| Controle de versão | inexistente | git com histórico da faxina | criado |

## 4. Justificativa por categoria

### 4.1 Prisma + NextAuth — stack de banco/autenticação inteira (~204 MB)

**Evidência de não-uso:**
- Não existe nenhum arquivo `schema.prisma` no projeto — Prisma não tem o que gerenciar.
- `src/lib/db.ts` (o cliente Prisma) nunca era importado por nenhum outro arquivo.
- Zero ocorrências de `next-auth` em qualquer lugar do código.

**Evidência estrutural (por que nunca poderia funcionar mesmo se alguém tentasse usar):**
- `next.config.ts` declara `output: "export"` — build 100% estático, sem servidor Node em produção. Prisma (que precisa de uma conexão de banco em tempo de execução) e NextAuth (que precisa de rotas de API server-side) são **incompatíveis por design** com esse modo de deploy.
- Não existe nenhuma pasta `src/app/api/` no projeto — nenhuma rota de servidor foi implementada.

**Conclusão:** remoção seguraníssima. Era peso morto que nunca poderia ter sido ativado em produção.

### 4.2 Editor MDX, drag-and-drop e outras libs de UI avançada nunca usadas (~90 MB)

| Pacote | Peso aprox. | Evidência |
|---|---|---|
| `@mdxeditor/editor` (+ `@codesandbox`, `@codemirror` transitivos) | ~71 MB | zero imports |
| `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` | — | zero imports |
| `framer-motion` | — | zero imports |
| `react-syntax-highlighter` | — | zero imports |
| `react-markdown` | — | zero imports |
| `sharp` (+ `@img`) | ~19 MB | zero imports; `next.config.ts` já usa `images: { unoptimized: true }`, ou seja, otimização de imagem nem está ativa |

Nenhuma tela do sistema (dashboard de veículos, modais de retirada/devolução/manutenção, histórico) usa editor de texto rico, drag-and-drop, animação complexa ou realce de sintaxe. Essas são bibliotecas de interface para casos de uso que este projeto não tem.

### 4.3 Camadas de dados/estado paralelas nunca conectadas

| Pacote | Evidência |
|---|---|
| `@tanstack/react-query` | zero `QueryClientProvider` em qualquer lugar da árvore de componentes |
| `zustand` | zero stores criadas ou importadas |
| `next-intl` | o projeto já tem seu próprio sistema de tradução (`src/lib/translations.json` + hook `useTranslations.ts`), usado em todas as telas |
| `z-ai-web-dev-sdk` | zero imports — resíduo de scaffold, sem relação com a aplicação |
| `uuid` | zero imports — os IDs são gerados com `Date.now()` |

Esses pacotes representam **abordagens concorrentes** às que o projeto de fato usa (Firebase Firestore + `onSnapshot` para estado remoto, `useState` local para UI, dicionário JSON próprio para tradução). Mantê-los instalados sem uso não é neutro: é uma armadilha para qualquer novo desenvolvedor que abrir o projeto e não souber qual das duas abordagens é a "de verdade".

### 4.4 Componentes shadcn/ui não usados (50 de 61 arquivos)

O gerador do shadcn/ui foi rodado para instalar a biblioteca completa (`accordion`, `avatar`, `calendar`, `carousel`, `chart`, `command`, `drawer`, `select`, `table`, `tabs`, etc.), mas a aplicação usa efetivamente só 11: `button`, `dialog`, `input`, `label`, `sheet`, `separator`, `skeleton`, `toast`, `toaster`, `toggle`, `tooltip` — confirmado por busca de import em `src/app`, `src/components/dashboard`, `src/components/layout`, `src/components/modals` e `src/components/vehicles`.

Cada componente não usado carregava sua própria dependência Radix ou de terceiros (ex.: `calendar.tsx` → `react-day-picker` + `date-fns`; `command.tsx` → `cmdk`; `carousel.tsx` → `embla-carousel-react`; `drawer.tsx` → `vaul`; `chart.tsx` → `recharts`; `form.tsx` → `react-hook-form` + `@hookform/resolvers` + `zod`; `sonner.tsx` → `sonner` + `next-themes`; `table.tsx` → nem chegava a usar `@tanstack/react-table`, apesar do pacote estar instalado). Remover o arquivo morto tornou órfã a dependência correspondente, que só então foi removida — nessa ordem, para não quebrar nada por engano.

### 4.5 Arquivos de código órfãos (refatorações abandonadas)

| Arquivo | Linhas | Situação |
|---|---|---|
| `src/app/page-refactored.tsx` | 225 | Nunca importado por nada — tentativa de quebrar o `page.tsx` monolítico que não foi concluída nem removida |
| `src/components/layout/SidebarTailwind.tsx` | 165 | Nunca importado — variante alternativa da sidebar que não vingou |
| `src/lib/hooks/useFirebase.ts` | 96 | Nunca importado — duplicava a lógica de estado/Firestore que já existe (correta) inline em `page.tsx`, e ainda carregava um bug real de closure obsoleta no array de dependências do `useCallback` |

Esses arquivos não pesavam em disco, mas pesavam em confusão: qualquer pessoa nova na equipe que abrisse `src/app/` ou `src/lib/hooks/` encontraria três implementações concorrentes da mesma coisa sem sinal de qual é a válida.

### 4.6 Dívida de configuração corrigida (não é redução de peso, mas era dívida técnica real)

| Problema | Evidência | Correção |
|---|---|---|
| `npm run lint` quebrado | ESLint 9 exige `eslint.config.js` (flat config); só existia o `.eslintrc.json` legado — ou seja, **lint nunca rodou de verdade nesse projeto** | Migrado para `eslint.config.mjs` nativo do Next 16 |
| `npm run test` com 5 de 12 testes falhando | `jest.config.js` tinha a chave `setupFilesAfterSetup`, que não existe no Jest — o correto é `setupFilesAfterEnv`. Por causa do typo, `@testing-library/jest-dom` nunca carregava, e todo `toBeInTheDocument()` quebrava | Corrigida a chave; 12/12 passando |
| `typescript.ignoreBuildErrors: true` | Mascarava silenciosamente qualquer erro de tipo no build de produção | Removida; build passa limpo sem erros reais por trás da flag |
| CI apontava para artefato errado | `.github/workflows/ci.yml` fazia upload de `.next/standalone`, que não existe (o projeto gera `out/`, export estático) | Corrigido para `out/` |
| Script `start` inexecutável | Chamava `bun .next/standalone/server.js`, artefato que não existe em modo `output: "export"` | Trocado por `serve out` (servidor estático simples) |
| Credenciais reais em texto puro | `DEPLOY.md`, `DEPLOY_RAPIDO.md` e `NETLIFY_ENV_VARS.txt` continham a config real do Firebase e os PINs de admin de produção (`3577`, `1521`, `0274`) | Sanitizados; troca dos PINs reais em produção fica pendente com o time (requer deploy) |

Esses itens não reduzem MB, mas são exatamente o tipo de "peso invisível" que trava trabalho em equipe: CI que finge validar e não valida, lint que finge rodar e não roda, testes vermelhos que ninguém nota porque a suíte "passa" tecnicamente.

## 5. Prova de que nada quebrou

- `npm run build` → compila limpo, 0 erros de tipo, gera export estático normalmente.
- `npm run lint` → 0 erros (9 warnings cosméticos pré-existentes, sem relação com a faxina).
- `npm run test` → 12/12 testes passando.
- Teste manual no navegador (`npm run dev`, `localhost:3003`): dashboard carrega os 11 veículos reais do Firebase, filtros por status funcionam, modal de edição (`ManageModal`) testado abrindo dois veículos diferentes em sequência para confirmar que os dados trocam corretamente (esse era exatamente o comportamento que dependia do código corrigido).

## 6. Riscos considerados

- **Reversibilidade**: todo o histórico está em git, incluindo um commit de snapshot do estado original antes de qualquer mudança. Qualquer decisão pode ser revertida isoladamente.
- **Nada foi publicado**: todas as mudanças são locais. O site em produção no Netlify não foi tocado.
- **Falsos positivos de "não usado"**: mitigado rodando build + testes + navegador depois de cada fase, não só confiando na busca textual.

## 7. O que não foi tocado (fora do escopo desta rodada)

- **`page.tsx` monolítico** (~1.120 linhas): concentra estado, lógica de negócio e boa parte da UI num único arquivo. É o próximo passo natural para viabilizar trabalho em equipe real (menos conflito de merge, PRs menores, testes mais fáceis), mas é um refactor estrutural maior que merece planejamento e conversa à parte — não uma decisão de limpeza.
- **Troca dos PINs de admin reais em produção**: a sanitização dos arquivos foi feita; a troca efetiva no painel do Netlify depende de deploy e de decisão do time.
- **Warnings cosméticos remanescentes**: tipos `any` em 2 pontos, uma variável não usada, uso de `<img>` em vez de `next/image`, e um console warning de CSS (mistura de `border`/`borderTop`) nos cards de filtro — nenhum bloqueia build ou funcionalidade.

## 8. Conclusão

A redução de 1.07 GB para 642 MB em `node_modules` (-40%) não envolveu nenhuma troca de funcionalidade por tamanho: cada pacote e arquivo removido tinha **zero pontos de uso comprováveis** no código-fonte, e nos casos de Prisma/NextAuth havia ainda uma segunda barreira estrutural (`output: "export"`) que tornava o uso impossível em produção. As correções de configuração (lint, testes, CI, script de start) não são cosméticas: destravam processos que a equipe precisa para trabalhar com confiança — hoje é possível rodar `npm run lint` e `npm run test` e confiar no resultado, o que não era verdade antes da faxina.
