#!/usr/bin/env bash
set -euo pipefail
vault="${1:?Provide the vault name}"
hostname="${2:?Provide the public hostname}"
[[ "$vault" =~ ^[a-zA-Z0-9-]{3,24}$ ]] || { echo 'Invalid vault name' >&2; exit 2; }
[[ "$hostname" =~ ^sifap-modern-[a-z0-9]+\.eastus2\.cloudapp\.azure\.com$ ]] || { echo 'Invalid modern hostname' >&2; exit 2; }
install -m 0644 /opt/sifap-modern/infra/runtime/sifap-modern.service /etc/systemd/system/sifap-modern.service
printf 'SIFAP_VAULT=%s\nSIFAP_HOST=%s\n' "$vault" "$hostname" > /etc/sifap-modern-host
chmod 0600 /etc/sifap-modern-host
systemctl daemon-reload
systemctl enable sifap-modern.service
systemctl restart sifap-modern.service
systemctl is-active sifap-modern.service
