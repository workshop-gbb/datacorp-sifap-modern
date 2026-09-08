# Feature 003: Daily morning availability

**REQ-113** — When the daily 07:00 America/Sao_Paulo schedule fires, the
automation shall start the two SIFAP application VMs if stopped and shall never
request a start outside the 07:00-08:00 morning window.

- `source_legacy:` [GREENFIELD] The user requires both workshop environments to start each morning while respecting the nightly MCAPS shutdown.
- Acceptance: native Azure daily schedule, weekends included; no overnight watchdog; already running VMs are not restarted.

**REQ-114** — After morning startup, the automation shall verify the database,
application containers and public HTTPS endpoints within a bounded deadline.

- `source_legacy:` [GREENFIELD] A running VM does not prove that the application or database is ready for students.
- Acceptance: PostgreSQL SELECT 1, Spring health, frontend health, Adabas and Natural container health pass; missing health or timeout fails the job; no seed or payment batch runs.

**REQ-115** — When an operator runs ValidateOnly, the automation shall verify
existing running services without starting a stopped VM or restarting a service.

- `source_legacy:` [GREENFIELD] Operators need a safe on-demand validator outside the scheduled startup window.
- Acceptance: managed identity with VM-scoped read/start/Run Command actions; no operator role grant, logged credentials or MCAPS policy changes.
