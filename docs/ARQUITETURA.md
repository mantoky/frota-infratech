# Arquitetura Alvo — Plataforma Corporativa de Gestão de Frota

> Documento de arquitetura. Descreve o estado atual sem maquiagem, o alvo, e o
> porquê de cada decisão. Companheiros deste documento:
> [`MODELO_DADOS.md`](./MODELO_DADOS.md), [`RBAC_AUDITORIA.md`](./RBAC_AUDITORIA.md),
> [`ROADMAP.md`](./ROADMAP.md).

---

## 1. Onde o sistema está hoje

O app é um PWA Next.js 16 com `output: "export"` (site 100% estático) publicado
no Netlify, falando direto com o Firestore pelo SDK cliente.

```
Navegador (PWA)  ──────────────▶  Firestore  (documento único: frota/data)
       │
       └── localStorage  (fonte primária offline-first)
```

Isso levou o produto longe rápido, e não é pouca coisa: a camada offline-first
com reconciliação por `lastUpdated` é uma decisão acertada para operação em
campo com rede instável. Mas há cinco limites que **impedem** o cenário
corporativo multirregional pedido. Nenhum deles é opinião de estilo:

### 1.1 Documento único do Firestore — teto rígido de 1 MiB

`useFleetData` grava **toda** a frota e **todo** o histórico em um único
documento: `setDoc(doc(db, 'frota', 'data'), { vehicles, history, drivers })`.

O Firestore tem limite físico de **1 MiB por documento**. Pior: `HistoryItem`
carrega `photos: ChecklistPhoto[]`, e cada `ChecklistPhoto.dataUrl` é uma imagem
**em base64 dentro do documento**. Uma única foto de checklist de 300 KB vira
~400 KB de base64. Duas ou três fotos e a escrita começa a falhar — em campo,
silenciosamente, porque o `catch` só faz `console.error`.

Não é um risco distante: é uma contagem regressiva que já começou.

### 1.2 Escrita do documento inteiro — perda de dados entre usuários

Como cada gravação envia o estado completo, dois operadores agindo ao mesmo
tempo produzem *last-write-wins* sobre a frota inteira. O operador A retira o
TN-04, o operador B devolve o TN-09 dez segundos depois com um snapshot antigo
em mãos, e a retirada do A **desaparece**. Hoje isso é mitigado por haver poucos
usuários simultâneos. Multiplicado por várias regionais, vira corrupção rotineira.

### 1.3 Sem autenticação — os dados estão públicos

`firestore.rules` declara `allow read: if true` no documento `frota/data`. O
próprio arquivo é honesto sobre isso no comentário. Qualquer pessoa com o
`projectId` (que está no bundle JavaScript, por construção) lê a frota inteira:
placas, quilometragem, condutores, localizações GPS, observações.

A regra de escrita valida apenas *forma* (`vehicles is list`), não *identidade*.
Qualquer um pode substituir a frota inteira por uma lista vazia.

### 1.4 O PIN não é um controle de segurança

`isValidAdminPin` compara com `process.env.NEXT_PUBLIC_ADMIN_PIN_*`. Toda
variável `NEXT_PUBLIC_` é **substituída literalmente no bundle em build-time**.
Os três PINs estão em texto claro no JavaScript servido ao navegador.

O PIN é uma trava de conveniência de UI — útil para evitar toque acidental,
inútil contra alguém mal-intencionado. Ele não deve ser confundido com
autenticação, e num sistema corporativo auditável não pode ser a única barreira.

### 1.5 A estrutura organizacional não sai do dispositivo

`useOrgData` persiste regionais, gerências, fórum e checklist **somente no
localStorage** (`frota_org_v1`). Nada disso vai para o Firestore.

Consequência direta: multirregião hoje é impossível. Cada aparelho tem a sua
própria árvore organizacional. O gestor de Carajás cria uma gerência e ninguém
mais no mundo a enxerga.

---

## 2. Princípios da arquitetura alvo

1. **O cliente propõe, o servidor decide.** Toda escrita com significado de
   negócio (retirada, devolução, bloqueio, mudança de lotação) passa por uma
   Cloud Function que valida permissão, aplica a regra e grava a auditoria na
   mesma transação. O cliente nunca escreve o registro de auditoria.
