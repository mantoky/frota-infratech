# Controle de Acesso e Auditoria

> Complemento de [`ARQUITETURA.md`](./ARQUITETURA.md) e [`MODELO_DADOS.md`](./MODELO_DADOS.md).
> Define papéis, propagação de escopo, Security Rules, trilha de auditoria e obrigações de LGPD.

---

## 1. Níveis de acesso e escopo

**Duas dimensões independentes.** O nível diz **o que** a pessoa pode fazer; o escopo diz **sobre
qual pedaço da árvore organizacional**. Um `admin` de Carajás e um `admin` de Vitória têm exatamente
o mesmo poder e nenhum acesso ao setor do outro.

Manter as duas separadas é o que evita a explosão combinatória: sem isso, seriam necessários papéis
como "admin de Carajás", "admin de Vitória", um para cada setor criado.

| Nível          | Nome no pedido | Escopo típico   | Faz                                                                     |
| -------------- | -------------- | --------------- | ----------------------------------------------------------------------- |
| `usuario`      | editor         | uma coordenação | Retira e devolve veículo, participa do fórum, mensagem para operador    |
| `operador`     | curador        | uma coordenação | Tudo do usuário, mais: valida cadastros, opera a frota, modera o fórum  |
| `admin`        | full           | uma regional    | Administra a própria área por inteiro: usuários, veículos, checklist    |
| `admin_master` | master         | global          | Cria administradores e operadores; dispara _force update key_           |
| `auditor`      | —              | qualquer nó     | **Somente leitura**, incluindo `auditLogs`. Não escreve em lugar nenhum |

**`auditor` é nível separado de propósito.** Se auditar exigisse ser administrador, todo auditor
teria poder de alterar o que audita — o conflito de interesse que a função existe para evitar.

> **Equivalência com a v1.** Os sete papéis anteriores continuam válidos conceitualmente e mapeiam
> assim: `motorista` → `usuario`; `operador` → `operador`; `coordenador`, `gerente` e
> `gestor_regional` → `admin` com escopo no nó correspondente; `super_admin` → `admin_master`. A
> distinção entre coordenador, gerente e gestor regional **não se perde**: ela passou a ser expressa
> pelo escopo, que é onde ela sempre esteve de fato.

### 1.1 Matriz de permissões

`P` = próprio, `E` = dentro do escopo, `—` = negado.

| Ação                             | admin_master | admin | operador | usuario | auditor |
| -------------------------------- | :----------: | :---: | :------: | :-----: | :-----: |
| Ver veículos                     |      E       |   E   |    E     |    E    |    E    |
| Retirar / devolver               |      E       |   E   |    E     |    P    |    —    |
| Enviar a lavador/manutenção      |      E       |   E   |    E     |    —    |    —    |
| Bloquear / desbloquear           |      E       |   E   |    E     |    —    |    —    |
| Criar / editar veículo           |      E       |   E   |    —     |    —    |    —    |
| Excluir veículo                  |      E       |   E   |    —     |    —    |    —    |
| Transferir veículo entre setores |      E       |   E   |    —     |    —    |    —    |
| Criar regional                   |      ✔       |   —   |    —     |    —    |    —    |
| Criar setor filho                |      E       |   E   |    —     |    —    |    —    |
| **Aprovar / rejeitar cadastro**  |      E       |   E   |    E     |    —    |    —    |
| **Criar usuário**                |      E       |   E   |    —     |    —    |    —    |
| **Bloquear / desativar usuário** |      E       |   E   |    —     |    —    |    —    |
| **Forçar troca de senha**        |      E       |   E   |    —     |    —    |    —    |
| **Criar admin ou operador**      |      ✔       |   —   |    —     |    —    |    —    |
| **Force update key (global)**    |      ✔       |   —   |    —     |    —    |    —    |
| Conceder nível ≥ o próprio       |      ✔       |   —   |    —     |    —    |    —    |
| **Desmarcar item obrigatório**   |      E       |   E   |    —     |    —    |    —    |
| Editar checklist                 |      E       |   E   |    E     |    —    |    —    |
| Apagar mensagem de terceiro      |      E       |   E   |    —     |    —    |    —    |
| Apagar a própria mensagem        |      ✔       |   ✔   |    ✔     |    ✔    |    —    |
| Ver relatórios                   |      E       |   E   |    E     |    P    |    E    |
| Exportar dados                   |      E       |   E   |    —     |    —    |    E    |
| Ler `auditLogs`                  |      ✔       |   E   |    —     |    —    |    E    |
| Escrever `auditLogs`             |      —       |   —   |    —     |    —    |    —    |

