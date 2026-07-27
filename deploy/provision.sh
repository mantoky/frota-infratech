#!/usr/bin/env bash
#
# Provisionamento da VPS — Frota Infratech
#
# Roda UMA VEZ, como root, numa Ubuntu LTS limpa. E idempotente: repetir nao
# quebra nada, so reaplica o que ja estava certo.
#
#   ssh root@187.127.28.74
#   curl -fsSL https://raw.githubusercontent.com/mantoky/frota-infratech/master/deploy/provision.sh -o provision.sh
#   bash provision.sh
#
# O que faz:
#   - instala Nginx, Node 20, git, certbot e firewall
#   - cria um usuario sem privilegio para a aplicacao (nada roda como root)
#   - clona o repositorio e prepara o esqueleto de releases
#   - configura o Nginx e emite o certificado TLS
#
# O que NAO faz: o build. Depois deste script e preciso preencher o
# `.env.local` e rodar `deploy/publish.sh` — o build sem as variaveis do
# Firebase geraria um app que nao conecta em lugar nenhum.

set -euo pipefail

DOMAIN="techartsolucoes.com.br"
DOMAIN_WWW="www.${DOMAIN}"
REPO="https://github.com/mantoky/frota-infratech.git"
BRANCH="master"

APP_USER="frota"
BASE_DIR="/srv/frota"
APP_DIR="${BASE_DIR}/app"
RELEASES_DIR="${BASE_DIR}/releases"
CURRENT_LINK="${BASE_DIR}/current"

log()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m !  %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m x  %s\033[0m\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "Rode como root: sudo bash $0"

# ---------------------------------------------------------------------------
log "Pacotes base"
# ---------------------------------------------------------------------------
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
  nginx git curl ca-certificates ufw rsync \
  certbot python3-certbot-nginx

# ---------------------------------------------------------------------------
log "Node.js 20 LTS"
# ---------------------------------------------------------------------------
# O projeto declara NODE_VERSION=20 no netlify.toml e o CI usa a mesma. Manter
# a versao igual nos tres lugares evita a classe de bug que so aparece em
# producao porque a versao de runtime era outra.
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -c2-3)" != "20" ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi
log "Node $(node -v) / npm $(npm -v)"

# ---------------------------------------------------------------------------
log "Usuario de aplicacao"
# ---------------------------------------------------------------------------
# Build e arquivos publicados nao rodam como root. Se um dia houver falha de
# seguranca no processo de build ou numa dependencia, o estrago fica contido
# num usuario que so enxerga /srv/frota.
if ! id -u "$APP_USER" >/dev/null 2>&1; then
  useradd --system --create-home --home-dir "/home/${APP_USER}" --shell /bin/bash "$APP_USER"
fi

mkdir -p "$APP_DIR" "$RELEASES_DIR"
chown -R "${APP_USER}:${APP_USER}" "$BASE_DIR"

# ---------------------------------------------------------------------------
log "Repositorio"
# ---------------------------------------------------------------------------
if [[ -d "${APP_DIR}/.git" ]]; then
  sudo -u "$APP_USER" git -C "$APP_DIR" remote set-url origin "$REPO"
  sudo -u "$APP_USER" git -C "$APP_DIR" fetch --depth 1 origin "$BRANCH"
  sudo -u "$APP_USER" git -C "$APP_DIR" reset --hard "origin/${BRANCH}"
else
  sudo -u "$APP_USER" git clone --depth 1 --branch "$BRANCH" "$REPO" "$APP_DIR"
fi

# ---------------------------------------------------------------------------
log "Variaveis de ambiente"
# ---------------------------------------------------------------------------
ENV_FILE="${APP_DIR}/.env.local"
if [[ ! -f "$ENV_FILE" ]]; then
  sudo -u "$APP_USER" cp "${APP_DIR}/.env.example" "$ENV_FILE"
  warn "Criado ${ENV_FILE} a partir do exemplo — PRECISA ser preenchido."
fi
# 0600: as chaves do Firebase sao NEXT_PUBLIC (vao para o bundle de qualquer
# forma), mas o arquivo nao tem por que ser legivel por outros usuarios do
# sistema. Custa nada e evita habito ruim quando entrar segredo de verdade.
chmod 600 "$ENV_FILE"
chown "${APP_USER}:${APP_USER}" "$ENV_FILE"

# ---------------------------------------------------------------------------
log "Release inicial (placeholder)"
# ---------------------------------------------------------------------------
# O Nginx precisa de um `current` valido para subir. Sem isto, o teste de
# configuracao passa mas o site responde 404 ate o primeiro publish.
if [[ ! -e "$CURRENT_LINK" ]]; then
  BOOT="${RELEASES_DIR}/0000-provision"
  sudo -u "$APP_USER" mkdir -p "$BOOT"
  echo '<!doctype html><meta charset="utf-8"><title>Frota Infratech</title><p>Servidor provisionado. Aguardando primeira publicação.' \
    | sudo -u "$APP_USER" tee "${BOOT}/index.html" >/dev/null
  sudo -u "$APP_USER" ln -sfn "$BOOT" "$CURRENT_LINK"
fi

# O Nginx roda como www-data e precisa atravessar /srv/frota ate os arquivos.
chmod 755 "$BASE_DIR" "$RELEASES_DIR"

