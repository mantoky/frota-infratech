# Roadmap de Evolução — Plataforma Corporativa

> Sequência de execução para levar o app do estado atual à plataforma descrita em
> [`ARQUITETURA.md`](./ARQUITETURA.md). A ordem não é negociável em um ponto: **segurança antes de
> funcionalidade**. Construir multirregião sobre uma base com `allow read: if true` é multiplicar a
> exposição.

Estimativas em semanas de trabalho, assumindo 1 desenvolvedor em dedicação parcial. São ordens de
grandeza para planejamento, não compromisso contratual.

---

## Fase 0 — Contenção (1 semana) · **crítico**

Nada aqui é evolução; é parar o sangramento. Deve começar imediatamente.

| #   | Entrega                                                                 | Por quê                                                   |
| --- | ----------------------------------------------------------------------- | --------------------------------------------------------- |
| 0.1 | Firebase Auth com e-mail/senha; contas provisionadas por admin          | Hoje qualquer pessoa com o `projectId` lê a frota inteira |
| 0.2 | `allow read: if true` **removido**; rules exigem `request.auth != null` | Fecha a exposição pública                                 |
| 0.3 | PINs fora de `NEXT_PUBLIC_*`; validação de _step-up_ server-side        | Os três PINs estão em texto claro no bundle               |
| 0.4 | App Check (reCAPTCHA Enterprise)                                        | Impede uso da API fora do app                             |
| 0.5 | Rotação de credenciais do Firebase                                      | Chaves atuais devem ser consideradas comprometidas        |

**Critério de saída:** nenhuma leitura ou escrita anônima possível, verificado por teste
automatizado contra o Emulator Suite.

---

## Fase 1 — Fundação organizacional (2–3 semanas)

| #   | Entrega                                                                                |
| --- | -------------------------------------------------------------------------------------- |
| 1.1 | Coleção `orgUnits` com `path[]` e `depth`, escrita exclusiva por Function              |
| 1.2 | Migração de `regionais` e `gerencias` do localStorage para o Firestore                 |
| 1.3 | Níveis `subgerencia` e `coordenacao` habilitados                                       |
| 1.4 | Coleção `users` + Function `setUserScope` gravando custom claims                       |
| 1.5 | Níveis `usuario`/`operador`/`admin`/`admin_master`/`auditor`; UI reage à claim `level` |
| 1.6 | Security Rules com `inScope()`; suíte de testes das rules no CI                        |
| 1.7 | Tela de gestão de estrutura organizacional (árvore navegável)                          |
| 1.8 | Seletor de escopo na TopBar (o espaço já está reservado no layout)                     |
| 1.9 | Líderes por unidade: gerência regional, coordenação local e área da frota              |

**Critério de saída:** um usuário de Carajás não consegue — nem pela UI, nem por chamada direta ao
SDK — ler um veículo de Vitória.

---

## Fase 2 — Migração do modelo de dados (2–3 semanas)

Executa os cinco passos de [`MODELO_DADOS.md`](./MODELO_DADOS.md) §5.

| #   | Entrega                                                            |
| --- | ------------------------------------------------------------------ |
| 2.1 | Function de espelho: `frota/data` → `vehicles/*` + `movements/*`   |
| 2.2 | Backfill do histórico; fotos base64 extraídas para o Cloud Storage |
| 2.3 | Compressão de imagem no cliente antes do upload                    |
| 2.4 | Frontend lendo das coleções novas atrás de _feature flag_          |
| 2.5 | Índices compostos publicados                                       |
| 2.6 | `frota/data` congelado como somente-leitura                        |

**Critério de saída:** contagem de veículos e movimentações idêntica entre o documento antigo e as
coleções novas, conferida em `staging` antes de produção.

> **Risco principal desta fase.** O backfill é a operação mais delicada do roadmap. Regras: rodar
> sempre em `staging` primeiro; export completo para GCS antes de tocar em produção; conferência
> documento a documento, não por amostragem. Dual-write mantido até a Fase 4 — enquanto ele existir,
> o rollback é desligar uma flag.

---

## Fase 3 — Regras de negócio no servidor (2 semanas)

| #   | Entrega                                                                                            |
| --- | -------------------------------------------------------------------------------------------------- |
| 3.1 | Callables: `withdrawVehicle`, `returnVehicle`, `serviceVehicle`, `blockVehicle`, `transferVehicle` |
| 3.2 | Validações que hoje não existem: KM não regride, veículo bloqueado não sai, CNH válida             |
| 3.3 | `auditLogs` gravado na mesma transação da mudança                                                  |
| 3.4 | Persistência offline nativa do Firestore substitui a camada manual de localStorage                 |
| 3.5 | Fila de operações pendentes com indicador de sincronização na UI                                   |
| 3.6 | `minInstances: 1` nas Functions do caminho crítico                                                 |

**Critério de saída:** toda mudança de status tem um registro de auditoria correspondente. Zero
exceções na conferência.

