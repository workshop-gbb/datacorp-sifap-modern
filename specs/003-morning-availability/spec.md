# Feature 003: Daily morning availability

**REQ-113** — When the daily 06:30 America/Sao_Paulo schedule fires, the
automation shall start both SIFAP application VMs if stopped, aiming for both
systems to be usable by 07:00, and shall never request a scheduled start outside
the 06:30-08:00 morning window.

- `source_legacy:` [GREENFIELD] The user requires both workshop environments to start each morning while respecting the nightly MCAPS shutdown.
- Acceptance: native Azure daily schedule, weekends included; actual next run verified at 06:30; no overnight watchdog; already running VMs are not restarted.

**REQ-114** — After morning startup, the automation shall verify the database,
application containers and public HTTPS endpoints within a bounded deadline.

- `source_legacy:` [GREENFIELD] A running VM does not prove that the application or database is ready for students.
- Acceptance: PostgreSQL SELECT 1, Spring health, frontend health, Adabas and Natural container health pass; fresh managed execution markers and exit code zero are required; a failed target does not prevent checking the other; 11 minutes per target and 25 minutes overall; missing health or timeout fails the job; no seed or payment batch runs.

**REQ-115** — When an operator runs ValidateOnly, the automation shall verify
existing running services without starting a stopped VM or restarting a service.

- `source_legacy:` [GREENFIELD] Operators need a safe on-demand validator outside the scheduled startup window.
- Acceptance: managed identity with VM-scoped read/start and managed Run Command read/write actions; expired commands cannot replay startup; no operator role grant, logged credentials or MCAPS policy changes.

**REQ-117** — When either SIFAP environment stops during working hours, the
automation shall restart and revalidate it within 15 minutes, and shall never
request a start outside 07:00-19:00 America/Sao_Paulo.

- `source_legacy:` [GREENFIELD] Verified on 9-17 Sep 2026: both VMs boot near 07:00 and then shut down cleanly mid-day, staying deallocated for the rest of the day. On 17 Sep the modern host shut down at 14:04, four minutes after an hourly check had passed.
- Acceptance: four offset schedules bound to the same runbook in Daytime mode give a 15-minute cadence; a healthy public endpoint avoids an unnecessary guest command; outside the window the job exits successfully without starting a VM; the nightly shutdown stays intact and the MCAPS-governed patch window is not modified.

## References

- [Azure Automation schedules](https://learn.microsoft.com/azure/automation/shared-resources/schedules)
- [Managed Run Command for Linux](https://learn.microsoft.com/azure/virtual-machines/linux/run-command-managed)
