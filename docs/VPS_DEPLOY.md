# Deploy na VPS — techartsolucoes.com.br

> Migração da hospedagem estática do Netlify para VPS própria com domínio. O Netlify continua no ar
> como ambiente de desenvolvimento.
>
> Servidor: `srv1790854.hstgr.cloud` · `187.127.28.74` · Ubuntu LTS Produção:
> <https://techartsolucoes.com.br> Desenvolvimento: <https://frota-infratech-dev.netlify.app>

---

## 1. O que está mudando, e o que não está

**Muda só onde os arquivos são servidos.** O app é um export estático — não há runtime Node em
produção, nem servidor de aplicação. Sai a CDN do Netlify, entra o Nginx.

**Não muda o Firebase.** Auth e Firestore continuam onde estão, acessados direto do navegador. A VPS
não é backend de nada.

```
Antes                            Depois
─────                            ──────
Netlify CDN ──┐                  Nginx (VPS) ──┐
              ├──► Firebase                    ├──► Firebase
              │    Auth + Firestore            │    Auth + Firestore
```

> Vale registrar: a análise em [`HOSPEDAGEM.md`](./HOSPEDAGEM.md) concluiu que nenhum gatilho
> técnico exigia a migração agora. A decisão é de domínio próprio e controle, e é legítima — mas o
> custo real dela não é a mensalidade, é a operação: patch de sistema, renovação de certificado,
> backup e resposta a incidente passam a ser da equipe.

---

## 2. Ordem de execução

### Passo 1 — DNS

Antes de qualquer coisa no servidor, aponte o domínio:

| Tipo | Nome  | Valor           |
| ---- | ----- | --------------- |
| A    | `@`   | `187.127.28.74` |
| A    | `www` | `187.127.28.74` |

O provisionamento confere isso antes de pedir o certificado. Cada tentativa falha do Let's Encrypt
conta para o limite de emissão, então conferir antes não é zelo excessivo — é evitar ficar bloqueado
por uma hora.

### Passo 2 — Provisionar

```bash
ssh root@187.127.28.74

curl -fsSL https://raw.githubusercontent.com/mantoky/frota-infratech/master/deploy/provision.sh -o provision.sh
bash provision.sh
```

Instala Nginx, Node 20, git e certbot; cria o usuário `frota` sem privilégio; clona o repositório;
configura o firewall; emite o certificado TLS.

É idempotente — rodar de novo não quebra nada.

### Passo 3 — Variáveis do Firebase

```bash
nano /srv/frota/app/.env.local
```

Os mesmos sete valores que estão no Netlify, em **Site configuration → Environment variables**.

São embutidas no bundle em tempo de build, então precisam existir **antes** de publicar. A
publicação recusa rodar se o arquivo ainda tiver os valores de exemplo.

### Passo 4 — Autorizar o domínio no Firebase

**Firebase Console → Authentication → Settings → Authorized domains → Add domain →
`techartsolucoes.com.br`**

> **Este é o passo que mais provavelmente vai ser esquecido, e ele quebra o login por completo.** O
> Firebase Auth só aceita requisição vinda de domínios autorizados; de qualquer outro, o login falha
> com `auth/unauthorized-domain`. O app carrega normalmente, a tela aparece, e a autenticação
> simplesmente não funciona — o que leva a procurar o problema no lugar errado.

### Passo 5 — Publicar

```bash
sudo -u frota bash /srv/frota/app/deploy/publish.sh
```

Traz o código, instala, constrói, publica numa release nova e troca o link ativo. A cada nova
versão, basta repetir este comando.

### Passo 6 — Conferir

- <https://techartsolucoes.com.br> abre com cadeado válido
- Login funciona (se não, quase certamente é o passo 4)
- Aba anônima sem login não mostra nenhum dado de frota
- No DevTools → Application → Service Workers, o `sw.js` registra sem erro

---

## 3. Decisões de implementação

### Troca atômica por symlink

`next build` apaga e reescreve o `out/` inteiro. Se o Nginx apontasse diretamente para lá, durante
alguns segundos o site serviria um build pela metade — HTML novo pedindo asset que ainda não existe.

Cada publicação cria `releases/AAAAMMDD-HHMMSS-commit/` e só então move o symlink `current`. O site
nunca fica inconsistente, e o rollback é trocar o ponteiro de volta.

