# ADR-0005: Activate append-only legacy workshop snapshots

| Field | Value |
|---|---|
| **Status** | accepted for the workshop; peer review before main |
| **Date** | 2026-09-10 |
| **Decision owners** | SIFAP modernization team |
| **Scope** | REQ-125 through REQ-132 |
| **Context tags** | data migration, rollback, privacy, traceability |

## Context

The first viewer release used 150 placeholder participants and 900 generated
payments. Those records demonstrated the application stack but prevented the
workshop from opening the same synthetic beneficiary and payment history in the
Natural/Adabas system and the modern platform.

The approved normalized legacy snapshot contains 6 programs, 500
beneficiaries, 2,000 payments and 200 audit events. It also contains status
codes whose meanings conflict across legacy programs. The modern application
must preserve those codes and source amounts without silently applying a new
financial interpretation.

The deployed PostgreSQL database already contains the placeholder Flyway
migrations. Rewriting or deleting an applied migration would break checksum
validation and remove the immediate rollback path. Complete CPF and NIS values
also cannot be copied into the modern read model because REQ-107 requires
privacy-safe responses and searches.

## Decision

We load each approved normalized legacy dataset into new append-only snapshot
tables. A single activation record selects the snapshot exposed by read-only
database views. The Java entities map only to those active views.

The migration generator verifies the pinned legacy commit, generator SHA-256,
normalized content SHA-256, schema version and record counts. It resolves
source relationships in memory, persists only approved CPF/NIS masks and an
opaque digest, and fails if a complete source identifier reaches the generated
SQL.

The placeholder V1/V2 tables remain unchanged for the first release. Restoring
the previous application image therefore restores the previous read path
without moving or deleting data.

## Alternatives considered

### Edit V1/V2 and regenerate the database

This produces the smallest schema, but it changes applied Flyway checksums and
requires destructive database recreation. It was rejected because it cannot
upgrade the running workshop safely.

### Truncate the existing tables and insert legacy rows

This preserves the existing Java model, but readers can observe a partial
dataset if deployment fails between deletion and load. It also removes the
fast rollback path. It was rejected.

### Read the legacy JSON snapshot directly at application startup

This avoids generated SQL, but it moves migration responsibility into the
runtime, weakens transaction boundaries and makes every restart depend on file
parsing. It was rejected.

### Append-only snapshot tables with atomic activation

This adds schema and generated migration volume, but separates staging from
activation, preserves source provenance and keeps rollback immediate. It was
selected.

## Consequences

### Positive

- Every active data surface uses the complete legacy-derived snapshot.
- Snapshot counts and relationships are validated before activation.
- Legacy status/type codes and cent-level anomalies are preserved.
- The canonical Maria record is queryable in both environments.
- Complete CPF and NIS values never enter the modern SQL, API, UI or exports.
- The previous application image remains a working rollback path.

### Negative

- The database temporarily retains both placeholder and snapshot models.
- Generated migration SQL is large and must be reproduced through the checked-in
  generator rather than edited manually.
- Future snapshots require another immutable load and activation instead of
  updating existing rows.

### Neutral

- The application remains read-only.
- This decision does not resolve any legacy financial clarification gate.
- Program names are presentation metadata derived from the pinned legacy seed
  generator; status and type codes remain the authoritative values.

## Follow-ups

- Validate REQ-125 through REQ-132 in PostgreSQL 16 and the browser suite.
- Retain the previous application image through the first workshop cycle.
- Remove placeholder tables only in a later contraction release after rollback
  evidence is reviewed.

## References

- `specs/005-legacy-data-parity/spec.md`
- `scripts/generate-legacy-snapshot-migration.mjs`
- `backend/src/main/resources/db/migration/V3__create_legacy_snapshot_model.sql`
- `backend/src/main/resources/db/migration/V5__activate_legacy_snapshot_20180314.sql`
- `workshop-gbb/datacorp-sifap-legacy@b87992324dda18bdfc86e6507c3f99b86b99e35d`
