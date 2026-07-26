# Requisitos v2 — Acesso, Fórum, Checklist, Administração e Segurança

> Captura dos requisitos da segunda fase, com as decisões de projeto que eles obrigam, as tensões
> encontradas e os pontos que ainda dependem de definição. Companheiros:
> [`ARQUITETURA.md`](./ARQUITETURA.md) · [`MODELO_DADOS.md`](./MODELO_DADOS.md) ·
> [`RBAC_AUDITORIA.md`](./RBAC_AUDITORIA.md) · [`HOSPEDAGEM.md`](./HOSPEDAGEM.md) ·
> [`ROADMAP.md`](./ROADMAP.md)

---

## 0. A consequência que atravessa tudo

Os requisitos desta fase **encerram o modelo estático**.

Token de segurança, expiração de senha em 45 dias, _force update key_, exclusão e bloqueio de
usuário, mensagem privada com regra por papel — nada disso pode ser decidido no navegador. Um
`output: "export"` entrega HTML e JavaScript; qualquer segredo colocado ali é público por
construção. É exatamente o erro do PIN em `NEXT_PUBLIC_ADMIN_PIN_*` que já corrigimos, e repeti-lo
em escala maior seria pior.

**Isso não significa abandonar o Netlify.** As Cloud Functions são esse servidor, e o front continua
estático na CDN. A análise completa está em [`HOSPEDAGEM.md`](./HOSPEDAGEM.md).

O que muda: a partir daqui, **toda operação privilegiada é uma chamada a uma Function**, nunca uma
escrita direta do cliente no Firestore.

---

## 1. Cadastro e primeiro acesso

### 1.1 O requisito

Qualquer colaborador pode se cadastrar pelo próprio celular no primeiro acesso, informando:

| Campo               | Observação                          |
| ------------------- | ----------------------------------- |
| Nome completo       | —                                   |
| Gerência            | vínculo com a árvore organizacional |
| Coordenador         | vínculo com a árvore organizacional |
| Gestor / staff      | responsável hierárquico             |
| Função              | cargo exercido                      |
| Empresa             | própria ou terceira                 |
| E-mail corporativo  | identificador de login              |
| RAC02               | precisa estar válido no SGC         |
| ID crachá           | identificação física                |
| Cadastro no Prontos | confirmação de registro             |
| Usuário e senha     | validados por token de segurança    |

### 1.2 A tensão, e como ela se resolve

"Todos podem se cadastrar" e "acesso restrito" se contradizem se lidos ao pé da letra: cadastro
aberto num sistema corporativo de frota significa que qualquer pessoa com o endereço cria uma conta
e enxerga placas, condutores, rotas e localizações.

**Decisão adotada.** O autocadastro cria uma conta em estado `pendente`, **sem nenhum privilégio e
sem acesso a dado nenhum**. A conta só passa a existir para efeitos práticos quando um administrador
ou operador **da mesma área** a aprova, atribuindo papel e escopo.

Isso não é burocracia acrescentada — é precisamente onde entram RAC02, Prontos e CRM. Como esses
sistemas não serão integrados por API (decisão registrada em §1.3), **a validação é humana**, feita
por quem tem competência para isso, e fica registrada com autor, data e o que foi conferido.

O fluxo, então:

```
1. Colaborador preenche o cadastro no celular          → conta `pendente`, sem acesso
2. Cai na fila de aprovação da área informada           → notifica admins/operadores do escopo
3. Admin ou operador confere RAC02, Prontos, crachá     → registra quem validou e quando
4. Aprovação atribui papel + escopo                     → custom claims, conta ativa
5. Primeiro login exige cadastrar o token (TOTP)        → só então há acesso real
```

Rejeição também é registrada, com motivo. Uma fila de aprovação sem trilha de rejeição esconde
justamente os casos que interessam à auditoria.

### 1.3 Integração com SGC, Prontos e CRM

**Decidido: não haverá integração automática.** Os dados são declarados pelo colaborador e
**validados por administrador ou operador** dentro do sistema.

