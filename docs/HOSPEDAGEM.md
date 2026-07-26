# Hospedagem — Netlify e VPS

> Conclusão técnica sobre onde a plataforma roda em cada fase, o que é testável em cada lugar, e os
> gatilhos objetivos que disparam a migração. Complementa [`ARQUITETURA.md`](./ARQUITETURA.md) e
> [`REQUISITOS_V2.md`](./REQUISITOS_V2.md).

> **Situação atual — a migração foi decidida antes de qualquer gatilho técnico.**
>
> A análise abaixo continua válida e concluía que nada obrigava a sair do Netlify agora. A decisão
> de subir para VPS própria em `techartsolucoes.com.br` foi tomada por domínio próprio e controle, e
> é legítima — o §4 lista necessidades, não proibições.
>
> O que ela custa está no §5.4 e vale repetir: a conta de infraestrutura é a parte barata. Patch de
> sistema, renovação de certificado, backup e resposta a incidente passam a ser trabalho da equipe.
>
> **Execução em [`VPS_DEPLOY.md`](./VPS_DEPLOY.md).** Os dois ambientes convivem:
>
> | Ambiente        | Endereço                                  | Hospedagem   |
> | --------------- | ----------------------------------------- | ------------ |
> | Produção        | <https://techartsolucoes.com.br>          | Nginx na VPS |
> | Desenvolvimento | <https://frota-infratech-dev.netlify.app> | Netlify      |

---

## 1. A pergunta que decide, e a resposta

A dúvida era: dá para testar a fase v2 ainda no Netlify, ou é preciso subir para a VPS antes?

**O fator decisivo era um só** — se SGC, Prontos e CRM só fossem alcançáveis de dentro da rede
corporativa ou exigissem IP fixo liberado em firewall. Cloud Functions têm IP de saída dinâmico;
fixá-lo exige VPC connector com Cloud NAT, e nem isso resolve exigência de rede interna.

**Ficou decidido que não haverá integração automática.** Os dados de RAC02, Prontos e CRM são
declarados pelo colaborador e **validados por administrador ou operador** dentro da plataforma (ver
[`REQUISITOS_V2.md`](./REQUISITOS_V2.md) §1.3).

Com isso, o único motivo que **obrigaria** a VPS nesta fase deixou de existir.

**Conclusão: seguir no Netlify agora. Migrar quando um gatilho do §4 for atingido.**

---

## 2. O que muda, mesmo ficando no Netlify

Os requisitos v2 encerram o modelo puramente estático — mas isso não é sobre hospedagem, é sobre
onde a decisão de segurança acontece.

Token, expiração de senha, _force update key_, exclusão de usuário e regra de mensagem privada não
podem ser decididos no navegador. Um bundle estático é público por construção; qualquer segredo ali
é legível. É o mesmo erro do PIN em `NEXT_PUBLIC_ADMIN_PIN_*` que já corrigimos.

A solução **não** é um servidor de aplicação. É mover essas decisões para **Cloud Functions**, que
são o servidor — e que funcionam perfeitamente com o front estático servido pela CDN do Netlify.

```
Netlify CDN                    Firebase
┌──────────────────┐          ┌────────────────────────────────┐
│ PWA estático     │─ leitura →│ Firestore (governado por rules)│
│ next export      │          ├────────────────────────────────┤
│ Auth SDK         │─ escrita →│ Cloud Functions                │
│                  │  privileg.│ · approveUser  · verifyTotp    │
└──────────────────┘          │ · openThread   · forceUpdateKey│
                              └────────────────────────────────┘
```

O `output: "export"` continua válido. Nenhuma linha do `netlify.toml` precisa mudar.

---

## 3. O que é testável em cada lugar

