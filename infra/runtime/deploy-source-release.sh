#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${SIFAP_SOURCE_URL:?Missing protected source download URL}"
: "${SIFAP_SOURCE_SHA:?Missing source checksum}"
: "${SIFAP_HOST:?Missing public hostname}"
: "${SIFAP_VAULT:?Missing vault name}"
[[ "$SIFAP_SOURCE_SHA" =~ ^[a-f0-9]{64}$ ]] || { echo "Invalid source checksum" >&2; exit 2; }

stage="$(mktemp -d /opt/sifap-source.XXXXXX)"
trap 'rm -rf "$stage"' EXIT
printf 'url = "%s"\n' "$SIFAP_SOURCE_URL" | curl -q --config - --proto '=https' \
  --fail --silent --show-error --connect-timeout 15 --max-time 180 -o "$stage/source.tar.gz"
unset SIFAP_SOURCE_URL
printf '%s  %s\n' "$SIFAP_SOURCE_SHA" "$stage/source.tar.gz" | sha256sum -c -
mkdir "$stage/source"
tar -xzf "$stage/source.tar.gz" -C "$stage/source"

# The host intentionally has the distribution Docker package without buildx.
# The image still targets this AMD64 host; remove only the BuildKit automatic
# platform variable before using the compatible legacy builder.
sed -i 's/^FROM --platform=\$BUILDPLATFORM /FROM /' "$stage/source/backend/Dockerfile"
docker build --pull=false -t sifap-api:workshop-v5 "$stage/source/backend"
docker build --pull=false --build-arg NPM_REGISTRY=https://packagefeedproxy.microsoft.io/npm/ \
  -t sifap-viewer:workshop-v5 "$stage/source/frontend"
install -m 0644 "$stage/source/compose.yaml" /opt/sifap-modern/compose.yaml
cp -a "$stage/source/infra/runtime/." /opt/sifap-modern/infra/runtime/
chmod 0755 /opt/sifap-modern/infra/runtime/*.sh
bash /opt/sifap-modern/infra/runtime/configure-host.sh "$SIFAP_VAULT" "$SIFAP_HOST"
bash /opt/sifap-modern/infra/runtime/verify-startup.sh --check-only
