# Viewer platform operations

## Environments and access

| Environment | URL | Student role |
|---|---|---|
| Modern | <https://sifap-modern-fiepi9.eastus2.cloudapp.azure.com/pt-BR> | `admin` or `viewer`; current business endpoints remain read only |
| Legacy | <https://sifap-lab-438k30.eastus2.cloudapp.azure.com/> | `admin` operator access or `viewer` pinned to `VIEWBENF;FIN` |

Modern routes begin with `/en`, `/es`, or `/pt-BR`. After sign-in, students can
explore the dashboard, beneficiaries, programs, payments, reports and integrations.
The language selector retains the route and filters.

Enter the credentials supplied by the facilitator on either sign-in page. The
legacy terminal and modern dashboard use independent host-scoped sessions. The
server identifies ADMIN or VIEWER from the authenticated account; the browser
does not select or supply the granted role.

Passwords are stored as hashes in runtime configuration read from Key Vault.
They are not embedded in the public landing, URL, browser storage or client code.

## What the workshop does and does not demonstrate

The active modern database snapshot is generated from the approved legacy
fixture and contains all 6 programs, 500 beneficiaries, 2,000 payments and 200
audit events across October 2017 through January 2018. Indicators, lists,
details, audit views and exports query that persisted snapshot. A CSV export
includes the entire filtered result, not just the current page. Print / Save as
PDF uses the browser's print engine and the report print stylesheet.

The previous placeholder tables remain physically present only for immediate
application rollback. Active reads resolve through atomically switched,
append-only snapshot views.

### Canonical legacy-to-modern comparison

Use `MARIA ALMEIDA ALMEIDA` for the paired demonstration:

1. In the legacy viewer, search by the facilitator-provided synthetic
   identifier and show the Natural beneficiary and payment-history screen.
2. In the modern viewer, open **Beneficiaries**, search for
   `MARIA ALMEIDA ALMEIDA`, and open `BEN-000005`.
3. Compare program `GASF`, Curitiba/PR, registration context and the four
   payments from October 2017 through January 2018.
4. Point out the intentional privacy improvement: the modern API and interface
   retain only approved CPF/NIS masks and never accept full identifiers as
   search terms.

Payment status and type values remain source codes. The interface does not
silently reinterpret disputed legacy meanings as paid, pending or blocked.

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
- Active dataset: `legacy-2018-03-14`, generated from the pinned legacy seed and
  validated by commit, generator and normalized-content hashes.
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

## Daily availability from 07:00

The shared Azure Automation runbook `Start-SifapWorkshopMorning` starts this
application VM and the legacy application VM every day at **06:30
America/Sao_Paulo**, including weekends, so both systems can be ready **by 07:00**.
The nightly MCAPS shutdown is preserved. Scheduled startup is bounded to
06:30-08:00; no always-on watchdog is installed. The schedule retains the historical
Azure resource name `sifap-morning-0700`, but its actual trigger time is 06:30.

Its schedule and minimal VM-scoped identity permissions are owned by the existing
[legacy morning-start module](https://github.com/workshop-gbb/datacorp-sifap-legacy/tree/develop/infra/morning-start).
This repository owns [verify-startup.sh](../../infra/runtime/verify-startup.sh),
which checks the persisted PostgreSQL database with `SELECT 1`, container health,
Spring readiness and frontend readiness. No financial data or credentials are logged.

The job reports success only after both systems and databases are ready and their
public HTTPS probes pass. Each target has an independent 11-minute deadline within
the overall 25-minute budget. Managed Run Command execution status, exit code and
unique, expiring invocation markers prevent pending ARM provisioning or stale
results from being mistaken for application readiness. Failures/timeouts fail the
Automation job without skipping the other target.

Operators can run `ValidateOnly` at any time without starting a stopped VM or
restarting containers. The guest script receives `--check-only` in this mode.

The morning schedule alone does not keep the systems up all day. Guest shutdown
history and Resource Health show both machines stopping cleanly mid-day with no
Azure `deallocate` operation, shortly after automatic security patching completes.
The shared `sifap-daytime-availability` schedule therefore runs the same runbook
hourly in `Daytime` mode: between **07:00 and 19:00 America/Sao_Paulo** it restarts
a stopped environment and re-runs the same readiness checks. Outside that window it
exits without acting, so the nightly shutdown and corporate security policies stay
intact. Automatic patching is intentionally not moved to a night window, because
the VMs are deallocated overnight and would stop receiving security updates.

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

The classroom browser tests receive credentials from a protected environment or
private test file. They test both roles, role-injection denial, logout and the
actual legacy Natural iframe. Browser traces/video remain disabled.

## Live verification

Set both `SIFAP_BASE_URL` and `SIFAP_API_BASE` to the modern HTTPS origin and run
the same `pnpm test:e2e` suite. It exercises:

- All three landing locales at 1440 and 390 pixels, including language attributes.
- Actual sign-in, HttpOnly/Secure cookies, search, details, pagination and CSV.
- The canonical Maria record, its four-payment history and all 200 audit events.
- Every main screen, mobile navigation, logout and anonymous access denial.
- Bad passwords, forged sessions, denied business mutations and report totals.
- Integration status, scope and timestamps.

Set `SIFAP_REQUIRE_INTEGRATIONS=true` when both upstream checks must be connected
for the current demonstration. A normal regression run verifies truthful status
reporting without treating an unrelated upstream outage as fabricated success.

The GitHub Actions `Viewer application` workflow runs backend, frontend and
Terraform gates. Its live job uses repository variable `SIFAP_BASE_URL` and
protected repository secrets, and runs only after those gates pass. Credentials
are never printed or committed.

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

## References

- [Azure Automation schedules](https://learn.microsoft.com/azure/automation/shared-resources/schedules)
- [Managed Run Command for Linux](https://learn.microsoft.com/azure/virtual-machines/linux/run-command-managed)
- [Azure Resource Health](https://learn.microsoft.com/azure/service-health/resource-health-overview)
