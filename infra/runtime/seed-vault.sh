#!/usr/bin/env bash
set -euo pipefail
umask 077
vault="${1:?Provide the new vault name}"
secret_file="${2:?Provide a protected JSON secret file on this VM}"
[[ "$vault" =~ ^[a-zA-Z0-9-]{3,24}$ ]] || { echo 'Invalid vault name' >&2; exit 2; }
[[ -f "$secret_file" ]] || { echo 'Secret file missing' >&2; exit 2; }
token="$(curl --fail --silent --show-error --connect-timeout 5 --max-time 15 \
  -H Metadata:true 'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https%3A%2F%2Fvault.azure.net' | jq -er '.access_token')"
trap 'unset token; rm -f /run/sifap-vault-payload.json' EXIT
jq -Rs '{value: ., attributes: {enabled: true}, contentType: "application/json"}' "$secret_file" > /run/sifap-vault-payload.json
printf 'header = "Authorization: Bearer %s"\n' "$token" |
  curl --config - --fail --silent --show-error --connect-timeout 5 --max-time 20 \
    --request PUT --header 'Content-Type: application/json' --data-binary @/run/sifap-vault-payload.json \
    "https://$vault.vault.azure.net/secrets/workshop-runtime?api-version=7.4" --output /dev/null
rm -f "$secret_file"
echo 'Runtime secret stored using the VM managed identity. Remove bootstrap write access now.'
