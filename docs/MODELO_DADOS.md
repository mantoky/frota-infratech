# Modelo de Dados — Firestore

> Complemento de [`ARQUITETURA.md`](./ARQUITETURA.md). Define coleções, a árvore organizacional
> multinível, índices e o caminho de migração a partir do documento único `frota/data`.

---

## 1. A decisão central: árvore organizacional genérica

O requisito é multirregião, e **dentro de cada região** subgerências e coordenações, cada uma
auditável e gerenciável isoladamente.

A tentação é criar uma coleção por nível: `regionais`, `gerencias`, `subgerencias`, `coordenacoes`.
É o caminho errado, por três motivos:

1. Congela a profundidade. No dia em que uma regional precisar de um nível intermediário — e vai
   precisar, porque organograma corporativo muda —, é migração de esquema.
2. Toda consulta de agregação vira `join` manual de quatro coleções no cliente.
3. Cada regra de segurança precisa ser escrita quatro vezes, e a quarta é onde mora o bug.

**Adotado:** uma coleção `orgUnits` com nós tipados e um array materializado de ancestrais.
Profundidade arbitrária, uma regra só, uma query só.

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

`path` é derivado e **gravado apenas pelo servidor** (Cloud Function no `onCreate`/`onUpdate` de
`orgUnits`). Cliente nunca escreve — se pudesse, teria como se declarar filho de qualquer nó e furar
todo o modelo de autorização.

---

## 2. Coleções

### 2.1 `orgUnits/{unitId}`

```ts
interface OrgUnit {
  id: string;
  type: 'regional' | 'gerencia' | 'subgerencia' | 'coordenacao';
  name: string;
  code: string; // único dentro do tenant — ex.: "REG-CRJ"
  parentId: string | null; // null apenas na raiz (regional)
  path: string[]; // ancestrais, raiz → pai. Escrito só pelo servidor
  depth: number; // path.length. Redundante, mas evita ordenação no cliente
  responsible: {
    userId: string | null;
    name: string;
    email: string;
  };

  // Os tres vinculos que definem uma "area" para efeito de mensagens. O forum
  // circula dentro da area e sua subarvore, entao esses campos deixam de ser
  // informativos e passam a ser parte da regra de visibilidade.
  lideranca: {
    gerenciaRegional: { unitId: string; lider: string };
    coordenacaoLocal: { unitId: string; lider: string };
    areaFrota: string; // ex.: "Infratech-No"
  };

  costCenter?: string; // integração com ERP/contabilidade
  active: boolean; // desativação lógica: histórico não pode perder o nó
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
}
```

> **Por que `active` em vez de excluir:** movimentações antigas apontam para o setor. Apagar o nó
> transformaria auditoria histórica em referência quebrada — exatamente o que um auditor procura
> primeiro.

### 2.2 `vehicles/{vehicleId}`

Um documento por veículo. É a mudança que remove o teto de 1 MiB e o _last-write-wins_: duas
retiradas simultâneas agora tocam documentos distintos.

```ts
interface Vehicle {
  id: string; // UUID; o `number` atual é frágil (colisão por timestamp)
  tag: string;
  plate: string;
  model: string;
  status: 'disp' | 'uso' | 'lav' | 'man' | 'mobilizacao';

  km: number;
  fuel: number; // 0-100
  fuelText: string; // "Cheio", "3/4" — o que o motorista leu no painel
  maintenance: number; // km da próxima revisão

  // Lotação organizacional. orgUnitId é a folha (coordenação, em geral);
  // orgPath replica o path do nó para permitir filtro por qualquer ancestral
  // sem um segundo round-trip.
  orgUnitId: string;
  orgPath: string[];

  currentDriver: { userId: string; name: string } | null;
  lastLocation: string;
  obs: string;

  blocked: boolean;
  blockedReason?: string;
  blockedBy?: string;
  blockedAt?: Timestamp;

  lastStatusChangeAt: Timestamp;
  lastWashedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

> **`orgPath` denormalizado:** é duplicação deliberada. Sem ela, filtrar "todos os veículos da
> Regional Carajás" exigiria buscar todos os `orgUnits` descendentes e depois um `in` (limitado a 30
> valores no Firestore). Com ela é uma query direta. Custo: quando um setor é remanejado na árvore,
> uma Function reescreve o `orgPath` dos veículos afetados em lote. Evento raro, escrita barata.

### 2.3 `movements/{movementId}`

Substitui o array `history[]`. Coleção própria, paginável, sem teto.

```ts
interface Movement {
  id: string;
  vehicleId: string;
  vehicleTag: string; // snapshot: a tag pode mudar, o histórico não deve
  vehiclePlate: string;

