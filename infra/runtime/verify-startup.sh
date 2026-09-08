#!/usr/bin/env bash
set -euo pipefail
check_only=false
case "${1:-}" in
  "") ;;
  --check-only) check_only=true ;;
  *) printf 'ERROR: unsupported validation mode.\n' >&2; exit 2 ;;
esac

if ! $check_only; then
  systemctl start docker
  systemctl start sifap-modern.service
fi
deadline=$((SECONDS + 480))
for service in db api frontend gateway; do
  container="sifap-modern-$service-1"
  if ! state="$(docker inspect --format '{{.State.Running}}' "$container")"; then
    printf 'ERROR: cannot inspect required container %s; verify Docker and the runtime installation.\n' "$container" >&2
    exit 1
  fi
  if [[ "$state" != true ]]; then
    if $check_only; then printf 'ERROR: %s is not running.\n' "$service" >&2; exit 1; fi
    systemctl restart sifap-modern.service
  fi
  if [[ "$service" == gateway ]]; then
    [[ "$(docker inspect --format '{{.State.Running}}' "$container")" == true ]]
    continue
  fi
  while :; do
    health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$container")"
    if [[ "$health" == healthy ]]; then break; fi
    if [[ "$health" == missing ]] || ((SECONDS >= deadline)); then
      printf 'ERROR: %s readiness failed (%s).\n' "$service" "$health" >&2
      exit 1
    fi
    sleep 5
  done
  printf 'Verified healthy: %s\n' "$service"
done
[[ "$(docker exec sifap-modern-db-1 psql -U sifap -d sifap -tA -c 'SELECT 1')" == 1 ]]
docker exec sifap-modern-api-1 wget -q -O /dev/null http://127.0.0.1:8080/actuator/health
docker exec sifap-modern-frontend-1 wget -q -O /dev/null http://127.0.0.1:3000/healthz
printf 'SIFAP_STARTUP_VALIDATION=OK\n'