2. **Offline-first é requisito, não otimização.** A operação acontece em pátio,
   mina e estrada. A persistência offline nativa do Firestore substitui a
   camada manual de localStorage, mantendo o comportamento e removendo o código
   de reconciliação feito à mão.
3. **Autorização hierárquica, dados particionados.** Um coordenador enxerga o
   seu setor; um gerente enxerga suas coordenações; um gestor regional enxerga
   a regional inteira. A regra é sempre a mesma expressão de subárvore.
4. **Auditoria imutável por padrão.** Todo evento é *append-only*, gravado com
   ator, timestamp de servidor, escopo organizacional e diff. Sem exceção para
   administradores — auditoria que o admin apaga não é auditoria.
5. **Manter o deploy simples.** Nada aqui exige abandonar o `output: "export"`.
   Firebase Auth, Firestore e Callable Functions funcionam perfeitamente a
   partir de um site estático. Um SSR desnecessário só adicionaria superfície
   de operação sem benefício.

---

## 3. Arquitetura alvo

```
┌────────────────────────────────────────────────────────────────────┐
│  PWA Next.js (export estático · Netlify CDN)                       │
│  · Firebase Auth SDK  · Firestore SDK (persistência offline)       │
│  · Claims no ID token definem o que a UI mostra                    │
└───────┬───────────────────────────┬────────────────────────────────┘
        │ leitura direta            │ escrita de negócio
        │ (governada por rules)     │ (httpsCallable)
        ▼                           ▼
┌────────────────────┐   ┌─────────────────────────────────────────┐
│  Cloud Firestore   │   │  Cloud Functions v2 (região southamerica-east1) │
│  · orgUnits        │◀──│  · withdrawVehicle / returnVehicle       │
│  · vehicles        │   │  · blockVehicle / transferVehicle        │
│  · movements       │   │  · setUserScope  (grava custom claims)   │
│  · auditLogs (RO)  │   │  · onWrite → auditLogs (trigger)         │
│  · users           │   │  · scheduled: KPIs, alertas, retenção    │
└────────┬───────────┘   └───────────────┬─────────────────────────┘
         │                               │
         ▼                               ▼
┌────────────────────┐   ┌─────────────────────────────────────────┐
│  Cloud Storage     │   │  BigQuery  (export contínuo do Firestore)│
│  fotos, assinaturas│   │  → Looker Studio / Grafana               │
│  regras por escopo │   │  → retenção longa de auditoria           │
└────────────────────┘   └─────────────────────────────────────────┘
                                         │
                         ┌───────────────┴──────────────┐
                         │  Identity Platform (SSO)      │
                         │  Microsoft Entra ID / SAML    │
                         └───────────────────────────────┘
```

### 3.1 Autenticação

**Firebase Authentication**, elevado para **Identity Platform** quando o SSO
corporativo entrar.

| Fase | Método | Observação |
|---|---|---|
| Curto prazo | E-mail + senha, contas provisionadas por admin | Remove o PIN como controle de acesso |
| Alvo | SSO Microsoft Entra ID (OIDC) ou SAML | Provisionamento e desligamento seguem o RH |
| Campo | Link mágico por e-mail ou telefone | Motorista sem conta de domínio |

MFA obrigatório para papéis administrativos (nativo no Identity Platform).

> **Sobre o PIN:** ele não desaparece, muda de função. Deixa de ser
> autenticação e passa a ser *step-up* — reconfirmação para ações destrutivas
> (excluir veículo, desbloquear) dentro de uma sessão **já autenticada**.
> É o mesmo papel do "confirme sua senha" antes de apagar um repositório.

### 3.2 Autorização

Detalhada em [`RBAC_AUDITORIA.md`](./RBAC_AUDITORIA.md). Em resumo: papel +
escopo organizacional viajam como **custom claims** no ID token; as Security
Rules avaliam a claim sem custo de leitura adicional; as Cloud Functions
revalidam antes de qualquer escrita.

### 3.3 Persistência

Firestore em modo nativo, região **`southamerica-east1` (São Paulo)** —
latência e residência de dados no Brasil, relevante para LGPD.

Coleções de topo em vez do documento único. Modelagem em
[`MODELO_DADOS.md`](./MODELO_DADOS.md).

### 3.4 Arquivos binários

