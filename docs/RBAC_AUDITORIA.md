# Controle de Acesso e Auditoria

> Complemento de [`ARQUITETURA.md`](./ARQUITETURA.md) e [`MODELO_DADOS.md`](./MODELO_DADOS.md).
> Define papéis, propagação de escopo, Security Rules, trilha de auditoria e obrigações de LGPD.

---

## 1. Papéis

Sete papéis. A escala de privilégio é ortogonal ao escopo: o papel diz **o que** a pessoa pode
fazer, o escopo diz **sobre qual pedaço da árvore**.

| Papel             | Escopo típico            | Pode                                                                                 |
| ----------------- | ------------------------ | ------------------------------------------------------------------------------------ |
| `super_admin`     | global                   | Tudo, inclusive criar regionais e conceder papéis. Uso restrito a 2–3 pessoas.       |
| `gestor_regional` | uma regional             | Gerir toda a subárvore: setores, veículos, usuários abaixo de si, relatórios.        |
| `gerente`         | uma gerência/subgerência | Gerir setores filhos, veículos e operação da sua subárvore.                          |
| `coordenador`     | uma coordenação          | Operar e administrar os veículos do seu setor. Bloquear/desbloquear.                 |
| `operador`        | uma coordenação          | Registrar retirada, devolução, envio a lavador/manutenção. Não altera cadastro.      |
| `motorista`       | uma coordenação          | Retirar e devolver o veículo que estiver conduzindo. Só enxerga o próprio histórico. |
| `auditor`         | qualquer nó              | **Somente leitura**, incluindo `auditLogs`. Não escreve nada, em lugar nenhum.       |

**`auditor` é papel separado de propósito.** Se auditar exigisse ser admin, todo auditor teria poder
de alterar o que audita — o conflito de interesse que a função existe para evitar.

### 1.1 Matriz de permissões

`P` = próprio, `E` = dentro do escopo, `—` = negado.

| Ação                             | super_admin | gestor_regional | gerente | coordenador | operador | motorista | auditor |
| -------------------------------- | :---------: | :-------------: | :-----: | :---------: | :------: | :-------: | :-----: |
| Ver veículos                     |      E      |        E        |    E    |      E      |    E     |     E     |    E    |
| Retirar / devolver               |      E      |        E        |    E    |      E      |    E     |     P     |    —    |
| Enviar a lavador/manutenção      |      E      |        E        |    E    |      E      |    E     |     —     |    —    |
| Bloquear / desbloquear           |      E      |        E        |    E    |      E      |    —     |     —     |    —    |
| Criar / editar veículo           |      E      |        E        |    E    |      E      |    —     |     —     |    —    |
| Excluir veículo                  |      E      |        E        |    —    |      —      |    —     |     —     |    —    |
| Transferir veículo entre setores |      E      |        E        |    E    |      —      |    —     |     —     |    —    |
| Criar regional                   |      ✔      |        —        |    —    |      —      |    —     |     —     |    —    |
| Criar setor filho                |      E      |        E        |    E    |      —      |    —     |     —     |    —    |
| Gerir usuários                   |      E      |        E        |    E    |      —      |    —     |     —     |    —    |
| Conceder papel ≥ o próprio       |      ✔      |        —        |    —    |      —      |    —     |     —     |    —    |
| Editar checklist                 |      E      |        E        |    E    |      E      |    —     |     —     |    —    |
| Ver relatórios                   |      E      |        E        |    E    |      E      |    E     |     P     |    E    |
| Exportar dados                   |      E      |        E        |    E    |      —      |    —     |     —     |    E    |
| Ler `auditLogs`                  |      ✔      |        E        |    —    |      —      |    —     |     —     |    E    |
| Escrever `auditLogs`             |      —      |        —        |    —    |      —      |    —     |     —     |    —    |

Duas invariantes que valem para todas as linhas:

1. **Ninguém concede um papel igual ou superior ao seu.** Sem isso, um gerente se promove a
   `super_admin` em duas telas.
2. **Ninguém escreve em `auditLogs`.** Nem o `super_admin`. A escrita é exclusiva do Admin SDK
   dentro das Cloud Functions.

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

## 4. Trilha de auditoria

### 4.1 Como o registro é gravado

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

### 4.2 Eventos obrigatórios

| Categoria    | Ações                                                                                                             |
| ------------ | ----------------------------------------------------------------------------------------------------------------- |
| Autenticação | `auth.login`, `auth.logout`, `auth.failed`, `auth.mfaChallenge`                                                   |
| Veículo      | `withdraw`, `return`, `sendMaintenance`, `sendWash`, `block`, `unblock`, `create`, `update`, `delete`, `transfer` |
| Organização  | `orgUnit.create`, `orgUnit.update`, `orgUnit.deactivate`, `orgUnit.move`                                          |
| Usuários     | `user.create`, `user.roleChange`, `user.scopeChange`, `user.deactivate`                                           |
| Configuração | `checklist.publish`, `rules.deploy`                                                                               |
| Dados        | `export.generate`, `report.download`                                                                              |
| Negativas    | qualquer `permission-denied`, com `result: 'denied'` e `reason`                                                   |

### 4.3 Imutabilidade e retenção

- Cliente sem `create`, `update` ou `delete` em `auditLogs`.
- Export contínuo para **BigQuery**; no BigQuery, a tabela recebe _table snapshot_ diário em dataset
  separado, com IAM restrito a auditoria.
- Retenção: **5 anos** para auditoria; movimentações operacionais conforme política de retenção
  definida com o jurídico.
- Cópia semanal em bucket GCS com _retention policy_ bloqueada (WORM) para os registros que
  precisarem sobreviver ao próprio projeto Firebase.

### 4.4 Auditoria individual por setor

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

## 5. Sessão e credenciais

| Item                | Política                                                                         |
| ------------------- | -------------------------------------------------------------------------------- |
| Duração do ID token | 1h (padrão), renovação automática                                                |
| Sessão inativa      | Logout após 8h sem interação (turno)                                             |
| MFA                 | Obrigatório: `super_admin`, `gestor_regional`, `auditor`                         |
| Senha               | Mínimo 12 caracteres, verificação contra listas vazadas (Identity Platform)      |
| Desligamento        | Function no evento de RH: `disableUser` + `revokeRefreshTokens`                  |
| App Check           | reCAPTCHA Enterprise obrigatório em produção                                     |
| PIN                 | _Step-up_ para ações destrutivas, validado no servidor. Nunca em `NEXT_PUBLIC_*` |

---

## 6. LGPD

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
