# Modelo de Dados — Firestore

> Complemento de [`ARQUITETURA.md`](./ARQUITETURA.md). Define coleções, a árvore
> organizacional multinível, índices e o caminho de migração a partir do
> documento único `frota/data`.

---

## 1. A decisão central: árvore organizacional genérica

O requisito é multirregião, e **dentro de cada região** subgerências e
coordenações, cada uma auditável e gerenciável isoladamente.

A tentação é criar uma coleção por nível: `regionais`, `gerencias`,
`subgerencias`, `coordenacoes`. É o caminho errado, por três motivos:

1. Congela a profundidade. No dia em que uma regional precisar de um nível
   intermediário — e vai precisar, porque organograma corporativo muda —, é
   migração de esquema.
2. Toda consulta de agregação vira `join` manual de quatro coleções no cliente.
3. Cada regra de segurança precisa ser escrita quatro vezes, e a quarta é onde
   mora o bug.

**Adotado:** uma coleção `orgUnits` com nós tipados e um array materializado de
ancestrais. Profundidade arbitrária, uma regra só, uma query só.

```
orgUnits/
  reg-carajas        { type: "regional",     parentId: null,          path: [] }
  ger-log            { type: "gerencia",     parentId: "reg-carajas", path: ["reg-carajas"] }
  sub-log-norte      { type: "subgerencia",  parentId: "ger-log",     path: ["reg-carajas","ger-log"] }
  coord-patio-n4     { type: "coordenacao",  parentId: "sub-log-norte",
                       path: ["reg-carajas","ger-log","sub-log-norte"] }
```

`path` contém **todos os ancestrais, da raiz até o pai**. Com ele:

- "tudo abaixo de Carajás" → `where('path', 'array-contains', 'reg-carajas')`
- "este setor pertence ao escopo X?" → `X in unit.path || X == unit.id`

Uma expressão. A mesma na query, na Security Rule e na Cloud Function.

`path` é derivado e **gravado apenas pelo servidor** (Cloud Function no
`onCreate`/`onUpdate` de `orgUnits`). Cliente nunca escreve — se pudesse, teria
como se declarar filho de qualquer nó e furar todo o modelo de autorização.

---

## 2. Coleções

### 2.1 `orgUnits/{unitId}`

```ts
interface OrgUnit {
  id: string
  type: 'regional' | 'gerencia' | 'subgerencia' | 'coordenacao'
  name: string
  code: string                 // único dentro do tenant — ex.: "REG-CRJ"
  parentId: string | null      // null apenas na raiz (regional)
  path: string[]               // ancestrais, raiz → pai. Escrito só pelo servidor
  depth: number                // path.length. Redundante, mas evita ordenação no cliente
  responsible: {
    userId: string | null
    name: string
    email: string
  }
  costCenter?: string          // integração com ERP/contabilidade
  active: boolean              // desativação lógica: histórico não pode perder o nó
  createdAt: Timestamp
  createdBy: string
  updatedAt: Timestamp
}
```

> **Por que `active` em vez de excluir:** movimentações antigas apontam para o
> setor. Apagar o nó transformaria auditoria histórica em referência quebrada —
> exatamente o que um auditor procura primeiro.

### 2.2 `vehicles/{vehicleId}`

Um documento por veículo. É a mudança que remove o teto de 1 MiB e o
*last-write-wins*: duas retiradas simultâneas agora tocam documentos distintos.

