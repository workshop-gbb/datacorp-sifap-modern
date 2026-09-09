#!/usr/bin/env bash
set -euo pipefail
umask 077

vault="${1:?Provide the vault name}"
hostname="${2:?Provide the public hostname}"
[[ "$vault" =~ ^[a-zA-Z0-9-]{3,24}$ ]] || { echo 'Invalid vault name' >&2; exit 2; }
[[ "$hostname" =~ ^sifap-modern-[a-z0-9]+\.eastus2\.cloudapp\.azure\.com$ ]] || { echo 'Invalid modern hostname' >&2; exit 2; }
cd /opt/sifap-modern

token="$(curl --fail --silent --show-error --connect-timeout 5 --max-time 15 \
  -H Metadata:true 'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https%3A%2F%2Fvault.azure.net' | jq -er '.access_token')"
trap 'unset token; rm -f /run/sifap-modern.runtime' EXIT
response="$(printf 'header = "Authorization: Bearer %s"\n' "$token" |
  curl --config - --fail --silent --show-error --connect-timeout 5 --max-time 20 \
    "https://$vault.vault.azure.net/secrets/workshop-runtime?api-version=7.4")"
unset token
printf '%s' "$response" | jq -er '.value | fromjson | to_entries[] |
  select(.key != "SIFAP_VIEWER_PASSWORD" and .key != "SIFAP_ADMIN_PASSWORD") |
  if (.key | test("^[A-Z_]+$")) and (.value | type == "string") and
    (.value | test("^[a-zA-Z0-9_.$/-]+$"))
  then "\(.key)=\u0027\(.value)\u0027" else error("Invalid runtime secret format") end' > /run/sifap-modern.runtime
unset response
printf "SIFAP_HOST='%s'\n" "$hostname" >> /run/sifap-modern.runtime
docker compose --env-file /run/sifap-modern.runtime up -d --no-build --wait --wait-timeout 240
docker compose --env-file /run/sifap-modern.runtime ps --format json | jq '{Service,State,Health}'
