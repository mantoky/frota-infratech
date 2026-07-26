# Fase 0 — Ativação da autenticação

> Passo a passo para colocar em produção o que foi implementado nesta fase. **A ordem importa.**
> Publicar as regras antes de existir um administrador deixa o aplicativo sem ninguém que consiga
> aprovar ninguém.

Ambiente atual: <https://frota-infratech-dev.netlify.app/>

---

## O que mudou

| Antes                                                                 | Agora                                                    |
| --------------------------------------------------------------------- | -------------------------------------------------------- |
| `allow read: if true` — frota pública para quem tivesse o `projectId` | Leitura exige sessão autenticada **e** conta aprovada    |
| Entrar sem identificação, com um botão                                | E-mail e senha pelo Firebase Auth                        |
| PIN em `NEXT_PUBLIC_ADMIN_PIN_*`, legível no bundle                   | Removido. Admin vem do perfil, verificado pelas rules    |
| `localStorage.isAdmin = true` dava poder de administrador             | Ignorado. Quem manda é o documento `users/{uid}`         |
| Excluir veículo: nenhuma confirmação para quem podia                  | Reconfirmação de senha contra o servidor de autenticação |

---

## Ordem de execução

### 1. Habilitar o provedor de login

Firebase Console → **Authentication** → **Sign-in method** → habilitar **E-mail/senha**.

Sem isso o login retorna `auth/operation-not-allowed`.

### 2. Publicar o app com o código novo

O deploy pelo Netlify já acontece no push. Confirme que a versão publicada é a que tem a tela de
login com e-mail e senha antes de seguir.

### 3. Criar a primeira conta

Pelo próprio aplicativo, em **Primeiro acesso**. Ela nasce `pendente` — é o comportamento correto, e
é por isso que o passo seguinte existe.

### 4. Promover essa conta a administrador master

Firestore Console → coleção `users` → o documento com o `uid` recém-criado:

```
level  →  admin_master
status →  ativo
```

> **Este é o único passo manual do processo, e é intencional.** Não existe caminho no aplicativo
> para criar o primeiro administrador — se existisse, seria também o caminho para qualquer pessoa
> virar administrador. O console usa o Admin SDK, que passa por cima das rules por definição, e é
> justamente por isso que ele é o lugar certo para o bootstrap.

### 5. Publicar as Security Rules

```
firebase deploy --only firestore:rules
```

**Só depois do passo 4.** Publicar antes deixa a base sem nenhum usuário ativo: ninguém lê, ninguém
aprova, e a única saída volta a ser o console.

> Não há risco de travamento definitivo — o console sempre ignora as rules. Mas na ordem errada o
> aplicativo fica inutilizável até alguém perceber.

### 6. Conferir que fechou

Abra o site em uma janela anônima, sem fazer login. Nenhum dado de frota pode aparecer. Se aparecer,
as rules não foram publicadas.

---

## Depois da ativação

Todo cadastro novo cai em `pendente` e precisa de aprovação. Enquanto a tela de aprovação não
existir (Fase 5), a liberação é feita no Firestore Console: `status → ativo` e `level` conforme o
caso.

| `level`        | Quem é                             |
| -------------- | ---------------------------------- |
| `usuario`      | condutor — retira e devolve        |
| `operador`     | opera a frota e valida cadastros   |
| `admin`        | administra a própria área          |
| `admin_master` | cria administradores; uso restrito |
| `auditor`      | somente leitura                    |

---

## O que ficou de fora desta fase

Itens 0.4 e 0.5 do [`ROADMAP.md`](./ROADMAP.md) dependem exclusivamente de console e não têm código
associado:

- **App Check (reCAPTCHA Enterprise)** — Firebase Console → App Check. Registre o app web, gere a
  chave e ative o _enforcement_ no Firestore.
- **Rotação das credenciais do Firebase** — as chaves atuais estiveram num repositório com regras
  abertas. Trate-as como comprometidas: gere novas no console e atualize as variáveis no Netlify.

---

## Limitação assumida nesta fase

As rules leem o nível de acesso do documento `users/{uid}` com `get()`, o que custa **uma leitura
por avaliação de regra**. O desenho final usa _custom claims_, resolvidas dentro do próprio token,
sem leitura adicional.

A troca depende de Cloud Functions com o Admin SDK, que entram na Fase 1. Até lá, `get()` é a única
forma correta de verificar nível — e correto-e-caro vence rápido-e-inseguro.