  type:
    | 'retirada'
    | 'devolucao'
    | 'envio_manutencao'
    | 'envio_lavador'
    | 'bloqueio'
    | 'desbloqueio'
    | 'transferencia';

  driver: { userId: string | null; name: string };
  km: number;
  fuel: number;
  obs: string;

  orgUnitId: string;
  orgPath: string[]; // permite auditar por qualquer nível da árvore

  location?: { lat: number; lng: number; accuracy: number };
  distanceKm?: number;
  travelTimeMinutes?: number;

  photos: Array<{
    // caminhos no Storage, nunca base64
    storagePath: string;
    title: string;
    obs: string;
  }>;
  signaturePath?: string;
  checklistAnswers?: Record<string, boolean | string>;
  checklistVersion: string; // qual versão do checklist foi respondida

  createdAt: Timestamp; // serverTimestamp() — nunca o relógio do celular
  createdBy: string;
}
```

> **`checklistVersion`:** sem isso, editar o checklist reescreve o significado de todas as respostas
> passadas. Uma auditoria de seis meses atrás precisa ser lida contra o formulário vigente naquele
> dia.
>
> **`createdAt` com `serverTimestamp()`:** o `date` atual usa `toLocaleDateString('pt-BR')` do
> dispositivo — string, fuso local, relógio que o usuário pode alterar. Inútil para ordenação e
> indefensável em auditoria.

### 2.4 `users/{uid}`

```ts
interface UserProfile {
  uid: string;
  email: string; // corporativo; identificador de login
  displayName: string; // nome completo

  level: 'usuario' | 'operador' | 'admin' | 'admin_master' | 'auditor';
  scopeUnitId: string | null; // nó raiz do escopo. null = global (admin_master)
  additionalScopes: string[]; // exceção: quem responde por setores não contíguos

  // --- Estado da conta ---
  // `pendente` é o estado inicial de todo autocadastro: a conta existe, mas
  // nao enxerga absolutamente nada ate ser aprovada. Ver REQUISITOS_V2 §1.2.
  status: 'pendente' | 'ativo' | 'bloqueado' | 'inativo';

  // --- Dados declarados no cadastro ---
  declarado: {
    gerencia: string;
    coordenador: string;
    gestorStaff: string;
    funcao: string;
    empresa: string;
    idCracha: string;
    rac02: string;
    rac02ValidadeDeclarada: Timestamp | null;
    prontosCadastrado: boolean;
  };

  // --- Validação humana (não há integração com SGC/Prontos) ---
  // Guardar quem validou e quando e o que torna a ausencia de integracao
  // auditavel: se um RAC02 vencido passar, a trilha mostra por quem.
  validacao: {
    rac02: { conferido: boolean; por: string | null; em: Timestamp | null };
    prontos: { conferido: boolean; por: string | null; em: Timestamp | null };
    cracha: { conferido: boolean; por: string | null; em: Timestamp | null };
    aprovadoPor: string | null;
    aprovadoEm: Timestamp | null;
    rejeitadoPor: string | null;
    rejeitadoEm: Timestamp | null;
    motivoRejeicao: string | null;
  };

  // --- Segurança ---
  seguranca: {
    // Segredo TOTP cifrado com Cloud KMS. Nunca em claro, nunca legivel pelo
    // cliente - a verificacao acontece dentro da Function.
    totpSecretEnc: string | null;
    totpAtivoEm: Timestamp | null;
    recoveryCodesHash: string[]; // uso unico, guardados como hash
    passwordUpdatedAt: Timestamp;
    mustChangePassword: boolean; // ligado pela rotina de 45 dias
    failedLoginCount: number;
    lockedUntil: Timestamp | null;
  };

  preferencias: {
    popupNovasMensagens: boolean; // ativado por padrão
    idioma: 'pt' | 'en' | 'es';
    tema: 'light' | 'dark';
  };