Três invariantes que valem para todas as linhas:

1. **Ninguém concede um nível igual ou superior ao seu.** Sem isso, um `admin` se promove a
   `admin_master` em duas telas.
2. **Ninguém escreve em `auditLogs`.** Nem o `admin_master`. A escrita é exclusiva do Admin SDK
   dentro das Cloud Functions.
3. **Exclusão de usuário é lógica.** O documento nunca é apagado — movimentações, mensagens e logs
   apontam para o `uid`, e removê-lo transformaria a trilha em referência quebrada.

---

### 1.2 Autocadastro e aprovação

Todo autocadastro nasce em `status: 'pendente'` e **não enxerga nada** — nem a frota, nem o fórum,
nem outros usuários. A conta só passa a existir para efeitos práticos após aprovação por `operador`,
`admin` ou `admin_master` **da mesma área**.

Como não há integração com SGC, Prontos ou CRM (ver [`REQUISITOS_V2.md`](./REQUISITOS_V2.md) §1.3),
**a aprovação é a validação**. Quem aprova declara ter conferido RAC02, cadastro no Prontos e ID de
crachá, e isso fica gravado com autor e data. Se um RAC02 vencido passar, a trilha mostra por quem.

```ts
export const approveUser = onCall(async (req) => {
  const caller = requireAuth(req);
  const { targetUid, level, scopeUnitId, conferido } = req.data;

  const alvo = await db.doc(`users/${targetUid}`).get();
  if (alvo.get('status') !== 'pendente') {
    throw new HttpsError('failed-precondition', 'Cadastro não está pendente');
  }

  // Invariante 1: ninguém concede nível igual ou superior ao seu.
  if (RANK[level] >= RANK[caller.level] && caller.level !== 'admin_master') {
    throw new HttpsError('permission-denied', 'Nível acima do seu');
  }
  // Invariante de escopo: só se aprova dentro da própria subárvore.
  assertInScope(caller, alvo.get('declaradoOrgPath'), scopeUnitId);

  // Operador aprova apenas usuário comum - ele proprio nao pode criar par.
  if (caller.level === 'operador' && level !== 'usuario') {
    throw new HttpsError('permission-denied', 'Operador aprova apenas usuário comum');
  }

  await db.doc(`users/${targetUid}`).update({
    status: 'ativo',
    level,
    scopeUnitId,
    'validacao.rac02': { conferido: conferido.rac02, por: caller.uid, em: NOW },
    'validacao.prontos': { conferido: conferido.prontos, por: caller.uid, em: NOW },
    'validacao.cracha': { conferido: conferido.cracha, por: caller.uid, em: NOW },
    'validacao.aprovadoPor': caller.uid,
    'validacao.aprovadoEm': NOW,
  });

  await admin.auth().setCustomUserClaims(targetUid, { level, scope: scopeUnitId });
  await writeAudit({
    action: 'user.approve',
    actor: caller,
    resource: { type: 'user', id: targetUid },
  });
});
```

Rejeição segue o mesmo caminho, com `motivoRejeicao` obrigatório. Uma fila sem trilha de rejeição
esconde exatamente os casos que interessam à auditoria.

---

## 2. Propagação do escopo — custom claims

No login, o ID token carrega:

```json
{
  "role": "gerente",
  "scope": "ger-log",
  "extra": ["coord-patio-n4"],
  "tenant": "infratech"
}
```

Compacto por necessidade: **custom claims têm limite de 1000 bytes**. Por isso a claim guarda o **nó
raiz** do escopo, nunca a lista de descendentes — a descendência é derivada do `path` do recurso,
não transportada no token.

### 2.1 Concessão