Consequências, que são boas:

- Nenhuma credencial de sistema corporativo precisa existir na plataforma — some uma superfície de
  ataque inteira.
- Não há dependência de rede interna nem de IP fixo liberado em firewall, que era o único fator que
  **obrigaria** a VPS nesta fase.
- Em compensação, a plataforma passa a ser responsável por deixar a validação auditável: quem
  validou, quando, e qual valor foi conferido. Se um RAC02 vencido passar, a trilha mostra quem
  aprovou.

Campos como `rac02.validadeDeclarada` recebem alerta automático de vencimento, mesmo sem integração:
a plataforma não sabe consultar o SGC, mas sabe contar dias.

---

## 2. Fórum e mensagens

### 2.1 Escopo das conversas

Mensagens circulam **apenas entre integrantes da mesma área**. Cada área é definida por três
vínculos, que passam a ser obrigatórios no cadastro da unidade organizacional:

- **Gerência Regional** — com nome do líder
- **Coordenação Local** — com nome do líder
- **Área de registro da frota** — no caso atual, `Infratech-No`

### 2.2 Permissões

| Ação                        | Regra                                               |
| --------------------------- | --------------------------------------------------- |
| Enviar mensagem no fórum    | todos, dentro da própria área                       |
| Editar a própria mensagem   | todos (mantém histórico de edição)                  |
| Apagar a própria mensagem   | todos                                               |
| Apagar mensagem de terceiro | somente administrador                               |
| Autoria                     | preenchida automaticamente pelo usuário autenticado |

O autor **nunca** é digitado. Hoje `ForumPage` pede o nome do autor num campo de texto livre, o que
significa que qualquer pessoa pode assinar como qualquer outra — inaceitável num sistema com
auditoria. Passa a vir do token.

### 2.3 Mensagem privada — o grafo permitido

| De → Para     | Condutor | Operador | Administrador |
| ------------- | :------: | :------: | :-----------: |
| Condutor      |    ✗     |    ✓     |       ✗       |
| Operador      |    ✓     |    ✓     |       ✓       |
| Administrador |    ✓     |    ✓     |       ✓       |

Condutor fala apenas com operador. Operador e administrador falam com todos.

> **Ponto em aberto que precisa de decisão.** A regra cria um beco sem saída: se um condutor precisa
> reportar algo grave e nenhum operador está disponível, ele não tem caminho até o administrador.
> Numa operação com risco de segurança envolvido, isso é um problema real, não teórico.
>
> Sugestão a avaliar: manter a proibição de **conversa livre** condutor→administrador, mas criar um
> canal de **ocorrência/escalonamento** — um formulário que chega a todos os administradores da
> área, sem virar um chat. Preserva a intenção da regra (não sobrecarregar a administração com
> conversa paralela) sem deixar o condutor sem saída.

### 2.4 Sincronização e notificação

- Mensagens sincronizam entre usuários em tempo real (`onSnapshot` do Firestore).
- Ícone de mensagens na barra superior, com contador de não lidas.
- Pop-up de novas mensagens **ativado por padrão**, desativável nas configurações do usuário.

> Ativado por padrão é o pedido, e faz sentido para avisos operacionais. Vale registrar que
> notificação intrusiva por padrão tende a ser desligada em massa quando o volume cresce — o que
> derruba justamente o aviso importante. Mitigação recomendada: separar **alerta** de
> **informativo** e permitir silenciar só a segunda categoria, em vez de tudo.

---

## 3. Checklist de retirada

| Requisito                    | Como fica                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------- |
| Dados do usuário automáticos | vêm do perfil autenticado; o condutor não digita o próprio nome               |
| Prontos executado            | confirmação obrigatória de execução e liberação para a atividade              |
| Aptidão sem liberação        | exige justificativa registrada **pelo gestor**, não pelo próprio condutor     |
| CRM realizado                | confirmação obrigatória                                                       |
| Criação de novos itens       | mantida a área existente de composição do checklist                           |
| Obrigatoriedade              | **todos os itens obrigatórios por padrão**; só o administrador pode desmarcar |