```ts
interface Vehicle {
  id: string                   // UUID; o `number` atual é frágil (colisão por timestamp)
  tag: string
  plate: string
  model: string
  status: 'disp' | 'uso' | 'lav' | 'man' | 'mobilizacao'

  km: number
  fuel: number                 // 0-100
  fuelText: string             // "Cheio", "3/4" — o que o motorista leu no painel
  maintenance: number          // km da próxima revisão

  // Lotação organizacional. orgUnitId é a folha (coordenação, em geral);
  // orgPath replica o path do nó para permitir filtro por qualquer ancestral
  // sem um segundo round-trip.
  orgUnitId: string
  orgPath: string[]

  currentDriver: { userId: string; name: string } | null
  lastLocation: string
  obs: string

  blocked: boolean
  blockedReason?: string
  blockedBy?: string
  blockedAt?: Timestamp

  lastStatusChangeAt: Timestamp
  lastWashedAt: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

> **`orgPath` denormalizado:** é duplicação deliberada. Sem ela, filtrar "todos
> os veículos da Regional Carajás" exigiria buscar todos os `orgUnits`
> descendentes e depois um `in` (limitado a 30 valores no Firestore). Com ela é
> uma query direta. Custo: quando um setor é remanejado na árvore, uma Function
> reescreve o `orgPath` dos veículos afetados em lote. Evento raro, escrita
> barata.

### 2.3 `movements/{movementId}`

Substitui o array `history[]`. Coleção própria, paginável, sem teto.

```ts
interface Movement {
  id: string
  vehicleId: string
  vehicleTag: string           // snapshot: a tag pode mudar, o histórico não deve
  vehiclePlate: string

  type: 'retirada' | 'devolucao' | 'envio_manutencao' | 'envio_lavador'
      | 'bloqueio' | 'desbloqueio' | 'transferencia'

  driver: { userId: string | null; name: string }
  km: number
  fuel: number
  obs: string

  orgUnitId: string
  orgPath: string[]            // permite auditar por qualquer nível da árvore

  location?: { lat: number; lng: number; accuracy: number }
  distanceKm?: number
  travelTimeMinutes?: number

  photos: Array<{              // caminhos no Storage, nunca base64
    storagePath: string
    title: string
    obs: string
  }>
  signaturePath?: string
  checklistAnswers?: Record<string, boolean | string>
  checklistVersion: string     // qual versão do checklist foi respondida