```ts
// functions/src/setUserScope.ts
export const setUserScope = onCall(async (req) => {
  const caller = req.auth?.token;
  if (!caller) throw new HttpsError('unauthenticated', 'Login necessário');

  const { targetUid, role, scopeUnitId } = req.data;

  // Invariante 1: não se concede papel igual ou superior ao próprio.
  if (RANK[role] >= RANK[caller.role] && caller.role !== 'super_admin') {
    throw new HttpsError('permission-denied', 'Papel acima do seu nível');
  }

  // Invariante 2: só se concede escopo dentro da própria subárvore.
  const unit = await db.doc(`orgUnits/${scopeUnitId}`).get();
  const inScope =
    caller.role === 'super_admin' ||
    unit.get('path').includes(caller.scope) ||
    scopeUnitId === caller.scope;
  if (!inScope) throw new HttpsError('permission-denied', 'Fora do seu escopo');

  await admin.auth().setCustomUserClaims(targetUid, {
    role,
    scope: scopeUnitId,
    tenant: caller.tenant,
  });

  // Sem isto, o token antigo continua válido por até 1 hora — e um usuário
  // remanejado (ou desligado) manteria o acesso anterior durante esse tempo.
  await admin.auth().revokeRefreshTokens(targetUid);

  await writeAudit({
    action: 'user.roleChange',
    actor: caller,
    resource: { type: 'user', id: targetUid },
    before: prev,
    after: { role, scopeUnitId },
  });
});
```

No cliente, após a mudança: `await auth.currentUser.getIdToken(true)`.

### 2.2 Escopos não contíguos

Alguém que responde por setores em ramos diferentes da árvore não cabe no modelo de nó único. Para
esses casos existe `additionalScopes` no documento `users`, espelhado na claim `extra` — **limitado
a poucos itens**, pelo teto de 1000 bytes. Acima disso, a rule consulta `memberships/{uid}` via
`get()`, aceitando o custo de uma leitura extra em troca de flexibilidade. É a exceção, não o
caminho padrão.

---