A inversão do padrão é a mudança relevante: hoje `ChecklistField.required` é um campo qualquer;
passa a nascer `true` e a exigir ação administrativa consciente para deixar de ser obrigatório. Cada
alteração de obrigatoriedade gera registro de auditoria — é uma decisão sobre segurança operacional,
não uma preferência de tela.

A justificativa de aptidão precisa da assinatura de quem tem autoridade: se o próprio condutor
pudesse justificar a si mesmo, o controle não existiria.

---

## 4. Administração

| Requisito          | Como fica                                                                     |
| ------------------ | ----------------------------------------------------------------------------- |
| Acesso restrito    | conta com token obrigatório, sem exceção                                      |
| Alcance dos dados  | **apenas a própria área** — o escopo já implementado na árvore organizacional |
| Desktop responsivo | painel administrativo pensado para tela grande, com tabelas densas            |
| Gestão de usuários | excluir, bloquear, criar, editar, forçar troca de senha, mensagem individual  |

"Controle total dos dados apenas de sua área" é exatamente a função `inScope()` já desenhada em
[`RBAC_AUDITORIA.md`](./RBAC_AUDITORIA.md) §3. Nada de novo é necessário no modelo de autorização —
o que muda é a superfície de administração construída sobre ele.

Sobre "excluir usuário": a exclusão é **lógica**, nunca física. Movimentações, mensagens e registros
de auditoria apontam para o usuário; apagar a conta transformaria o histórico em referência
quebrada. O usuário é desativado, perde acesso imediatamente, e o histórico continua íntegro.

---

## 5. Segurança

### 5.1 Camadas de acesso

Combinando o pedido com a estrutura já documentada: **três níveis de privilégio × escopo
organizacional**, mais `auditor` à parte.

| Nível          | Nome no pedido | Faz                                                           |
| -------------- | -------------- | ------------------------------------------------------------- |
| `usuario`      | editor         | Opera o que lhe cabe: retirada, devolução, mensagens          |
| `operador`     | curador        | Opera, valida cadastros, aprova, modera o fórum da área       |
| `admin`        | full           | Administra a própria área por inteiro                         |
| `admin_master` | master         | Cria administradores e operadores, dispara _force update key_ |
| `auditor`      | —              | Somente leitura, incluindo a trilha de auditoria              |

O escopo continua ortogonal: o nível diz **o que** a pessoa pode fazer, o escopo diz **sobre qual
pedaço da árvore**. Um `admin` de Carajás e um `admin` de Vitória têm o mesmo poder e nenhum acesso
ao setor do outro.

`auditor` permanece separado porque auditar exigindo poder de administrar anula o propósito do
papel.

### 5.2 Token de segurança — recomendação

O pedido foi pela melhor opção **sem custo**. A resposta é **TOTP** (código de 6 dígitos em app
autenticador), e há duas formas de obtê-lo:

| Caminho                                 | Custo                                     | Quem responde pela segurança |
| --------------------------------------- | ----------------------------------------- | ---------------------------- |
| Firebase MFA nativo (Identity Platform) | **pago** — MFA não está no plano gratuito | Google                       |
| TOTP próprio em Cloud Function          | apenas invocações da Function             | nós                          |

**Recomendado para atender ao "sem custo": TOTP implementado em Cloud Function**, com a biblioteca
`otplib`. O algoritmo é padronizado (RFC 6238) e maduro; o que precisa de cuidado é o entorno:

- segredo TOTP **cifrado** em repouso (Cloud KMS), nunca em claro no Firestore;
- limite de tentativas com bloqueio progressivo — sem isso, 6 dígitos são força bruta trivial;
- proteção contra replay: um código usado não vale de novo dentro da mesma janela;
- códigos de recuperação de uso único, para celular perdido;
- verificação **sempre no servidor**. Validar TOTP no cliente é o mesmo que não ter TOTP.