  createdAt: Timestamp         // serverTimestamp() — nunca o relógio do celular
  createdBy: string
}
```

> **`checklistVersion`:** sem isso, editar o checklist reescreve o significado
> de todas as respostas passadas. Uma auditoria de seis meses atrás precisa ser
> lida contra o formulário vigente naquele dia.
>
> **`createdAt` com `serverTimestamp()`:** o `date` atual usa
> `toLocaleDateString('pt-BR')` do dispositivo — string, fuso local, relógio que
> o usuário pode alterar. Inútil para ordenação e indefensável em auditoria.

### 2.4 `users/{uid}`

```ts
interface UserProfile {
  uid: string
  email: string
  displayName: string
  role: 'super_admin' | 'gestor_regional' | 'gerente'
      | 'coordenador' | 'operador' | 'motorista' | 'auditor'
  scopeUnitId: string | null   // nó raiz do escopo. null = global (super_admin)
  additionalScopes: string[]   // exceção: quem responde por setores não contíguos
  active: boolean
  cnh?: { numero: string; categoria: string; validade: Timestamp }
  lastLoginAt: Timestamp
  createdAt: Timestamp
}
```

`role` e `scopeUnitId` são espelhados em **custom claims** pela Function
`setUserScope`. O documento é a fonte de verdade administrável; a claim é a
cópia rápida usada nas rules. Ver [`RBAC_AUDITORIA.md`](./RBAC_AUDITORIA.md) §2.

### 2.5 `auditLogs/{logId}`

Append-only. Cliente não escreve nem apaga — só `auditor` e `super_admin` leem,
dentro do seu escopo.

```ts
interface AuditLog {
  id: string
  timestamp: Timestamp         // serverTimestamp()
  actor: { uid: string; email: string; role: string; ip?: string }
  action: string               // "vehicle.withdraw", "orgUnit.update", "user.roleChange"
  resource: { type: string; id: string }
  orgPath: string[]            // permite fatiar a auditoria por setor
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  result: 'success' | 'denied' | 'error'
  reason?: string              // preenchido quando denied/error
}
```

> Tentativas **negadas** também são registradas. Um log que só guarda sucesso
> não detecta alguém sondando permissões — que é justamente o padrão que
> interessa a um auditor.

### 2.6 `checklistTemplates/{templateId}`

```ts
interface ChecklistTemplate {
  id: string
  version: string
  orgUnitId: string | null     // null = template global; preenchido = específico do setor
  fields: Array<{
    id: string
    label: string
    category: 'Segurança' | 'Elétrica' | 'Mecânica' | 'Documentação' | 'Geral'
    type: 'boolean' | 'text' | 'number' | 'photo'
    required: boolean
  }>
  active: boolean
  effectiveFrom: Timestamp
  createdBy: string
}
```

Checklist por setor atende ao requisito de gestão individual: a coordenação de
pátio pode exigir itens que a de escritório não exige.

### 2.7 `forumPosts/{postId}` e subcoleção `comments`

Igual ao modelo atual, com dois acréscimos: `orgPath[]` para direcionar avisos
a um setor e sua subárvore, e comentários em **subcoleção** em vez de array —
um post movimentado com 200 comentários dentro do documento reencontraria o
mesmo teto de 1 MiB.

---

## 3. Índices compostos

Registrar em `firestore.indexes.json` (hoje o arquivo está vazio).

| Coleção | Campos | Consulta atendida |
|---|---|---|
| `vehicles` | `orgPath` (array) + `status` + `tag` | Frota de um setor filtrada por situação |
| `vehicles` | `orgPath` (array) + `blocked` | Painel de bloqueios da regional |
| `movements` | `orgPath` (array) + `createdAt` desc | Histórico paginado por setor |
| `movements` | `vehicleId` + `createdAt` desc | Linha do tempo de um veículo |
| `movements` | `driver.userId` + `createdAt` desc | Ranking e histórico por condutor |
| `auditLogs` | `orgPath` (array) + `timestamp` desc | Auditoria setorial |
| `auditLogs` | `actor.uid` + `timestamp` desc | Trilha por usuário |

---

## 4. Agregações pré-calculadas

Somar em tempo real no cliente significa ler a coleção inteira a cada abertura
de tela — e a conta do Firestore é por documento lido. Uma Function agendada
(a cada 15 min) mantém contadores prontos:

```
aggregates/{orgUnitId}
  { total, disponivel, emUso, lavador, manutencao, bloqueados,
    kmMes, retiradasMes, taxaDisponibilidade, updatedAt }
```

O Dashboard e a página de Métricas passam a ler **um documento** por setor. Os
`StatCard` do frontend já estão prontos para essa fonte.

---

## 5. Migração a partir de `frota/data`

Sem *big bang*. Cinco passos, reversíveis até o quarto.

**Passo 1 — Espelho (dual-write).**
Uma Function no `onWrite` de `frota/data` decompõe o documento em `vehicles/*` e
`movements/*`. O app segue lendo o documento antigo. Nada muda para o usuário e
as coleções novas começam a existir e a ser validadas.

**Passo 2 — Backfill.**
Script administrativo (Admin SDK) percorre o histórico existente e cria os
`movements` retroativos. Fotos em base64 são extraídas para o Storage e
substituídas por `storagePath`. Roda em `staging` primeiro, com contagem
conferida documento a documento.

**Passo 3 — Leitura nova.**
O frontend passa a ler das coleções novas atrás de um *feature flag*. O
dual-write continua ativo — rollback é desligar a flag.

**Passo 4 — Escrita nova.**
As escritas passam para as Callable Functions. O documento `frota/data` vira
somente-leitura, congelado como backup.

**Passo 5 — Encerramento.**
Após um ciclo de operação estável (sugerido: 30 dias), `frota/data` é exportado
para o GCS e removido. A Function de espelho é desativada.

**Compatibilidade durante a transição:** `migrateVehicles()` em `useFleetData`
já é precedente de backfill defensivo no cliente. O mesmo padrão vale aqui —
campos ausentes recebem default em vez de quebrar a tela.