---

## Fase 4 — Auditoria e conformidade (2 semanas)

| #   | Entrega                                                         |
| --- | --------------------------------------------------------------- |
| 4.1 | Papel `auditor` com leitura irrestrita no escopo e escrita nula |
| 4.2 | Tela de auditoria com filtro por setor, ator, ação e período    |
| 4.3 | Export de trilha em CSV e PDF assinado                          |
| 4.4 | Export Firestore → BigQuery; snapshots diários com IAM restrito |
| 4.5 | Retenção e anonimização de GPS/fotos após 12 meses              |
| 4.6 | MFA obrigatório para papéis administrativos                     |
| 4.7 | Encerramento do dual-write; `frota/data` exportado e removido   |

**Critério de saída:** um auditor externo consegue reconstruir, sem ajuda, quem fez o quê, quando e
em qual setor — nos últimos 12 meses.

---

## Fase 5 — Identidade e acesso (3 semanas) · _requisitos v2_

Detalhamento em [`REQUISITOS_V2.md`](./REQUISITOS_V2.md) §1 e §5.

| #   | Entrega                                                                       |
| --- | ----------------------------------------------------------------------------- |
| 5.1 | Autocadastro pelo celular com os 11 campos declarados                         |
| 5.2 | Conta nasce `pendente`, sem acesso a dado nenhum                              |
| 5.3 | Fila de aprovação por área, com registro de quem validou RAC02/Prontos/crachá |
| 5.4 | Rejeição com motivo obrigatório, também auditada                              |
| 5.5 | TOTP em Cloud Function: cadastro, verificação, códigos de recuperação         |
| 5.6 | _Throttling_ e bloqueio progressivo por tentativa inválida                    |
| 5.7 | Segredo TOTP cifrado com Cloud KMS                                            |
| 5.8 | Expiração de senha em 45 dias, com Function agendada                          |
| 5.9 | Alerta automático de vencimento de RAC02 declarado                            |

**Critério de saída:** uma conta recém-cadastrada e não aprovada não lê um único documento — provado
por teste de rules, não por inspeção de tela.

---

## Fase 6 — Comunicação (2 semanas) · _requisitos v2_

Detalhamento em [`REQUISITOS_V2.md`](./REQUISITOS_V2.md) §2.

| #   | Entrega                                                                   |
| --- | ------------------------------------------------------------------------- |
| 6.1 | Fórum restrito à área, com `orgPath` governando a visibilidade            |
| 6.2 | Autoria vinda do token; remoção do campo de autor digitável               |
| 6.3 | Editar e apagar a própria mensagem; administrador apaga de qualquer um    |
| 6.4 | Edição e remoção lógicas, preservando a trilha                            |
| 6.5 | Mensagem privada com o grafo por nível, validado na Function `openThread` |
| 6.6 | Sincronização em tempo real via `onSnapshot`                              |
| 6.7 | Ícone com contador de não lidas na TopBar                                 |
| 6.8 | Pop-up de novas mensagens, ativado por padrão e desativável               |

**Critério de saída:** um condutor não consegue abrir conversa com outro condutor nem com
administrador, por nenhum caminho — incluindo chamada direta à Function.

---

## Fase 7 — Checklist e administração (3 semanas) · _requisitos v2_

Detalhamento em [`REQUISITOS_V2.md`](./REQUISITOS_V2.md) §3 e §4.

| #   | Entrega                                                                        |
| --- | ------------------------------------------------------------------------------ |
| 7.1 | Checklist carrega os dados do usuário autenticado, sem digitação               |
| 7.2 | Confirmação obrigatória de Prontos executado e CRM realizado                   |
| 7.3 | Justificativa de aptidão assinada pelo **gestor**, nunca pelo próprio condutor |
| 7.4 | `required` nasce `true`; só administrador desmarca, com auditoria              |
| 7.5 | Painel administrativo responsivo para desktop, com tabelas densas              |
| 7.6 | Gestão de usuários: criar, editar, bloquear, desativar, forçar troca de senha  |
| 7.7 | Mensagem individual do administrador para usuário                              |
| 7.8 | _Force update key_ via `config/security.sessionEpoch`                          |
| 7.9 | Aceite de atualização no login; release de segurança aplica sem perguntar      |

**Critério de saída:** o administrador de uma regional administra tudo da sua área e nada da área
vizinha, e toda ação administrativa aparece em `auditLogs`.

---

## Fase 8 — Inteligência operacional (3 semanas)

| #   | Entrega                                                                    |
| --- | -------------------------------------------------------------------------- |
| 8.1 | Agregações pré-calculadas por setor (Function agendada)                    |
| 8.2 | Dashboards Looker Studio por nível hierárquico                             |
| 8.3 | Grafana via plugin BigQuery, aposentando o `.prom` manual                  |
| 8.4 | Alertas proativos: manutenção próxima, veículo parado, checklist reprovado |
| 8.5 | Comparativo entre setores (disponibilidade, km/veículo, tempo parado)      |
| 8.6 | Relatório mensal automático por e-mail para responsáveis de setor          |

