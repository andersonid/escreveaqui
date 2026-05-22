#!/usr/bin/env bash
# Gera SealedSecret Traefik basicAuth para Swagger / OpenAPI / MCP.
# Uso: API_DOCS_AUTH_PASSWORD='sua-senha' ./scripts/seal-api-docs-auth.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
USER="${API_DOCS_AUTH_USER:-api-docs}"
PASS="${API_DOCS_AUTH_PASSWORD:-$(openssl rand -base64 18)}"
CONTEXT="${KUBE_CONTEXT:-nobre-ninja}"
NS="escreveaqui"
SECRET_NAME="escreveaqui-api-docs-auth"
OUT="$ROOT/k8s/api-docs-auth-sealed-secret.yaml"

KUBESEAL="${KUBESEAL:-kubeseal}"
if ! command -v "$KUBESEAL" >/dev/null 2>&1; then
  KUBESEAL="/tmp/kubeseal"
  if [[ ! -x "$KUBESEAL" ]]; then
    curl -sL "https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.27.1/kubeseal-0.27.1-linux-amd64.tar.gz" \
      | tar xz -O kubeseal > "$KUBESEAL"
    chmod +x "$KUBESEAL"
  fi
fi

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
htpasswd -nbBC 10 "$USER" "$PASS" >"$TMP"

kubectl --context "$CONTEXT" create secret generic "$SECRET_NAME" \
  --namespace "$NS" \
  --from-file=users="$TMP" \
  --dry-run=client -o yaml \
| "$KUBESEAL" \
    --context "$CONTEXT" \
    --controller-name=sealed-secrets-controller \
    --controller-namespace=kube-system \
    --format yaml \
    --namespace "$NS" \
> "$OUT"

echo "SealedSecret gravado em: $OUT"
echo "Usuário Traefik Basic Auth: $USER"
echo "Senha (guarde em gerenciador de senhas): $PASS"