| Bloco da v2                           | Netlify + Firebase | Precisa de VPS |
| ------------------------------------- | :----------------: | :------------: |
| Autocadastro e fila de aprovação      |         ✓          |       —        |
| Validação humana de RAC02/Prontos     |         ✓          |       —        |
| TOTP em Cloud Function                |         ✓          |       —        |
| Expiração de senha em 45 dias         |         ✓          |       —        |
| Force update key                      |         ✓          |       —        |
| Fórum por área, com autoria do token  |         ✓          |       —        |
| Mensagem privada com grafo por nível  |         ✓          |       —        |
| Sincronização em tempo real           |         ✓          |       —        |
| Pop-up e contador de não lidas        |         ✓          |       —        |
| Checklist obrigatório e justificativa |         ✓          |       —        |
| Painel administrativo responsivo      |         ✓          |       —        |
| Aceite de atualização no login        |         ✓          |       —        |
| Auditoria por setor                   |         ✓          |       —        |
| Integração com SGC/Prontos por API    |         ✗          |       ✓        |
| Rede interna ou IP fixo allowlistado  |         ✗          |       ✓        |
| Banco próprio fora da nuvem Google    |         ✗          |       ✓        |

**Nada da v2 está bloqueado.** Toda a lista aprovada é implementável e testável no arranjo atual.

---

## 4. Gatilhos objetivos para migrar

A migração deixa de ser preferência e vira necessidade quando **qualquer um** destes ocorrer:

1. **Integração com sistema corporativo** que exija rede interna ou IP fixo em allowlist.
2. **Política de residência de dados** que proíba dado pessoal fora de infraestrutura própria.
3. **Exigência de domínio corporativo** com certificado emitido pela AC interna da empresa.
4. **Custo do Firebase** ultrapassando o de uma VPS equivalente com folga — improvável na escala
   atual (~150 usuários), possível em outra ordem de grandeza.
5. **Decisão de arquitetura** de sair do Firestore para um banco relacional.

Enquanto nenhum for atingido, migrar é assumir responsabilidade por sistema operacional,
certificado, backup, monitoramento e disponibilidade **sem ganho correspondente**.

---

## 5. Plano de migração, quando for a hora

Escrito agora, enquanto o contexto está fresco. Não precisa ser executado agora.

### 5.1 Topologia alvo

```
Internet
   │
   ├── dominio.com.br ──────► VPS (Nginx + TLS)
   │                            ├── Next.js em modo servidor (systemd) ou estático
   │                            └── API Node/NestJS ─┐
   │                                                  │
   └── (opcional) CDN na frente                       ▼
                                          PostgreSQL / Firestore
```

### 5.2 Passos

| #   | Passo                                           | Observação                             |
| --- | ----------------------------------------------- | -------------------------------------- |
| 1   | Provisionar VPS (2 vCPU / 4 GB para começar)    | Ubuntu LTS                             |
| 2   | DNS do domínio apontando para o IP              | registro A + AAAA                      |
| 3   | Nginx como proxy reverso + TLS Let's Encrypt    | renovação automática via certbot       |
| 4   | Deploy por CI: o mesmo `ci.yml` publica via SSH | reaproveita a pipeline já verde        |
| 5   | Firewall: 22 (restrito), 80, 443 apenas         | UFW ou nftables                        |
| 6   | Backup automatizado com restauração testada     | backup não testado não é backup        |
| 7   | Monitoramento de disponibilidade e certificado  | alerta antes do vencimento, não depois |
| 8   | Corte de DNS com TTL baixo, e rollback pronto   | reduzir TTL 24h antes                  |

### 5.3 O que sai do `output: "export"`

Se a VPS for adotada, `next.config.ts` pode passar a `output: "standalone"` e o app ganha rotas de
API próprias. **Isso é opcional**, não consequência automática: manter o export estático servido
pelo Nginx continua sendo válido e mais simples de operar.

### 5.4 Custos comparados (ordem de grandeza, ~150 usuários)

| Item                        | Netlify + Firebase | VPS própria            |
| --------------------------- | ------------------ | ---------------------- |
| Hospedagem                  | US$ 0–19/mês       | R$ 50–150/mês          |
| Banco e autenticação        | US$ 55–190/mês     | incluso na VPS         |
| Certificado TLS             | incluso            | grátis (Let's Encrypt) |
| **Operação (o custo real)** | ~zero              | horas de trabalho      |

A linha que decide não é a de infraestrutura, é a última. Uma VPS transfere para a equipe patch de
sistema operacional, rotação de certificado, backup, monitoramento e resposta a incidente — trabalho
recorrente que não aparece na fatura mas aparece na madrugada.

---

## 6. Recomendação em uma linha

Construir e validar toda a v2 no Netlify + Firebase; provisionar a VPS quando um gatilho do §4 for
atingido, com este plano em mãos e sem pressa de release.