TOTP funciona **offline**, o que é decisivo aqui: em mina, pátio e estrada, SMS e e-mail dependem de
sinal que frequentemente não existe. Esse é o argumento técnico, independente de custo.

> **Registro honesto de trade-off.** Implementar MFA por conta própria é assumir a responsabilidade
> por ela. O Identity Platform custa a partir de valores baixos e transfere esse risco ao Google.
> Para um sistema corporativo com dado pessoal e auditoria, vale reavaliar quando houver orçamento —
> a economia aqui é pequena e o risco assumido não é.

### 5.3 Rotação de senha a cada 45 dias

Implementado como pedido, para usuários comuns e operadores: `passwordUpdatedAt` no perfil, Function
agendada que marca `mustChangePassword`, e bloqueio de qualquer operação até a troca.

> **Contraponto técnico que precisa ser dito.** A recomendação atual do NIST (SP 800-63B) é
> **contra** expiração periódica arbitrária de senha. O efeito observado é o oposto do pretendido:
> as pessoas passam a criar senhas mais fracas e previsíveis (`Senha@01`, `Senha@02`) porque
> precisam decorá-las de novo a cada ciclo. A orientação moderna é trocar a senha **quando houver
> indício de comprometimento**, e compensar com segundo fator — que aqui já teremos.
>
> Fica implementado porque foi pedido e porque política corporativa costuma exigir. Recomendo levar
> o ponto à área de segurança: com TOTP obrigatório, o ganho dos 45 dias é discutível e o custo em
> qualidade de senha é real.

### 5.4 Force update key

O administrador master invalida todas as sessões de uma vez.

Implementação eficiente: um documento único `config/security` com `sessionEpoch`. As Security Rules
comparam o `auth_time` do token com esse valor; qualquer token emitido antes é recusado. Uma escrita
derruba todo mundo, sem precisar percorrer usuário por usuário.

Para revogação individual (desligamento, suspeita), `revokeRefreshTokens(uid)` continua sendo o
caminho.

### 5.5 Atualizações do aplicativo

| Tipo           | Comportamento                                 |
| -------------- | --------------------------------------------- |
| Funcionalidade | Apresentada no login com **aceitar ou adiar** |
| Segurança      | Aplicada **automaticamente**, sem pergunta    |

> **Detalhe que o requisito não resolve e precisa ser decidido.** Sendo um PWA, quando a tela de
> atualização aparece o service worker **já baixou** a versão nova. "Negar" só pode significar
> "continuar nesta sessão com a versão em cache" — não existe desinstalar a atualização.
>
> Além disso, permitir adiar indefinidamente cria frota de versões diferentes conversando com o
> mesmo banco, que é origem clássica de bug difícil de reproduzir.
>
> Proposta: cada versão publicada carrega uma marca `obrigatoria`. Atualização comum pode ser adiada
> por um número limitado de sessões; atualização de segurança ignora a pergunta e aplica na hora,
> como o próprio requisito já determina.

---

## 6. Pontos em aberto

Registrados aqui para não se perderem. Nenhum bloqueia o início da implementação.

1. **Escalonamento do condutor** (§2.3) — canal de ocorrência para administrador, ou manter o beco
   sem saída?
2. **Adiar atualização** (§5.5) — quantas sessões antes de forçar?
3. **Domínio de e-mail corporativo** — restringir o cadastro a domínios conhecidos reduz muito a
   fila de aprovação. Quais domínios valem?
4. **Empresas terceiras** — colaborador de terceira usa e-mail da própria empresa? Isso afeta a
   regra do item 3.
5. **Quem aprova quem** — operador pode aprovar cadastro de operador, ou só de usuário comum? A
   invariante "ninguém concede papel igual ou superior ao seu" sugere que não.
6. **Retenção de mensagens** — mensagens de fórum entram na política de retenção de 5 anos da
   auditoria ou têm prazo próprio?
