#!/usr/bin/env bash
#
# Publicacao — Frota Infratech
#
#   sudo -u frota bash /srv/frota/app/deploy/publish.sh
#
# Traz o codigo novo, constroi e troca a release ativa.
#
# A troca e por symlink, e nao sobrescrevendo a pasta servida. Isso importa:
# `next build` apaga e reescreve o `out/` inteiro, e durante esses segundos o
# site estaria servindo um build pela metade — HTML novo pedindo asset que
# ainda nao existe. Com symlink, a release so entra no ar quando esta completa,
# e o rollback e trocar o ponteiro de volta.

set -euo pipefail

BRANCH="${BRANCH:-master}"
BASE_DIR="/srv/frota"
APP_DIR="${BASE_DIR}/app"
RELEASES_DIR="${BASE_DIR}/releases"
CURRENT_LINK="${BASE_DIR}/current"
KEEP_RELEASES=5

log()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m x  %s\033[0m\n' "$*" >&2; exit 1; }

[[ "$(id -un)" == "frota" ]] || die "Rode como o usuario da aplicacao: sudo -u frota bash $0"

cd "$APP_DIR"

# ---------------------------------------------------------------------------
log "Conferindo as variaveis de ambiente"
# ---------------------------------------------------------------------------
# Falhar aqui, antes do build, e muito melhor que falhar depois: as
# NEXT_PUBLIC_* sao embutidas no bundle em tempo de build. Um build feito com o
# arquivo de exemplo geraria um app que sobe, abre, e nao conecta em nada —
# com erro so no console do navegador do usuario final.
[[ -f .env.local ]] || die "Falta ${APP_DIR}/.env.local — copie de .env.example e preencha."

if grep -q "your_firebase" .env.local; then
  die "O .env.local ainda tem valores de exemplo. Preencha com as chaves reais do Firebase."
fi

for var in NEXT_PUBLIC_FIREBASE_API_KEY NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN NEXT_PUBLIC_FIREBASE_PROJECT_ID; do
  grep -q "^${var}=." .env.local || die "Variavel ausente ou vazia no .env.local: ${var}"
done

# ---------------------------------------------------------------------------
log "Atualizando o codigo"
# ---------------------------------------------------------------------------
git fetch --depth 1 origin "$BRANCH"
git reset --hard "origin/${BRANCH}"
COMMIT="$(git rev-parse --short HEAD)"
log "Commit ${COMMIT} — $(git log -1 --pretty=%s)"

# ---------------------------------------------------------------------------
log "Instalando dependencias"
# ---------------------------------------------------------------------------
npm ci --no-audit --no-fund

# ---------------------------------------------------------------------------
log "Build"
# ---------------------------------------------------------------------------
rm -rf .next out
npm run build

[[ -f out/index.html ]] || die "Build terminou sem gerar out/index.html."

# Rede de seguranca contra o erro mais caro possivel: publicar um bundle que
# aponta para o projeto Firebase errado. Conferir aqui custa um grep.
PROJECT_ID="$(sed -n 's/^NEXT_PUBLIC_FIREBASE_PROJECT_ID=//p' .env.local | tr -d "\"' \r")"
if ! grep -rq "$PROJECT_ID" out/_next/static/chunks/ 2>/dev/null; then
  die "O projeto '${PROJECT_ID}' nao aparece no bundle. O build nao pegou o .env.local."
fi

# ---------------------------------------------------------------------------
log "Publicando"
# ---------------------------------------------------------------------------
RELEASE="${RELEASES_DIR}/$(date +%Y%m%d-%H%M%S)-${COMMIT}"
mkdir -p "$RELEASE"
cp -a out/. "$RELEASE/"
chmod -R a+rX "$RELEASE"

# `ln -sfn` sozinho nao e atomico quando o alvo ja existe: ele cria o link
# DENTRO da pasta apontada. Criar ao lado e mover com `-T` e o que garante a
# substituicao atomica, sem instante nenhum sem `current`.
ln -sfn "$RELEASE" "${CURRENT_LINK}.novo"
mv -Tf "${CURRENT_LINK}.novo" "$CURRENT_LINK"

log "No ar: $(basename "$RELEASE")"

# ---------------------------------------------------------------------------
log "Limpando releases antigas"
# ---------------------------------------------------------------------------
# Mantem as ultimas N para permitir rollback imediato sem rebuild.
ls -1dt "${RELEASES_DIR}"/*/ 2>/dev/null \
  | tail -n +$((KEEP_RELEASES + 1)) \
  | xargs -r rm -rf

# ---------------------------------------------------------------------------
log "Verificando"
# ---------------------------------------------------------------------------
if curl -fsS --max-time 10 -o /dev/null -w '%{http_code}' https://techartsolucoes.com.br/ 2>/dev/null | grep -q 200; then
  log "https://techartsolucoes.com.br respondeu 200"
else
  printf '\033[1;33m !  Nao consegui confirmar por HTTPS. Se o certificado ainda nao foi emitido, isso e esperado.\033[0m\n'
fi

cat <<EOF

Publicado: ${COMMIT}

Rollback, se precisar:
  ls -1dt ${RELEASES_DIR}/*/
  ln -sfn <release-anterior> ${CURRENT_LINK}.novo && mv -Tf ${CURRENT_LINK}.novo ${CURRENT_LINK}

EOF