  cnh?: { numero: string; categoria: string; validade: Timestamp };
  lastLoginAt: Timestamp;
  createdAt: Timestamp;
}
```

`level` e `scopeUnitId` são espelhados em **custom claims** pela Function `setUserScope`. O
documento é a fonte de verdade administrável; a claim é a cópia rápida usada nas rules. Ver
[`RBAC_AUDITORIA.md`](./RBAC_AUDITORIA.md) §2.

> **Por que `status: 'pendente'` e não simplesmente `active: false`:** são estados diferentes com
> consequências diferentes. `pendente` nunca teve acesso e aguarda decisão; `bloqueado` teve acesso
> e foi suspenso; `inativo` é o desligamento. Colapsar os três num booleano perde a informação de
> que a auditoria mais precisa — a de por que a conta está sem acesso.
>
> **Exclusão é sempre lógica.** Movimentações, mensagens e logs apontam para o `uid`. Apagar o
> documento transformaria o histórico inteiro em referência quebrada.

### 2.5 `auditLogs/{logId}`

Append-only. Cliente não escreve nem apaga — só `auditor` e `super_admin` leem, dentro do seu
escopo.

```ts
interface AuditLog {
  id: string;
  timestamp: Timestamp; // serverTimestamp()
  actor: { uid: string; email: string; role: string; ip?: string };
  action: string; // "vehicle.withdraw", "orgUnit.update", "user.roleChange"
  resource: { type: string; id: string };
  orgPath: string[]; // permite fatiar a auditoria por setor
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  result: 'success' | 'denied' | 'error';
  reason?: string; // preenchido quando denied/error
}
```

> Tentativas **negadas** também são registradas. Um log que só guarda sucesso não detecta alguém
> sondando permissões — que é justamente o padrão que interessa a um auditor.

### 2.6 `checklistTemplates/{templateId}`

```ts
interface ChecklistTemplate {
  id: string;
  version: string;
  orgUnitId: string | null; // null = template global; preenchido = específico do setor
  fields: Array<{
    id: string;
    label: string;
    category: 'Segurança' | 'Elétrica' | 'Mecânica' | 'Documentação' | 'Geral';
    type: 'boolean' | 'text' | 'number' | 'photo';
    required: boolean;
  }>;
  active: boolean;
  effectiveFrom: Timestamp;
  createdBy: string;
}
```

Checklist por setor atende ao requisito de gestão individual: a coordenação de pátio pode exigir
itens que a de escritório não exige.

> **`required` nasce `true`.** Todo item é obrigatório por padrão e só o administrador pode
> desmarcar, com registro em `auditLogs`. Desobrigar um item de checklist é decisão sobre segurança
> operacional, não preferência de tela — e por isso precisa de autor e data.

Além dos campos do checklist configurável, a retirada passa a exigir três confirmações fixas, que
não podem ser desmarcadas por ninguém:

```ts
interface RetiradaObrigatorios {
  prontosExecutado: boolean; // executou o Prontos e está liberado
  crmRealizado: boolean;
  // Preenchido apenas quando o condutor NAO esta liberado pelo Prontos. A
  // justificativa e do gestor, nunca do proprio condutor - se ele pudesse
  // justificar a si mesmo, o controle nao existiria.
  aptidaoJustificada?: {
    justificativa: string;
    gestorUid: string;
    gestorNome: string;
    em: Timestamp;
  };
}
```

### 2.7 `forumPosts/{postId}` e subcoleção `comments`

Igual ao modelo atual, com dois acréscimos: `orgPath[]` para direcionar avisos a um setor e sua
subárvore, e comentários em **subcoleção** em vez de array — um post movimentado com 200 comentários
dentro do documento reencontraria o mesmo teto de 1 MiB.

**A autoria passa a vir do token, nunca de campo digitado.** Hoje `ForumPage` pede o nome do autor
num input livre, o que permite assinar como qualquer pessoa — insustentável num sistema auditável.

```ts
interface ForumPost {
  id: string;
  titulo: string;
  conteudo: string;
  autor: { uid: string; nome: string; level: string }; // do token, sempre
  categoria: 'Aviso' | 'Alerta' | 'Manutenção' | 'Geral';
  orgUnitId: string;
  orgPath: string[]; // circula apenas na área e subárvore
  editadoEm: Timestamp | null; // transparência: mensagem editada mostra que foi
  removidoPor: string | null; // remoção lógica preserva a trilha
  createdAt: Timestamp;
  likes: number;
}
```

### 2.8 `threads/{threadId}` e subcoleção `messages`

Mensagem privada. O par de participantes vive no documento pai para que a regra de permissão seja
avaliada **uma vez por conversa**, e não a cada mensagem.

```ts
interface Thread {
  id: string;
  // Ordenado, para que a dupla (A,B) e (B,A) resolvam sempre no mesmo thread.
  participantes: [string, string];
  participantesInfo: Record<string, { nome: string; level: string }>;
  orgUnitId: string; // conversa nunca cruza area
  ultimaMensagem: { texto: string; autorUid: string; em: Timestamp };
  naoLidas: Record<string, number>; // contador por participante
  createdAt: Timestamp;
}