Fotos de checklist e assinaturas saem do Firestore e vão para o **Cloud
Storage**, com o documento guardando apenas o caminho. Compressão client-side
para ~1600px/JPEG 0,75 antes do upload — em rede de campo, subir 4 MB de foto
crua é o que trava o fluxo de retirada.

### 3.5 Analytics e observabilidade

- **Firestore → BigQuery** pela extensão oficial de streaming.
- **Looker Studio** para relatórios executivos; **Grafana** via plugin BigQuery,
  substituindo o `.prom` gerado manualmente hoje em `MetricsPage`.
- **Cloud Logging + Error Reporting** para as Functions.
- **Alertas** por Cloud Monitoring: taxa de erro de escrita, latência p95,
  falhas de autenticação.

### 3.6 Ambientes

| Ambiente | Projeto Firebase | Deploy | Dados |
|---|---|---|---|
| dev | `frota-infratech-dev` | branch de trabalho | sintéticos |
| staging | `frota-infratech-stg` | `develop` | cópia anonimizada |
| produção | `frota-infratech-prd` | tag em `main`, com aprovação | reais |

`.firebaserc` já prevê aliases. Regras, índices e Functions versionados no repo
e publicados exclusivamente pelo CI (`firebase deploy`), nunca pelo console —
mudança de regra feita no console não deixa rastro em code review.

---

## 4. Decisões e trade-offs assumidos

| Decisão | Alternativa descartada | Por quê |
|---|---|---|
| Firebase completo | Postgres + API NestJS | O offline-first já é o coração do produto e o Firestore entrega isso nativamente. Reconstruir sincronização offline sobre Postgres é meses de trabalho para reproduzir o que já se tem. |
| Manter `output: export` | Migrar para SSR/Next runtime | Nenhum requisito atual pede renderização no servidor. O SSR traria custo de runtime e um vetor de ataque a mais sem benefício. |
| Escritas via Callable Functions | Escrita direta com rules robustas | Rules validam forma e permissão, mas não conseguem gravar auditoria atomicamente junto da mudança. Auditoria confiável exige servidor. |
| Claims para escopo | Consulta de permissão a cada leitura | `get()` dentro de rules custa uma leitura por avaliação e multiplica a fatura. Claims são resolvidas no token, custo zero. Preço: propagação em até 1h (mitigado no §5). |
| Árvore organizacional com `path[]` | `parentId` recursivo | Firestore não faz consulta recursiva. O array de ancestrais permite "tudo abaixo deste setor" em uma única query `array-contains`. |

---

## 5. Riscos conhecidos e mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| Claims propagam em até 1h | Usuário remanejado mantém acesso antigo | A Function de mudança de escopo revoga refresh tokens (`revokeRefreshTokens`) e o cliente força `getIdToken(true)`. Efeito em segundos. |
| Limite de 1000 bytes por claim | Usuário com muitos setores não cabe no token | Claim guarda o **nó raiz** do escopo, não a lista de descendentes. Casos excepcionais caem em `memberships` consultado por rule. |
| Custo do Firestore | Fatura cresce com leitura de listas | Paginação, `select()` de campos, cache offline, e agregações pré-calculadas por Function agendada em vez de somar no cliente. |
| Cold start das Functions | Retirada demora em horário de pico | `minInstances: 1` nas Functions do caminho crítico. |
| Migração do documento único | Perda de histórico | Migração é *dual-write* com verificação: descrita na Fase 2 do [`ROADMAP.md`](./ROADMAP.md). |
| Dependência de fornecedor único | Saída do Firebase fica cara | Export diário para GCS + BigQuery mantém uma cópia própria e íntegra dos dados, independente da plataforma. |

---

## 6. Segurança — postura mínima antes de produção

- [ ] `allow read: if true` **removido** das rules
- [ ] Firebase Auth obrigatório em toda leitura e escrita
- [ ] PINs removidos de `NEXT_PUBLIC_*` (viram *step-up* server-side)
- [ ] App Check habilitado (reCAPTCHA Enterprise na web) contra abuso de API
- [ ] Regras de Storage por escopo organizacional
- [ ] MFA obrigatório para papéis administrativos
- [ ] Auditoria com escrita negada ao cliente (`allow write: if false`)
- [ ] Emulator Suite no CI com testes das rules (`@firebase/rules-unit-testing`)
- [ ] Retenção e anonimização de GPS e fotos definidas (LGPD — ver `RBAC_AUDITORIA.md` §6)