```
/srv/frota/
├── app/                    repositório e build
├── releases/
│   ├── 20260726-193000-414c31e/
│   └── 20260726-201500-6dcb99c/
└── current -> releases/20260726-201500-6dcb99c
```

### `sw.js` nunca é cacheado

O navegador cacheia o service worker por padrão. Se o Nginx não disser o contrário, uma versão nova
pode nunca chegar: o worker antigo continua ativo servindo o cache velho, e o usuário fica preso
numa versão que já não existe.

O bloco `location = /sw.js` com `no-store` é o que garante que cada publicação seja efetivamente
entregue. Em compensação, tudo em `/_next/static/` tem hash no nome e pode ser cacheado por um ano
com segurança.

### Geolocalização precisa ser liberada explicitamente

O `Permissions-Policy` do Nginx traz `geolocation=(self)`. Um cabeçalho de negação por padrão — que
é o que muitos guias recomendam — quebraria a captura de GPS na retirada e devolução
**silenciosamente**: o fluxo continuaria funcionando, só que sem coordenada nenhuma, e ninguém
perceberia até auditar.

### Nada roda como root

Build e arquivos publicados pertencem ao usuário `frota`. Se houver falha numa dependência de build,
o alcance fica contido em `/srv/frota`.

---

## 4. Rollback

```bash
ls -1dt /srv/frota/releases/*/          # releases, da mais nova para a mais antiga
sudo -u frota ln -sfn /srv/frota/releases/<anterior> /srv/frota/current.novo
sudo -u frota mv -Tf /srv/frota/current.novo /srv/frota/current
```

Efeito imediato, sem rebuild. As cinco últimas releases ficam guardadas.

---

## 5. Diagnóstico

| Sintoma                                        | Causa provável                                         | Verificação                                                                         |
| ---------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `auth/unauthorized-domain` no login            | Domínio não autorizado no Firebase                     | Passo 4                                                                             |
| Site abre, mas sem dados e com erro no console | `.env.local` vazio ou build feito antes de preenchê-lo | `grep FIREBASE /srv/frota/app/.env.local` e republicar                              |
| Certificado inválido                           | Certbot não rodou ou DNS não apontava                  | `certbot certificates`                                                              |
| Versão antiga persiste no celular              | Service worker preso                                   | DevTools → Application → Service Workers → Unregister; conferir o header de `sw.js` |
| 404 em rota que não seja a raiz                | `try_files` fora do ar                                 | `nginx -t` e conferir o bloco `location /`                                          |
| Publicação recusa rodar                        | `.env.local` com valores de exemplo                    | Passo 3                                                                             |

Logs:

```bash
tail -f /var/log/nginx/access.log /var/log/nginx/error.log
systemctl status nginx
```

---

## 6. Operação recorrente

| Tarefa               | Como                                                                         |
| -------------------- | ---------------------------------------------------------------------------- |
| Publicar nova versão | `sudo -u frota bash /srv/frota/app/deploy/publish.sh`                        |
| Renovar certificado  | Automático via `certbot.timer`. Conferir com `systemctl list-timers certbot` |
| Atualizar o sistema  | `apt update && apt upgrade` — vale um calendário mensal                      |
| Conferir o firewall  | `ufw status numbered`                                                        |

### O que ainda falta

Itens que a migração torna responsabilidade nossa e que **não** estão resolvidos por estes scripts:

- **Backup.** O Firestore continua no Google, mas a configuração da VPS não tem cópia. Um `tar` do
  `/etc/nginx` e do `.env.local` guardado fora do servidor resolve o essencial. Backup não testado
  não é backup.
- **Monitoramento.** Ninguém é avisado se o site cair ou se o certificado vencer. Um verificador
  externo de disponibilidade cobre os dois.
- **Endurecimento do SSH.** Hoje o acesso é `root` com senha ou chave. O recomendado é desabilitar
  login de root e autenticação por senha — mas isso precisa ser feito com uma segunda sessão aberta,
  sob risco de perder o acesso.
- **Deploy pelo CI.** O `ci.yml` já está verde e poderia publicar por SSH a cada push. Exige guardar
  uma chave de deploy nos secrets do repositório.