---

## Fase 9 — Integração corporativa (3–4 semanas)

| #   | Entrega                                                             |
| --- | ------------------------------------------------------------------- |
| 9.1 | SSO Microsoft Entra ID via Identity Platform                        |
| 9.2 | Provisionamento e desligamento automáticos a partir do RH           |
| 9.3 | Integração de centro de custo com o ERP                             |
| 9.4 | Webhooks para sistemas de manutenção terceirizados                  |
| 9.5 | API pública versionada e documentada (OpenAPI) para consumo interno |

---

## Resumo de dependências

```
Fase 0 ─── Contenção de segurança
   │
Fase 1 ─── Estrutura organizacional + níveis de acesso
   │
Fase 2 ─── Migração do modelo de dados
   │
Fase 3 ─── Regras de negócio no servidor
   │
   ├────── Fase 4 ─── Auditoria e conformidade
   │          │
   │       Fase 5 ─── Identidade e acesso        (autocadastro, TOTP, senha)
   │          │
   │          ├─── Fase 6 ─── Comunicação        (fórum e mensagem privada)
   │          │
   │          └─── Fase 7 ─── Checklist e administração
   │
   ├────── Fase 8 ─── Inteligência operacional   (paralelizável com a 4)
   │
   └────── Fase 9 ─── Integração corporativa     (exige VPS - ver HOSPEDAGEM.md)
```

Total até a Fase 4 (plataforma corporativa auditável e operante): **~10 a 12 semanas**. Total até a
Fase 7 (requisitos v2 completos): **~18 a 20 semanas**.

As fases 8 e 9 agregam valor, mas o sistema já é defensável em auditoria ao fim da Fase 4 e atende
ao escopo pedido na v2 ao fim da Fase 7.

**A Fase 9 é a única que exige VPS.** Todas as anteriores rodam no arranjo atual (Netlify +
Firebase) — a análise está em [`HOSPEDAGEM.md`](./HOSPEDAGEM.md).

---

## Ordem de grandeza de custo mensal (produção)

Cenário: 5 regionais, ~200 veículos, ~150 usuários ativos, ~3.000 movimentações/mês.

| Serviço                                             | Estimativa         |
| --------------------------------------------------- | ------------------ |
| Firestore (leituras, escritas, armazenamento)       | US$ 25–60          |
| Cloud Functions (2ª geração, com `minInstances: 1`) | US$ 15–40          |
| Cloud Storage (fotos comprimidas)                   | US$ 5–15           |
| Identity Platform (acima da cota gratuita)          | US$ 0–30           |
| BigQuery (armazenamento + consultas)                | US$ 10–25          |
| Netlify (hospedagem estática)                       | US$ 0–19           |
| **Total**                                           | **US$ 55–190/mês** |

`minInstances: 1` é o item mais sensível: cada instância sempre quente custa por hora mesmo ociosa.
Vale para as Functions de retirada e devolução, onde o cold start é sentido em campo; não vale para
as agendadas.

Estimativa para planejamento. Validar com a calculadora oficial do Google Cloud antes de comprometer
orçamento.

---

## Débitos técnicos registrados

Itens conhecidos, fora do caminho crítico, mas que devem ser endereçados:

| Item                                             | Onde                        | Observação                                                                                                                                                                                            |
| ------------------------------------------------ | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Vehicle.id` numérico gerado por timestamp       | `helpers.ts`                | Colide com criações simultâneas. Migrar para UUID na Fase 2.                                                                                                                                          |
| Datas como string `pt-BR`                        | `useFleetData.addToHistory` | Não ordena, depende do relógio do dispositivo. `Timestamp` na Fase 2.                                                                                                                                 |
| `useOrgData.persist` com `setState` aninhado     | `useOrgData.ts`             | Padrão frágil. Resolve-se sozinho quando os dados forem para o Firestore.                                                                                                                             |
| `tailwind.config.ts` com `content` desatualizado | raiz                        | Aponta para `./pages`, `./components`, `./app`; o código vive em `./src/**`. Sem efeito prático hoje (Tailwind v4 detecta automaticamente), mas confunde quem lê.                                     |
| `useModals.ts` é código morto                    | `src/lib/hooks`             | Nenhum arquivo importa o hook — `page.tsx` controla os modais com estado próprio. São 125 linhas que duplicam a lógica de abertura: risco de alguém corrigir um bug num lado e não no outro. Remover. |
| Validação de formulário só no HTML nativo        | modais                      | `required` e `type="number"` não rodam em submit programático. O `parseIntSafe` fecha o buraco de KM; os demais campos ainda dependem só do navegador.                                                |
| Fotos de checklist em base64 no documento        | `types/index.ts`            | Já coberto na Fase 2, mas repetido aqui porque é o item que mais aproxima o teto de 1 MiB.                                                                                                            |
