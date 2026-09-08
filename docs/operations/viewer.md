# Viewer platform operations

## Environments and access

| Environment | URL | Student role |
|---|---|---|
| Modern | <https://sifap-modern-fiepi9.eastus2.cloudapp.azure.com/pt-BR> | `viewer`, application-enforced read only |
| Legacy | <https://sifap-lab-438k30.eastus2.cloudapp.azure.com/terminal/> | `viewer`, pinned `VIEWBENF;FIN` session |

Modern routes begin with `/en`, `/es`, or `/pt-BR`. After sign-in, students can
explore the dashboard, beneficiaries, programs, payments, reports and integrations.
The language selector retains the route and filters.

The two accounts have separate credentials. The facilitator supplies them through
an approved private channel. Do not paste passwords into commit messages, issues,
pull requests, screenshots, command arguments or application logs.

## What the workshop does and does not demonstrate

The modern database holds 150 explicitly synthetic participants, six programs,
and 900 payment records spanning March through August 2026. Indicators, lists
and exports query that persisted dataset. A CSV export includes the entire
filtered result, not just the current page. Print / Save as PDF uses the browser's
print engine and the report print stylesheet.

The legacy integration calls only its public HTTPS health endpoint. It does not
read Adabas records or certify all Natural programs. IBGE supplies actual public
state reference data; no participant data is sent to that service. Failed calls
are displayed as unavailable rather than replaced by simulated success.

No business mutation is implemented for viewers. The five clarification gates
in the evidence register remain open. This increment does not calculate
eligibility, reconcile production financial systems, or execute payments.

## Runtime and secrets

- Resource group: `sifap-modern-rg-eus2`.
- Host: `sifap-modern-vm`, Ubuntu 24.04, `Standard_D2s_v7`.
- Key Vault: `sifapmodfiepi9`, private endpoint and linked private DNS.
- Runtime secret: `workshop-runtime`, JSON containing the generated credentials.
- The VM managed identity has only `Key Vault Secrets User` on that vault.
- `sifap-modern.service` fetches protected runtime configuration after a reboot.
- PostgreSQL and TLS data are persisted in Docker volumes.
- Only HTTP/HTTPS are public. Normal releases use Azure Run Command; inbound SSH is closed.

Bootstrap secret-write access is temporary. After seeding, apply
`bootstrap_secrets=false`; the normal plan and infrastructure tests require the
read-only role. There is no permission grant to the executing operator identity.

The API signing token lives in a short-lived HttpOnly, SameSite=Lax, Secure cookie
at the browser boundary. The Next.js server supplies the bearer token to Spring
Security. API authorization does not rely on cookie presence or hidden buttons.

## Local verification

Requirements: Java 25, Maven, Node 24, pnpm 10.30.3 and Docker.

```bash
cd backend
./mvnw -B verify
cd ../frontend
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm lint
pnpm test --coverage
```

Build the application images using the checked-in Dockerfiles. If the operator
environment uses a corporate npm mirror, pass its approved URL as the frontend
`NPM_REGISTRY` build argument; never disable TLS verification.

`scripts/create-workshop-secrets.mjs` generates random credentials in an explicitly
provided **private directory outside the repository**. It does not overwrite an
existing credential and obtains the bcrypt hash through the API image's
stdin-only utility.

`scripts/start-local.mjs` accepts that private JSON file and service names
`db api frontend`. The local override binds the API to `127.0.0.1:18080` and the
UI to `127.0.0.1:3100`. Only this local override disables Secure cookies for HTTP.

```bash
cd frontend
pnpm exec playwright install chromium
pnpm test:e2e
```

Before running browser tests, provide either `SIFAP_TEST_SECRET_FILE` pointing to
the protected JSON file or `SIFAP_VIEWER_PASSWORD` in the process environment.
Missing credentials fail rather than skip. Tests never print token/password
values, and recording of browser traces/video is disabled.

## Live verification

Set both `SIFAP_BASE_URL` and `SIFAP_API_BASE` to the modern HTTPS origin and run
the same `pnpm test:e2e` suite. It exercises:

- All three landing locales at 1440 and 390 pixels, including language attributes.
- Actual sign-in, HttpOnly/Secure cookies, search, details, pagination and CSV.
- Every main screen, mobile navigation, logout and anonymous access denial.
- Bad passwords, forged sessions, denied business mutations and report totals.
- Integration status, scope and timestamps.

Set `SIFAP_REQUIRE_INTEGRATIONS=true` when both upstream checks must be connected
for the current demonstration. A normal regression run verifies truthful status
reporting without treating an unrelated upstream outage as fabricated success.

The GitHub Actions `Viewer application` workflow runs backend, frontend and
Terraform gates. Its live job uses repository variable `SIFAP_BASE_URL` and
secret `SIFAP_VIEWER_PASSWORD`, and runs only after those gates pass. Pull request
runs do not receive the live credential.

## Redeployment and recovery

1. Build and test immutable Linux AMD64 images from the reviewed source revision.
2. Check the Terraform plan: do not replace the VM or public address for drift
   introduced by tenant policies. The VM has destruction protection.
3. Publish the verified bundles as assets of a private GitHub release. Run
   `scripts/deploy-private-release.mjs` with its tag and private artifact directory.
   It exchanges local GitHub authentication for short-lived, artifact-scoped
   download URLs and sends those URLs as protected Azure Run Command parameters.
   The GitHub token never leaves the operator process, and SSH is not reopened.
   The host verifies both checksums before loading the images.
4. Run the checked-in `infra/runtime/configure-host.sh` with the vault name and
   public hostname. It installs/restarts the boot-persistent systemd service.
5. Verify `/healthz`, `/actuator/health`, and the authenticated live browser suite.
6. Retain the previous image IDs and encrypted database backup before an upgrade.

This single-host workshop is not highly available. Do not delete its Docker
volumes to troubleshoot an application failure. A multi-operator production
deployment additionally needs an approved remote Terraform backend, scheduled
restore-tested database backups, enterprise identity federation and a
high-availability hosting design.