## 3. Security Rules

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // ---------- helpers ----------
    function auth()  { return request.auth; }
    function role()  { return auth().token.role; }
    function scope() { return auth().token.scope; }
    function extra() { return auth().token.get('extra', []); }

    function signedIn() { return auth() != null && role() != null; }

    // A expressão central de todo o modelo: um recurso está no escopo do
    // usuário se o nó de escopo dele é o próprio nó do recurso ou um de seus
    // ancestrais. Mesma lógica na query, na rule e na Function.
    function inScope(orgPath, orgUnitId) {
      return role() == 'super_admin'
          || scope() == orgUnitId
          || scope() in orgPath
          || orgUnitId in extra()
          || orgPath.hasAny(extra());
    }

    function hasRole(roles) { return role() in roles; }

    // ---------- orgUnits ----------
    match /orgUnits/{unitId} {
      allow read: if signedIn() && inScope(resource.data.path, unitId);

      // Escrita apenas pelo Admin SDK: `path` e `depth` são derivados, e um
      // cliente capaz de escrevê-los se declararia filho de qualquer nó,
      // furando o modelo inteiro de autorização.
      allow write: if false;
    }

    // ---------- vehicles ----------
    match /vehicles/{vehicleId} {
      allow read: if signedIn() && inScope(resource.data.orgPath, resource.data.orgUnitId);

      // Mudança de status passa por Callable Function, que grava a auditoria
      // na mesma transação. Aqui só se permite edição de cadastro.
      allow update: if signedIn()
                    && hasRole(['super_admin','gestor_regional','gerente','coordenador'])
                    && inScope(resource.data.orgPath, resource.data.orgUnitId)
                    && request.resource.data.diff(resource.data).affectedKeys()
                         .hasOnly(['model','maintenance','obs','updatedAt']);

      allow create, delete: if false;
    }

    // ---------- movements ----------
    match /movements/{movementId} {
      allow read: if signedIn()
                  && (inScope(resource.data.orgPath, resource.data.orgUnitId)
                      || resource.data.driver.userId == auth().uid);
      allow write: if false;   // exclusivo das Functions
    }

    // ---------- auditLogs ----------
    match /auditLogs/{logId} {
      allow read: if signedIn()
                  && hasRole(['super_admin','auditor','gestor_regional'])
                  && inScope(resource.data.orgPath, resource.data.orgPath[0]);
      allow write: if false;   // sem exceção, nem para super_admin
    }

    // ---------- users ----------
    match /users/{uid} {
      allow read: if signedIn()
                  && (uid == auth().uid
                      || hasRole(['super_admin','gestor_regional','gerente','auditor']));
      allow write: if false;   // via Function setUserScope
    }

    // ---------- forum ----------
    match /forumPosts/{postId} {
      allow read: if signedIn() && inScope(resource.data.orgPath, resource.data.orgUnitId);
      allow create: if signedIn()
                    && request.resource.data.author.uid == auth().uid
                    && inScope(request.resource.data.orgPath, request.resource.data.orgUnitId);
      allow update: if signedIn()
                    && (resource.data.author.uid == auth().uid
                        || hasRole(['super_admin','gestor_regional','gerente']));
      allow delete: if signedIn() && hasRole(['super_admin','gestor_regional']);

      match /comments/{commentId} {
        allow read: if signedIn();
        allow create: if signedIn() && request.resource.data.author.uid == auth().uid;
        allow update, delete: if signedIn()
                              && (resource.data.author.uid == auth().uid
                                  || hasRole(['super_admin','gestor_regional']));
      }
    }

    // ---------- padrão ----------
    match /{document=**} { allow read, write: if false; }
  }
}
```

### 3.1 Regras de Storage

```javascript
service firebase.storage {
  match /b/{bucket}/o {
    match /movements/{orgUnitId}/{movementId}/{fileName} {
      allow read: if request.auth != null;   // refinar com claim de escopo
      allow write: if request.auth != null
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
    match /{allPaths=**} { allow read, write: if false; }
  }
}
```

### 3.2 As rules precisam de teste automatizado

Regra de segurança sem teste é intenção, não garantia. O CI deve rodar
`@firebase/rules-unit-testing` contra o Emulator Suite, com no mínimo:

- operador de um setor **não** lê veículo de outro setor;
- gerente **não** concede papel de `super_admin`;
- nenhum papel escreve em `auditLogs`;
- motorista lê o próprio histórico e **não** o dos colegas;
- auditor lê tudo no escopo e **não** escreve nada.

---

## 4. Mensagens — grafo de permissão

Mensagens circulam **apenas dentro da área** (a unidade organizacional e sua subárvore). Fora disso,
o grafo de quem fala com quem é assimétrico de propósito:

| De ↓ / Para →      | `usuario` (condutor) | `operador` | `admin` / `admin_master` |
| ------------------ | :------------------: | :--------: | :----------------------: |
| `usuario`          |          ✗           |     ✓      |            ✗             |
| `operador`         |          ✓           |     ✓      |            ✓             |
| `admin` / `master` |          ✓           |     ✓      |            ✓             |

A intenção é clara: o condutor tem um único canal de escalonamento — o operador — e a administração
não é inundada por conversa paralela. Condutor não fala com condutor, o que evita o app virar rede
social de pátio.

**A validação acontece na Function que cria o thread, não apenas na rule.** Uma rule avalia a
escrita depois que o cliente já montou o documento; se a checagem de nível ficasse só ali, o par de
participantes já teria sido gravado antes da recusa. A Function decide antes de existir qualquer
documento:

```ts
export const openThread = onCall(async (req) => {
  const caller = requireAuth(req);
  const { targetUid } = req.data;

  const alvo = await db.doc(`users/${targetUid}`).get();
  if (!alvo.exists || alvo.get('status') !== 'ativo') {
    throw new HttpsError('not-found', 'Destinatário indisponível');
  }

  // Conversa nunca cruza area.
  if (alvo.get('scopeUnitId') !== caller.scope && caller.level === 'usuario') {
    throw new HttpsError('permission-denied', 'Fora da sua área');
  }

  // O unico caso restritivo: condutor so alcanca operador.
  if (caller.level === 'usuario' && alvo.get('level') !== 'operador') {
    throw new HttpsError('permission-denied', 'Condutor só pode iniciar conversa com um operador');
  }

  // Par ordenado: (A,B) e (B,A) resolvem sempre no mesmo thread, o que evita
  // duas conversas paralelas entre as mesmas duas pessoas.
  const participantes = [caller.uid, targetUid].sort();
  const threadId = participantes.join('__');
  await db
    .doc(`threads/${threadId}`)
    .set({ participantes, orgUnitId: caller.scope, createdAt: NOW }, { merge: true });
  return { threadId };
});
```

> **Limitação conhecida, registrada em [`REQUISITOS_V2.md`](./REQUISITOS_V2.md) §2.3.** Se nenhum
> operador estiver disponível, o condutor fica sem caminho até a administração. Numa operação com
> risco de segurança envolvido isso é um problema real. A proposta em avaliação é um canal de
> ocorrência — formulário que chega a todos os administradores da área, sem virar chat — preservando
> a intenção da regra sem deixar o condutor sem saída.

### 4.1 Autoria e remoção

- **Autor vem do token, nunca de campo digitado.** Hoje o fórum pede o nome do autor num input
  livre: qualquer pessoa assina como qualquer outra. Insustentável com auditoria.
- **Edição preserva o rastro.** `editadoEm` preenchido faz a interface mostrar que a mensagem foi
  alterada. Edição silenciosa em canal corporativo é o mesmo que reescrever o passado.
- **Remoção é lógica.** `removidoPor` marca quem apagou; o conteúdo sai da tela e permanece para
  auditoria. Administrador apaga de qualquer um; os demais, apenas as próprias.

---

## 5. Trilha de auditoria

### 5.1 Como o registro é gravado

Escrita de negócio e registro de auditoria acontecem **na mesma transação**. Não há caminho em que a
mudança persista e o log se perca:

```ts
export const withdrawVehicle = onCall({ minInstances: 1 }, async (req) => {
  const caller = requireAuth(req);
  const { vehicleId, driverName, km, fuel, obs, location, photos } = req.data;

  return db.runTransaction(async (tx) => {
    const ref = db.doc(`vehicles/${vehicleId}`);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'Veículo inexistente');

    const before = snap.data();

    // Autorização revalidada no servidor. A checagem que a UI faz é conforto
    // para o usuário; esta é a que vale.
    assertInScope(caller, before.orgPath, before.orgUnitId);
    if (before.blocked) throw new HttpsError('failed-precondition', 'Veículo bloqueado');
    if (before.status !== 'disp')
      throw new HttpsError('failed-precondition', 'Veículo indisponível');
    if (km < before.km) throw new HttpsError('invalid-argument', 'KM menor que o registrado');

    const after = {
      ...before,
      status: 'uso',
      km,
      fuel,
      currentDriver: { userId: caller.uid, name: driverName },
      obs,
      lastStatusChangeAt: FieldValue.serverTimestamp(),
    };

    tx.update(ref, after);
    tx.create(db.collection('movements').doc(), {
      /* ...Movement */
    });
    tx.create(db.collection('auditLogs').doc(), {
      timestamp: FieldValue.serverTimestamp(),
      actor: { uid: caller.uid, email: caller.email, role: caller.role },
      action: 'vehicle.withdraw',
      resource: { type: 'vehicle', id: vehicleId },
      orgPath: before.orgPath,
      before: pick(before, ['status', 'km', 'fuel', 'currentDriver']),
      after: pick(after, ['status', 'km', 'fuel', 'currentDriver']),
      result: 'success',
    });
  });
});
```

Note a validação `km < before.km`. É o tipo de regra que **não** pode viver no cliente: hoje nada
impede registrar uma quilometragem menor que a anterior, o que corrompe silenciosamente todo o
cálculo de km rodado por condutor.

### 5.2 Eventos obrigatórios

| Categoria    | Ações                                                                                                             |
| ------------ | ----------------------------------------------------------------------------------------------------------------- |
| Autenticação | `auth.login`, `auth.logout`, `auth.failed`, `auth.mfaChallenge`                                                   |
| Veículo      | `withdraw`, `return`, `sendMaintenance`, `sendWash`, `block`, `unblock`, `create`, `update`, `delete`, `transfer` |
| Organização  | `orgUnit.create`, `orgUnit.update`, `orgUnit.deactivate`, `orgUnit.move`                                          |
| Usuários     | `user.create`, `user.roleChange`, `user.scopeChange`, `user.deactivate`                                           |
| Configuração | `checklist.publish`, `rules.deploy`                                                                               |
| Dados        | `export.generate`, `report.download`                                                                              |
| Negativas    | qualquer `permission-denied`, com `result: 'denied'` e `reason`                                                   |

### 5.3 Imutabilidade e retenção

- Cliente sem `create`, `update` ou `delete` em `auditLogs`.
- Export contínuo para **BigQuery**; no BigQuery, a tabela recebe _table snapshot_ diário em dataset
  separado, com IAM restrito a auditoria.
- Retenção: **5 anos** para auditoria; movimentações operacionais conforme política de retenção
  definida com o jurídico.
- Cópia semanal em bucket GCS com _retention policy_ bloqueada (WORM) para os registros que
  precisarem sobreviver ao próprio projeto Firebase.

### 5.4 Auditoria individual por setor

O `orgPath[]` em cada log é o que atende diretamente ao requisito de "auditoria individual de cada
setor":

```ts
// Tudo que aconteceu na Coordenação Pátio N4 em julho
db.collection('auditLogs')
  .where('orgPath', 'array-contains', 'coord-patio-n4')
  .where('timestamp', '>=', inicioJulho)
  .orderBy('timestamp', 'desc');

