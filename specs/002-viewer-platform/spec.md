# Feature 002: Multilingual viewer platform

This increment implements the workshop experience requested on 2026-09-07 in the
existing SIFAP Modern repository. It is a deployed, authenticated, read-only
application, not a claim that all legacy business rules have been migrated.

The five clarification gates in the evidence register remain open. No screen
calculates entitlement, creates a benefit, changes a program, or executes a payment.
The application identifies its synthetic dataset on every authenticated page.

## Experience

**REQ-101** — When a visitor opens the application, the system shall display a
responsive landing page explaining the modernization, the synthetic workshop
dataset, and how to access the viewer environment.

- `source_legacy:` [GREENFIELD] The user requested a modern public entry point for the two-environment workshop.
- Acceptance: the public landing page works without authentication at desktop and mobile widths.

**REQ-102** — When a visitor chooses EN, ES, or PT-BR, the system shall render
navigation, controls, statuses, chart descriptions, errors, and reports in that
language and preserve the equivalent route.

- `source_legacy:` [GREENFIELD] The user explicitly requested English, Spanish, and Brazilian Portuguese.
- Acceptance: all three locale routes work directly; the document language and number/date formatting match the selection.

**REQ-103** — When valid workshop viewer credentials are submitted, the system
shall authenticate a VIEWER using a bounded session and server-protected credentials.

- `source_legacy:` [GREENFIELD] Students require authenticated read-only access to the modernized environment.
- Acceptance: invalid credentials fail, repeated failures are rate-limited, and session credentials are never available to client JavaScript.

**REQ-104** — While a student is authenticated as VIEWER, the system shall allow
consultation and export but reject every business-data mutation at the API boundary.

- `source_legacy:` [GREENFIELD] Viewer isolation is necessary to protect the shared classroom environment.
- Acceptance: unauthenticated data requests return 401; viewer POST, PUT, PATCH, and DELETE business requests return 403 and leave data unchanged.

**REQ-105** — When a viewer chooses a reporting month, the system shall compute
the dashboard indicators, monthly series, program distribution, and state
distribution from the persisted synthetic records.

- `source_legacy:` [GREENFIELD] Read-only analytical projections demonstrate a modern platform without deciding blocked legacy financial rules.
- Acceptance: the dashboard totals reconcile with the matching records and the report export.

**REQ-106** — When a viewer searches or filters beneficiaries, programs, or
payments, the system shall return matching records with bounded pagination and
an explicit empty state.

- `source_legacy:` [GREENFIELD] Searchable consultation screens are new workshop presentation capabilities.
- Acceptance: filters affect both displayed rows and counts; invalid parameters fail explicitly rather than being silently ignored.

**REQ-107** — When a viewer opens a synthetic record, the system shall show its
relevant program/payment context without exposing an unmasked personal identifier.

- `source_legacy:` [GREENFIELD] Record exploration teaches relationships while keeping the demonstration privacy-safe.
- Acceptance: details are navigable, unknown identifiers return 404, and no full CPF or NIS is present.

**REQ-108** — When a viewer exports a payment report, the system shall produce
a CSV of the selected month and filters, with a synthetic-data indication and
spreadsheet-safe cells.

- `source_legacy:` [GREENFIELD] Downloadable and printable reports are explicitly requested for student analysis.
- Acceptance: CSV row counts and monetary totals reconcile with the report; a print layout supports the same visible report.

**REQ-109** — When a viewer opens integrations, the system shall show the
actual result, timestamp, and scope of bounded read-only calls to the legacy
health endpoint and the public IBGE states API.

- `source_legacy:` [GREENFIELD] Real external consultations demonstrate integration without writing to the legacy system or claiming financial interoperability.
- Acceptance: network failure is displayed as unavailable or degraded, never connected; a legacy health response is labelled liveness, not functional equivalence.

**REQ-110** — While a viewer navigates the application, the system shall provide
keyboard-operable controls, visible focus, accessible chart alternatives, and
layouts without page-level horizontal overflow at 390 and 1440 CSS pixels.

- `source_legacy:` [GREENFIELD] The user requested an intuitive responsive experience, including students using different devices.
- Acceptance: navigation, login, locale selection, filtering, and export work by keyboard; graphs include text or tabular equivalents.

**REQ-111** — When an authenticated request fails, the system shall show an
explicit localized error or reauthentication path without substituting fabricated
successful data.

- `source_legacy:` [GREENFIELD] Clear failure states prevent a demonstration from concealing runtime or integration faults.
- Acceptance: backend failure is distinguishable from an empty result; expired access returns the viewer to sign-in.

**REQ-112** — When the platform is delivered, the system shall run on Azure in
resources isolated from the existing legacy lab, with repeatable infrastructure,
protected secrets, health probes, and live browser/API verification.

- `source_legacy:` [GREENFIELD] The user requires students to access and test both deployed environments, not just a local prototype.
- Acceptance: published HTTPS routes, all three languages, authenticated reads, exports, and denied viewer mutations are exercised against the deployed URL.

## Data and integration boundary

- Synthetic records are deterministic, versioned fixtures persisted in PostgreSQL.
- The fixture dates are displayed explicitly; they are not presented as live payments.
- The two actual external integrations are legacy liveness and public geographic
  reference data. Neither is a payment, identity, or benefits-policy integration.
- Existing feature 001 requirements and CLAR gates are not silently marked complete
  by this separate viewer increment.
