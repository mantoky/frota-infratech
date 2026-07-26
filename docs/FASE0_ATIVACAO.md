# Fase 0 — Ativação da autenticação

> Passo a passo para colocar em produção o que foi implementado nesta fase. **A ordem importa: as
> Security Rules vão antes do primeiro cadastro.**
>
> A primeira versão deste documento mandava o contrário, e estava errada. O autocadastro grava um
> documento em `users/{uid}`, e as regras antigas negavam tudo que não fosse `frota/data`.
> Resultado: a conta era criada no Auth, a gravação do perfil era recusada, e a tela mostrava um
> erro genérico.
>
> O receio que motivou a ordem errada — "publicar regras sem administrador tranca todo mundo" — não
> se sustenta: **ninguém precisa ser administrador para se autocadastrar.** A regra de `create` em
> `users/{uid}` só exige estar autenticado e pedir nível comum com status pendente.

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

### 3. Publicar as Security Rules

```
firebase deploy --only firestore:rules
```

**Antes de qualquer cadastro.** Sem isto, as regras antigas ainda estão valendo e negam a escrita em
`users/{uid}` — o cadastro falha depois de já ter criado a conta no Auth.

Para conferir o que está publicado: Firebase Console → **Firestore Database** → aba **Regras**. Se
ainda aparecer `match /frota/data` com `allow read: if true`, o deploy não aconteceu.

### 4. Criar a primeira conta

Pelo próprio aplicativo, em **Primeiro acesso**. Ela nasce `pendente` — é o comportamento correto, e
é por isso que o passo seguinte existe.

### 5. Promover essa conta a administrador master

Firestore Console → coleção `users` → o documento com o `uid` recém-criado:

```
level  →  admin_master
status →  ativo
```

> **Este é o único passo manual do processo, e é intencional.** Não existe caminho no aplicativo
> para criar o primeiro administrador — se existisse, seria também o caminho para qualquer pessoa
> virar administrador. O console usa o Admin SDK, que passa por cima das rules por definição, e é
> justamente por isso que ele é o lugar certo para o bootstrap.

### 6. Conferir que fechou

Abra o site em uma janela anônima, sem fazer login. Nenhum dado de frota pode aparecer. Se aparecer,
as rules não foram publicadas.

---

## Se o cadastro falhar

| Mensagem na tela                                          | Causa                                                              | O que fazer                                                            |
| --------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| "As regras de segurança do banco recusaram o cadastro"    | Rules ainda não publicadas — o passo 3 não aconteceu               | `firebase deploy --only firestore:rules`                               |
| "Login por e-mail e senha não está habilitado no projeto" | Provedor desligado no console                                      | Passo 1                                                                |
| "Já existe uma conta com este e-mail"                     | Conta órfã de uma tentativa anterior que não conseguiu se desfazer | Entrar com ela: a tela **Concluir cadastro** grava o perfil que faltou |
| "Sem conexão com o banco de dados"                        | Rede, ou variáveis do Firebase ausentes no Netlify                 | Conferir as `NEXT_PUBLIC_FIREBASE_*`                                   |

Para ver o erro cru, abra o console do navegador (F12) na aba **Console** — o código original é
registrado ali antes de virar mensagem amigável.

> **Sobre a conta órfã.** O cadastro toca dois serviços: cria a conta no Auth e grava o perfil no
> Firestore, sem transação entre os dois. Há duas defesas para isso agora:
>
> 1. Quando a segunda etapa falha, a conta recém-criada é apagada, para que a pessoa possa repetir o
>    cadastro do zero.
> 2. Se mesmo assim sobrar uma conta sem perfil — porque a limpeza também falhou, ou porque a aba
>    foi fechada no meio —, basta **entrar com ela**: a tela **Concluir cadastro** pede os dados
>    declarados e grava o perfil que faltou.
>
> A segunda existe porque a primeira não é garantida. Antes das duas, a única saída era um
> administrador apagar a conta no console — e a tela mostrada ao usuário só tinha "Sair", que levava
> de volta ao mesmo lugar.

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
