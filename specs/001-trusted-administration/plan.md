# Plan: Feature 001, trusted administration

How the requirements in [`spec.md`](spec.md) become running software, and in what order. The order is dictated by which requirements are unblocked, not by architectural layers.

| Field | Value |
|---|---|
| **Baseline** | Java 25 LTS on Spring Boot 4.1.x, per [ADR-0001](../../docs/adr/0001-platform-baseline.md) |
| **Store** | PostgreSQL |
| **Shape** | Modular monolith, one deployable API assembly |
| **Blocked** | REQ-001, REQ-002, REQ-015 (CLAR-005); REQ-011 (CLAR-001, CLAR-003) |

---

## What can be built now

Four of fifteen requirements are blocked, and three of those are the headline CPF rules. That does not stall the increment. Two independent bodies of work remain fully specified:

| Buildable now | Requirements |
|---|---|
| CPF format and check-digit validation, excluding the contested cases | REQ-003, REQ-004, REQ-005, REQ-006, REQ-007 |
| Social program registration, read path and audit | REQ-008, REQ-009, REQ-010, REQ-012, REQ-013, REQ-014 |

The contested cases are exactly three inputs: a blank CPF, an all-zeros CPF, and a CPF of eleven identical digits. Everything else about CPF validation is agreed across all three legacy implementations, so the service is built with those three inputs routed to an explicit `UNDECIDED` outcome that fails loudly rather than guessing.

This is deliberate. A stub that returns a plausible answer would be indistinguishable from a decided one once it ships.

## Module boundaries

```text
sifap-api/
  documents/        CPF validation, no persistence, no HTTP awareness in the core
  programs/         social program registry
  audit/            append-only trail, shared by every administrative action
  platform/         cross-cutting: error mapping, masking, time
```

Boundaries are enforced in the build with an architecture test, not by convention. `documents` must not depend on `programs`; nothing may depend on `audit` internals beyond its append port. Constitution P5 requires the build to fail when a boundary is crossed, because a diagram cannot fail.

## Data model outline

Derived from the legacy views, not invented. Field widths come from the DDM and program declarations; the mapping is recorded per column so a reviewer can check it against the legacy source.

| Table | Origin | Note |
|---|---|---|
| `social_program` | `SOCPROG` view in `CADPROG.NSP` | stored amount precision is contested, see CLAR-003 |
| `audit_entry` | `AUDIT` view in `CADPROG.NSP` | append-only, enforced by grant and by constraint |

The program table is created without the derived-amount column populated by a formula, because REQ-011 is blocked. The column exists and is nullable; nothing writes a derived value until CLAR-001 closes.

## API surface

Contract first. The OpenAPI document is the source of truth for shape, and the tests assert against it.

| Operation | Requirements |
|---|---|
| `POST /api/v1/documents/cpf:validate` | REQ-003 … REQ-007 |
| `POST /api/v1/programs` | REQ-008, REQ-009, REQ-010, REQ-012, REQ-013 |
| `GET /api/v1/programs/{code}` | REQ-012, and CLAR-004 for the not-found contract |

Validation outcomes are returned as a typed code, never as a bare boolean. The legacy system distinguishes five outcomes by numeric code, and collapsing them into true/false would lose information every caller currently has.

## Testing strategy

Characterization tests come first and carry the `REQ-NNN` they cover.

1. **Fixtures are derived from the legacy algorithm**, transcribed digit by digit from the copycode, and are stored as data rather than as code so a reviewer can diff them.
2. **Expected values never come from the modern implementation.** Constitution P2 forbids it, because a test written from the implementation only proves the implementation agrees with itself.
3. **The contested inputs are asserted to fail.** Until CLAR-005 closes, a test asserts that a blank, all-zeros or repeated-digit CPF produces `UNDECIDED`, so an accidental implementation of one variant breaks the build.
4. **Live comparison is planned, not assumed.** Once the lab is reachable, the same fixtures are replayed against the running Natural system and any disagreement is a defect in the transcription.

## Sequencing

The audit trail is built before program registration, because REQ-013 requires the audit write and the registration to succeed or fail together. Building registration first would mean writing the transaction twice.

## Risks

| Risk | Mitigation |
|---|---|
| CLAR-005 stays open and the CPF service ships half-decided | The `UNDECIDED` outcome fails loudly, and the traceability gate keeps the requirements marked blocked |
| Fixtures transcribe the legacy algorithm incorrectly | Fixtures are data, reviewed against the source, and later replayed against the live lab |
| Java 25 is not installed on developer machines | The toolchain version is pinned in the build and provisioned in continuous integration, so a wrong local JDK fails fast rather than silently compiling to an older target |