interface Message {
  id: string;
  autorUid: string;
  autorNome: string; // snapshot, para o historico nao mudar se o nome mudar
  texto: string;
  editadoEm: Timestamp | null;
  removidoPor: string | null;
  lidaPor: string[];
  createdAt: Timestamp;
}
```

O grafo de quem pode falar com quem (condutor → apenas operador) está em
[`RBAC_AUDITORIA.md`](./RBAC_AUDITORIA.md) §4 e é validado **na Function que cria o thread**, não só
na rule — validar apenas na rule deixaria o par gravado antes da checagem de nível.

### 2.9 `appReleases/{version}`

Suporta o aceite de atualização no login.

```ts
interface AppRelease {
  version: string; // "1.3.0"
  notas: string;
  tipo: 'funcionalidade' | 'seguranca';
  // Atualizacao de seguranca ignora a pergunta e aplica na hora. A de
  // funcionalidade pode ser adiada por um numero limitado de sessoes - adiar
  // indefinidamente cria frota de versoes diferentes sobre o mesmo banco.
  obrigatoria: boolean;
  adiamentosPermitidos: number;
  publicadoEm: Timestamp;
  publicadoPor: string;
}
```

### 2.10 `config/security`

Documento único que sustenta o _force update key_.

```ts
interface SecurityConfig {
  // Toda sessao emitida antes deste instante e recusada pelas rules. Uma
  // escrita derruba todos os usuarios de uma vez, sem percorrer a base
  // usuario por usuario.
  sessionEpoch: Timestamp;
  atualizadoPor: string;
  motivo: string;
  passwordMaxAgeDays: number; // 45
}
```

---

## 3. Índices compostos

Registrar em `firestore.indexes.json` (hoje o arquivo está vazio).

| Coleção      | Campos                                             | Consulta atendida                           |
| ------------ | -------------------------------------------------- | ------------------------------------------- |
| `vehicles`   | `orgPath` (array) + `status` + `tag`               | Frota de um setor filtrada por situação     |
| `vehicles`   | `orgPath` (array) + `blocked`                      | Painel de bloqueios da regional             |
| `movements`  | `orgPath` (array) + `createdAt` desc               | Histórico paginado por setor                |
| `movements`  | `vehicleId` + `createdAt` desc                     | Linha do tempo de um veículo                |
| `movements`  | `driver.userId` + `createdAt` desc                 | Ranking e histórico por condutor            |
| `auditLogs`  | `orgPath` (array) + `timestamp` desc               | Auditoria setorial                          |
| `auditLogs`  | `actor.uid` + `timestamp` desc                     | Trilha por usuário                          |
| `users`      | `status` + `scopeUnitId` + `createdAt`             | Fila de aprovação de cadastros da área      |
| `users`      | `scopeUnitId` + `level` + `displayName`            | Gestão de usuários no painel administrativo |
| `users`      | `seguranca.passwordUpdatedAt`                      | Rotina agendada de expiração de senha       |
| `forumPosts` | `orgPath` (array) + `createdAt` desc               | Fórum da área, paginado                     |
| `threads`    | `participantes` (array) + `ultimaMensagem.em` desc | Caixa de conversas do usuário               |

---

## 4. Agregações pré-calculadas

Somar em tempo real no cliente significa ler a coleção inteira a cada abertura de tela — e a conta
do Firestore é por documento lido. Uma Function agendada (a cada 15 min) mantém contadores prontos:

```
aggregates/{orgUnitId}
  { total, disponivel, emUso, lavador, manutencao, bloqueados,
    kmMes, retiradasMes, taxaDisponibilidade, updatedAt }