# ---------------------------------------------------------------------------
log "Nginx"
# ---------------------------------------------------------------------------
# Um site pre-existente com o mesmo server_name faz o Nginx IGNORAR o nosso —
# e apenas como aviso, nao erro. `nginx -t` continua dizendo "successful", o
# script seguiria feliz, e o dominio ficaria servindo o site antigo. Foi
# exatamente o que aconteceu na primeira execucao numa VPS que nao estava
# limpa. Detectar antes de instalar evita o diagnostico confuso depois.
CONFLITO="$(grep -rl --include='*' -E "server_name[^;]*\b${DOMAIN//./\\.}\b" \
  /etc/nginx/sites-enabled/ 2>/dev/null | grep -v 'frota.conf' || true)"

if [[ -n "$CONFLITO" ]]; then
  warn "Ja existe site Nginx respondendo por ${DOMAIN}:"
  printf '      %s\n' $CONFLITO
  warn ""
  warn "O Nginx ignora o segundo bloco com o mesmo server_name, entao instalar"
  warn "a nossa configuracao agora nao teria efeito nenhum — e o certbot"
  warn "instalaria o certificado no arquivo errado."
  warn ""
  warn "Confira o que e esse site antes de decidir:"
  warn "    head -30 ${CONFLITO%% *}"
  warn "    curl -sI https://${DOMAIN} | head -5"
  warn ""
  warn "Se puder ser desativado:"
  for c in $CONFLITO; do
    warn "    rm $c"
  done
  warn "    bash $0        # rode este script de novo"
  die "Interrompido para nao publicar uma configuracao que seria ignorada."
fi

install -m 644 "${APP_DIR}/deploy/nginx/frota.conf" /etc/nginx/sites-available/frota.conf
ln -sfn /etc/nginx/sites-available/frota.conf /etc/nginx/sites-enabled/frota.conf
rm -f /etc/nginx/sites-enabled/default

# `nginx -t` retorna sucesso mesmo com aviso de colisao. Capturar a saida e
# olhar o texto e a unica forma de transformar isso em falha.
NGINX_TEST="$(nginx -t 2>&1)"
printf '%s\n' "$NGINX_TEST"
if grep -q 'conflicting server name' <<<"$NGINX_TEST"; then
  die "Colisao de server_name persiste. A configuracao instalada esta sendo ignorada."
fi

systemctl reload nginx
systemctl enable nginx >/dev/null

# ---------------------------------------------------------------------------
log "Firewall"
# ---------------------------------------------------------------------------
# `allow OpenSSH` vem antes do enable de proposito: habilitar o ufw sem a
# regra de SSH derruba a propria sessao que esta rodando este script.
ufw allow OpenSSH >/dev/null
ufw allow 'Nginx Full' >/dev/null
ufw --force enable >/dev/null
ufw status numbered

# ---------------------------------------------------------------------------
log "Verificacao de DNS antes do certificado"
# ---------------------------------------------------------------------------
# O certbot falha de forma pouco clara quando o dominio nao aponta para este
# servidor, e cada tentativa conta para o limite de emissao do Let's Encrypt.
# Conferir antes economiza tempo e evita bater no rate limit.
SERVER_IP="$(curl -fsS --max-time 10 https://api.ipify.org || echo '')"
# `ahostsv4` e nao `hosts`: com `hosts`, um dominio que tenha registro AAAA
# devolveria o IPv6 primeiro e a comparacao com o IPv4 do ipify acusaria uma
# divergencia que nao existe.
DOMAIN_IP="$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk '{print $1}' | head -1 || echo '')"

log "IP do servidor: ${SERVER_IP:-desconhecido}"
log "DNS de ${DOMAIN}: ${DOMAIN_IP:-nao resolve}"

if [[ -z "$DOMAIN_IP" ]]; then
  warn "O dominio nao resolve. Aponte um registro A de ${DOMAIN} para ${SERVER_IP} e rode:"
  warn "    certbot --nginx -d ${DOMAIN} -d ${DOMAIN_WWW}"
elif [[ -n "$SERVER_IP" && "$DOMAIN_IP" != "$SERVER_IP" ]]; then
  warn "O dominio resolve para ${DOMAIN_IP}, que nao e este servidor (${SERVER_IP})."
  warn "Corrija o DNS e depois rode:"
  warn "    certbot --nginx -d ${DOMAIN} -d ${DOMAIN_WWW}"
else
  log "DNS confere. Emitindo certificado"
  certbot --nginx \
    -d "$DOMAIN" -d "$DOMAIN_WWW" \
    --non-interactive --agree-tos --redirect \
    -m "admin@${DOMAIN}" || warn "Certbot falhou. Rode manualmente para ver o motivo."
  systemctl enable certbot.timer >/dev/null 2>&1 || true
fi

# ---------------------------------------------------------------------------
log "Provisionamento concluido"
# ---------------------------------------------------------------------------
cat <<EOF

Faltam dois passos, nesta ordem:

  1) Preencher as variaveis do Firebase:
       nano ${ENV_FILE}

     Os mesmos valores que estao no Netlify, em
     Site configuration > Environment variables.

  2) Publicar:
       sudo -u ${APP_USER} bash ${APP_DIR}/deploy/publish.sh

E um passo no Firebase Console, sem o qual o login NAO funciona:

     Authentication > Settings > Authorized domains > Add domain
       ${DOMAIN}

     Sem isso, entrar no app retorna auth/unauthorized-domain.

EOF
