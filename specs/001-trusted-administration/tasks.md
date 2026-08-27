# Tasks: Feature 001, trusted administration

Ordered. Each task names the requirements it advances, per constitution P8. A task that cannot name one does not belong in this list.

| Field | Value |
|---|---|
| **Specification** | [`spec.md`](spec.md) |
| **Plan** | [`plan.md`](plan.md) |

---

## Foundation

- [ ] **T001** — Pin the toolchain: Java 25 LTS and Spring Boot 4.1.x, with the version enforced in the build so a mismatched local JDK fails fast. *(ADR-0001)*
- [ ] **T002** — Create the module skeleton `documents`, `programs`, `audit`, `platform`, with an architecture test that fails when a boundary is crossed. *(constitution P5)*
- [ ] **T003** — Add the backend job to continuous integration: build, test, and the architecture test.

## Contract

- [ ] **T004** — Write the OpenAPI document for the three operations in the plan. *(REQ-003 … REQ-013)*
- [ ] **T005** — Generate or hand-write the request and response types from the contract, and assert in a test that the running API matches it.

## Characterization fixtures

- [ ] **T006** — Transcribe the legacy check-digit algorithm and emit a fixture file of CPF inputs with expected outcomes, stored as data. *(REQ-004, REQ-005)*
- [ ] **T007** — Add fixtures for the three contested inputs, expecting `UNDECIDED`. *(REQ-002, REQ-015, CLAR-005)*
- [ ] **T008** — Record the fixture provenance: which legacy file and line range each expectation derives from. *(constitution P1, P2)*

## Document validation

- [ ] **T009** — Implement the CPF outcome type with the five agreed outcomes plus `UNDECIDED`. *(REQ-003, REQ-004, REQ-005, REQ-006)*
- [ ] **T010** — Implement format and check-digit validation against the fixtures. *(REQ-004, REQ-005)*
- [ ] **T011** — Route blank, all-zeros and repeated-digit input to `UNDECIDED`. *(REQ-002, REQ-015)*
- [ ] **T012** — Add masking so no CPF reaches a log, trace or error message, with a test that inspects captured output. *(REQ-007)*
- [ ] **T013** — Expose `POST /api/v1/documents/cpf:validate`. *(REQ-003 … REQ-007)*

## Audit

- [ ] **T014** — Create the `audit_entry` schema, append-only by constraint and by grant. *(REQ-014)*
- [ ] **T015** — Implement the append port and prove immutability with a test that attempts an update and a delete. *(REQ-014)*

## Program registration

- [ ] **T016** — Create the `social_program` schema from the legacy view, recording the origin of each column. *(REQ-008)*
- [ ] **T017** — Implement registration with required-field and program-type validation. *(REQ-008, REQ-009)*
- [ ] **T018** — Reject a duplicate program code without modifying the existing record. *(REQ-010)*
- [ ] **T019** — Set status to active on insert, and keep it out of the request shape. *(REQ-012)*
- [ ] **T020** — Write the audit entry and the program in one transaction, and test that a failure after the audit write leaves neither. *(REQ-013)*
- [ ] **T021** — Expose `POST /api/v1/programs` and `GET /api/v1/programs/{code}`.

## Blocked, do not start

- [ ] **T022** — Derive the stored program amount. **Blocked by CLAR-001 and CLAR-003.** *(REQ-011)*
- [ ] **T023** — Decide and implement the authoritative CPF semantics, and record it in an ADR. **Blocked by CLAR-005.** *(REQ-001, REQ-002, REQ-015)*
- [ ] **T024** — Define the not-found contract for the program read path. **Blocked by CLAR-004.**

## Definition of done

- [ ] Every unblocked task is complete and its requirements have passing tests naming the `REQ-NNN`.
- [ ] No blocked task has been started.
- [ ] The traceability gate, the markdown gate and the hygiene gate are green.