```

O Dashboard e a página de Métricas passam a ler **um documento** por setor. Os `StatCard` do
frontend já estão prontos para essa fonte.

---

## 5. Migração a partir de `frota/data`

Sem _big bang_. Cinco passos, reversíveis até o quarto.

**Passo 1 — Espelho (dual-write).** Uma Function no `onWrite` de `frota/data` decompõe o documento
em `vehicles/*` e `movements/*`. O app segue lendo o documento antigo. Nada muda para o usuário e as
coleções novas começam a existir e a ser validadas.

**Passo 2 — Backfill.** Script administrativo (Admin SDK) percorre o histórico existente e cria os
`movements` retroativos. Fotos em base64 são extraídas para o Storage e substituídas por
`storagePath`. Roda em `staging` primeiro, com contagem conferida documento a documento.

**Passo 3 — Leitura nova.** O frontend passa a ler das coleções novas atrás de um _feature flag_. O
dual-write continua ativo — rollback é desligar a flag.

**Passo 4 — Escrita nova.** As escritas passam para as Callable Functions. O documento `frota/data`
vira somente-leitura, congelado como backup.

**Passo 5 — Encerramento.** Após um ciclo de operação estável (sugerido: 30 dias), `frota/data` é
exportado para o GCS e removido. A Function de espelho é desativada.

**Compatibilidade durante a transição:** `migrateVehicles()` em `useFleetData` já é precedente de
backfill defensivo no cliente. O mesmo padrão vale aqui — campos ausentes recebem default em vez de
quebrar a tela.

---

## Adendo — hierarquia de cinco níveis e fórum no Firestore

> Escrito depois do incidente de perda de frota de 27/07/2026. Substitui o par
> `Regional[] + Gerencia[]` da v1.

### A árvore

```
Regional > Gerência > Coordenação > Gestão > Área
```

Uma coleção só, `org/data`, com um array de `OrgUnit`. Cada nó guarda apenas o
pai imediato (`parentId`) e o caminho materializado até a raiz (`path`). É o
`path` que torna barato perguntar "tudo que está sob esta gerência" — vira um
filtro linear em vez de travessia recursiva.

Cada nível declara atributos próprios em `ORG_LEVEL_FIELDS` (`src/lib/org.ts`):

| Nível       | Atributos                                    |
| ----------- | -------------------------------------------- |
| Regional    | responsável, sede, UF, descrição             |
| Gerência    | gerente\*, e-mail, centro de custo           |
| Coordenação | coordenador\*, turno, telefone de plantão    |
| Gestão      | gestor\*, staff, contrato                    |
| Área        | registro da frota\*, responsável, empresa    |

`*` obrigatório. O registro da frota da área (ex.: `Infratech-No`) é o que
delimita quem troca mensagens com quem no fórum.

Documento único, e não uma coleção por unidade, porque a árvore muda raramente
e é lida em quase toda tela: uma leitura por sessão contra uma por unidade.

### Migração

`migrarDaV1()` promove as regionais e gerências existentes **preservando os
ids** — os veículos já gravados apontam para eles, e trocá-los desvincularia a
frota inteira da estrutura. Os três níveis que não existiam são criados como
"padrão" para que nenhum veículo fique sem área.

### Fórum

Coleção `forumPosts/{postId}`, **não** um array dentro de um documento. A razão
é a regra de segurança: "o autor edita a sua, o administrador apaga qualquer
uma" só é expressável quando a posse é por documento. Num array, quem pode
escrever no documento reescreve a mensagem de qualquer pessoa.

`authorUid` vem do token e é conferido pela regra no `create`. O campo de texto
livre "Seu nome" foi removido — ele permitia assinar como qualquer um, o que
anula a trilha de auditoria inteira.

Curtir e comentar são liberados a qualquer usuário ativo, mas apenas sobre as
chaves `likes` e `comments` (`hasOnly`), para que um "comentário" não venha
acompanhado de uma troca sorrateira de autor ou conteúdo.