// Tudo da Regional Carajás, incluindo todas as subgerências e coordenações
db.collection('auditLogs').where('orgPath', 'array-contains', 'reg-carajas');
```

A mesma query serve qualquer nível da árvore. É o retorno prático de ter escolhido `path[]` em vez
de coleções por nível.

---

## 6. Sessão, credenciais e políticas de segurança

| Item                | Política                                                                         |
| ------------------- | -------------------------------------------------------------------------------- |
| Duração do ID token | 1h (padrão), renovação automática                                                |
| Sessão inativa      | Logout após 8h sem interação (turno)                                             |
| Token de segurança  | TOTP obrigatório para **todos os níveis**; ver §6.1                              |
| Senha               | Mínimo 12 caracteres, verificação contra listas vazadas                          |
| Expiração de senha  | 45 dias para `usuario` e `operador`; ver §6.2                                    |
| Desligamento        | `disableUser` + `revokeRefreshTokens`                                            |
| Force update key    | `config/security.sessionEpoch`; ver §6.3                                         |
| App Check           | reCAPTCHA Enterprise obrigatório em produção                                     |
| PIN                 | _Step-up_ para ações destrutivas, validado no servidor. Nunca em `NEXT_PUBLIC_*` |

### 6.1 TOTP — implementação sem custo

O MFA nativo do Firebase (SMS ou TOTP) exige o **Identity Platform pago** — não está no plano
gratuito. Para atender ao requisito sem custo, o TOTP é implementado em Cloud Function com `otplib`,
biblioteca madura do algoritmo padronizado em RFC 6238.

**Por que TOTP e não SMS ou e-mail:** funciona **offline**. Em mina, pátio e estrada, SMS e e-mail
dependem de um sinal que frequentemente não existe — o segundo fator não pode ser justamente o que
impede o motorista de retirar o veículo. Esse argumento vale independente de custo.

O algoritmo é a parte fácil. O que precisa de cuidado é o entorno:

| Cuidado                     | Por quê                                                                       |
| --------------------------- | ----------------------------------------------------------------------------- |
| Segredo cifrado (Cloud KMS) | Segredo TOTP em claro no Firestore equivale a não ter segundo fator           |
| Limite de tentativas        | Seis dígitos sem _throttling_ são força bruta trivial                         |
| Proteção contra replay      | Código usado não vale de novo dentro da mesma janela de 30s                   |
| Códigos de recuperação      | Uso único, guardados como hash — celular perdido não pode virar conta perdida |
| Verificação no servidor     | Validar TOTP no cliente é o mesmo que não validar                             |

```ts
export const verifyTotp = onCall(async (req) => {
  const caller = requireAuth(req);
  const { code } = req.data;

  const user = await db.doc(`users/${caller.uid}`).get();

  // Throttling antes de qualquer verificacao: sem isto, 10^6 combinacoes caem
  // em minutos.
  if (user.get('seguranca.lockedUntil')?.toMillis() > Date.now()) {
    throw new HttpsError('resource-exhausted', 'Muitas tentativas. Aguarde.');
  }

  const secret = await kms.decrypt(user.get('seguranca.totpSecretEnc'));
  const ok = authenticator.verify({ token: code, secret });

  if (!ok) {
    const n = (user.get('seguranca.failedLoginCount') ?? 0) + 1;
    await user.ref.update({
      'seguranca.failedLoginCount': n,
      // Backoff exponencial, teto de 15 min.
      'seguranca.lockedUntil': n >= 5 ? plusMinutes(Math.min(2 ** (n - 5), 15)) : null,
    });
    await writeAudit({ action: 'auth.totpFailed', actor: caller, result: 'denied' });
    throw new HttpsError('permission-denied', 'Código inválido');
  }

  await user.ref.update({ 'seguranca.failedLoginCount': 0, 'seguranca.lockedUntil': null });
  return { ok: true };
});
```

> **Trade-off assumido, registrado.** Implementar MFA por conta própria é assumir a responsabilidade
> por ela. O Identity Platform transferiria esse risco ao Google por um valor mensal baixo. Para um
> sistema corporativo com dado pessoal e exigência de auditoria, vale reavaliar quando houver
> orçamento — a economia é pequena e o risco assumido não é.

### 6.2 Expiração de senha em 45 dias

Function agendada diária marca `mustChangePassword` em quem passou de `passwordMaxAgeDays`. Com a
marca ligada, qualquer operação é bloqueada até a troca — inclusive por rule, não só pela interface.

> **Contraponto técnico que precisa ser dito.** A recomendação atual do NIST (SP 800-63B) é
> **contra** expiração periódica arbitrária. O efeito observado é o oposto do pretendido: as pessoas
> passam a criar senhas previsíveis (`Senha@01`, `Senha@02`) porque precisam decorá-las de novo a
> cada ciclo. A orientação moderna é forçar troca **diante de indício de comprometimento**, e
> compensar com segundo fator — que aqui já será obrigatório.
>
> Fica implementado porque foi pedido e porque política corporativa costuma exigir. Recomendo levar
> o ponto à área de segurança: com TOTP obrigatório, o ganho dos 45 dias é discutível e o custo em
> qualidade de senha é real.

### 6.3 Force update key

Invalidar todas as sessões de uma vez, sem percorrer a base usuário por usuário:

```javascript
// config/security = { sessionEpoch: <Timestamp> }
function sessaoValida() {
  return request.auth.token.auth_time * 1000
       >= get(/databases/$(database)/documents/config/security).data.sessionEpoch.toMillis();
}
```

Uma escrita em `config/security` derruba todo mundo. O custo é uma leitura por avaliação de rule —
aceitável para um controle de emergência, e mitigável com o cache de `get()` dentro da mesma
requisição.

Para revogação individual (desligamento, suspeita), `revokeRefreshTokens(uid)` continua sendo o
caminho, sem custo de leitura.

### 6.4 Atualizações do aplicativo

| Tipo           | Comportamento                              |
| -------------- | ------------------------------------------ |
| Funcionalidade | Apresentada no login, com aceitar ou adiar |
| Segurança      | Aplicada automaticamente, sem pergunta     |

Sendo um PWA, quando a tela aparece o service worker **já baixou** a versão nova — "negar" só pode
significar "seguir nesta sessão com a versão em cache". Não existe desinstalar atualização.

Por isso `AppRelease.adiamentosPermitidos`: adiar indefinidamente criaria frota de versões
diferentes conversando com o mesmo banco, origem clássica de bug irreproduzível. Release marcado
como `obrigatoria` ignora a pergunta.

---

## 7. LGPD

O sistema trata dado pessoal: nome de condutor, CNH, **geolocalização** e fotos. Isso traz
obrigações concretas, não formalidades.

| Obrigação         | Implementação                                                                                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base legal        | Execução de contrato de trabalho + legítimo interesse na gestão de ativos. Registrar na política interna.                                                             |
| Transparência     | Aviso na tela de login informando que a atividade é registrada — **já implementado** no rodapé do `LoginScreen`.                                                      |
| Minimização       | GPS capturado pontualmente na retirada e devolução, nunca em rastreamento contínuo — o comportamento atual de `geolocation.ts` já está correto e deve ser preservado. |
| Retenção          | GPS e fotos anonimizados após 12 meses por Function agendada; auditoria mantém o evento sem as coordenadas.                                                           |
| Titular           | Endpoint para exportar e corrigir os próprios dados.                                                                                                                  |
| Residência        | Firestore, Storage e Functions em `southamerica-east1`.                                                                                                               |
| Incidentes        | Alerta de Cloud Monitoring para acesso anômalo; runbook de resposta documentado.                                                                                      |
| Encarregado (DPO) | Contato publicado na tela de configurações.                                                                                                                           |
