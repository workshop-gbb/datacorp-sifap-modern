# Feature 001: Trusted administration

The first executable increment. It establishes the two things every later feature depends on: a document validation service whose outcomes match the legacy system exactly, and a social program registry that records who changed what.

| Field | Value |
|---|---|
| **Status** | draft |
| **Legacy commit** | `b87992324dda18bdfc86e6507c3f99b86b99e35d` |
| **Evidence register** | [`docs/discovery/evidence-register.yaml`](../../docs/discovery/evidence-register.yaml) |
| **Blocked requirements** | REQ-011 (CLAR-001, CLAR-003) |

---

## Scope

**In scope.** CPF validation with legacy-equivalent outcome codes, social program registration with duplicate rejection and audit, and the read path for a registered program.

**Out of scope.** Payment calculation, batch cycles, reconciliation, eligibility scoring and dependent administration. Each becomes its own feature once this one runs end to end.

## Why this slice first

Every other SIFAP behavior calls document validation, and every administrative action is expected to leave an audit record. Building these first means later features inherit a proven validation contract instead of re-implementing one.

---

## Requirements

Requirements use EARS notation. Every requirement carries a `source_legacy:` line resolving to the pinned legacy commit, per constitution principle P1.

### Document validation

**REQ-001** — The document validation service shall expose CPF validation as the single authority for CPF correctness, with no user interface and no direct persistence.

- `source_legacy:` `github://workshop-gbb/datacorp-sifap-legacy@b87992324dda18bdfc86e6507c3f99b86b99e35d/01-archaeology/legacy-sifap/natural-programs/SUBVALCP.NSN#L1-L27`
- **Acceptance.** Given any caller, when it needs to establish CPF correctness, then it calls this service rather than implementing its own check.

**REQ-002** — If the submitted CPF is absent, blank, or consists entirely of zeros, then the document validation service shall report outcome `CPF_NOT_PROVIDED`.

- `source_legacy:` `github://workshop-gbb/datacorp-sifap-legacy@b87992324dda18bdfc86e6507c3f99b86b99e35d/01-archaeology/legacy-sifap/natural-programs/SUBVALCP.NSN#L56-L60`
- **Acceptance.** Given the CPF `00000000000`, when it is validated, then the outcome is `CPF_NOT_PROVIDED` and **not** a check-digit failure. The all-zeros case is deliberately classified as absent, matching legacy return code 1002.

**REQ-003** — If the submitted CPF contains any non-numeric character, then the document validation service shall report outcome `CPF_NOT_NUMERIC`.

- `source_legacy:` `github://workshop-gbb/datacorp-sifap-legacy@b87992324dda18bdfc86e6507c3f99b86b99e35d/01-archaeology/legacy-sifap/natural-programs/SUBVALCP.NSN#L62-L66`
- **Acceptance.** Given a CPF containing a letter or punctuation, when it is validated, then the outcome is `CPF_NOT_NUMERIC`, distinct from both absence and check-digit failure.

**REQ-004** — If the submitted CPF is eleven numeric digits but fails the modulus 11 check, then the document validation service shall report outcome `CPF_CHECK_DIGIT_INVALID`.

- `source_legacy:` `github://workshop-gbb/datacorp-sifap-legacy@b87992324dda18bdfc86e6507c3f99b86b99e35d/01-archaeology/legacy-sifap/natural-programs/SUBVALCP.NSN#L72-L78`
- **Acceptance.** Given a CPF whose check digits do not match the modulus 11 computation, when it is validated, then the outcome is `CPF_CHECK_DIGIT_INVALID`.

**REQ-005** — When the submitted CPF is eleven numeric digits and satisfies the modulus 11 check, the document validation service shall report outcome `VALID` and no message.

- `source_legacy:` `github://workshop-gbb/datacorp-sifap-legacy@b87992324dda18bdfc86e6507c3f99b86b99e35d/01-archaeology/legacy-sifap/natural-programs/SUBVALCP.NSN#L80-L82`
- **Acceptance.** Given a CPF that passes modulus 11, when it is validated, then the outcome is `VALID` and the message is empty.

**REQ-006** — If validation fails for an unexpected internal reason, then the document validation service shall report outcome `INTERNAL_ERROR` and shall not report a business outcome.

- `source_legacy:` `github://workshop-gbb/datacorp-sifap-legacy@b87992324dda18bdfc86e6507c3f99b86b99e35d/01-archaeology/legacy-sifap/natural-programs/SUBVALCP.NSN#L86-L92`
- **Acceptance.** Given an internal fault during validation, when the caller inspects the result, then it can distinguish an infrastructure failure from a rejected document. The legacy system reserves code 9999 for this.

**REQ-007** — The document validation service shall never write a CPF, in whole or in part, to a log, trace or error message.

- `source_legacy:` `[GREENFIELD]` The legacy subprogram writes no output at all, so it has no logging behavior to preserve. This requirement exists because the modern system does log, and constitution principle P6 makes identifier masking a default.
- **Acceptance.** Given any validation outcome, when logs and traces are inspected, then no CPF value appears.

### Social program registration

**REQ-008** — When an operator submits a social program registration, the system shall require the program code, name, type, base amount, eligibility code, start date, maximum per-capita income, minimum age and maximum age.

- `source_legacy:` `github://workshop-gbb/datacorp-sifap-legacy@b87992324dda18bdfc86e6507c3f99b86b99e35d/01-archaeology/legacy-sifap/natural-programs/CADPROG.NSP#L14-L27`
- **Acceptance.** Given a submission missing any listed field, when it is validated, then the request is rejected with a field-level error.

**REQ-009** — The system shall accept only the program types assistance, pension and work.

- `source_legacy:` `github://workshop-gbb/datacorp-sifap-legacy@b87992324dda18bdfc86e6507c3f99b86b99e35d/01-archaeology/legacy-sifap/natural-programs/CADPROG.NSP#L17-L17`
- **Acceptance.** Given a program type outside the three permitted values, when the registration is submitted, then it is rejected. The legacy field documents `A`, `P` and `T`.

**REQ-010** — If a social program with the submitted program code already exists, then the system shall reject the registration and shall not modify the existing program.

- `source_legacy:` `github://workshop-gbb/datacorp-sifap-legacy@b87992324dda18bdfc86e6507c3f99b86b99e35d/01-archaeology/legacy-sifap/natural-programs/CADPROG.NSP#L109-L120`
- **Acceptance.** Given an existing program code, when a registration reuses it, then the response reports a conflict and the stored program is unchanged.

**REQ-011** — When a social program is registered, the system shall store a base amount derived from the submitted amount and the program adjustment factor, rather than the submitted amount itself.

- `source_legacy:` `github://workshop-gbb/datacorp-sifap-legacy@b87992324dda18bdfc86e6507c3f99b86b99e35d/01-archaeology/legacy-sifap/natural-programs/CADPROG.NSP#L124-L125`
- **Blocked by** CLAR-001 and CLAR-003. The legacy code multiplies by a factor built from the unexplained constant `0.347215`, and narrows a `P9.2` input into a `P7.2` stored field. Neither the constant nor the narrowing may be reproduced until their intent is confirmed, because both change money.
- **Acceptance.** Deferred until both gates close. No implementation of this requirement is accepted before then.

**REQ-012** — When a social program is registered, the system shall set its status to active without asking the operator.

- `source_legacy:` `github://workshop-gbb/datacorp-sifap-legacy@b87992324dda18bdfc86e6507c3f99b86b99e35d/01-archaeology/legacy-sifap/natural-programs/CADPROG.NSP#L134-L134`
- **Acceptance.** Given a successful registration, when the stored program is read back, then its status is active, and status was not an input field.

### Audit

**REQ-013** — When a social program is registered, the system shall record an audit entry identifying the action, the affected entity and its identifier, before the registration is committed.

- `source_legacy:` `github://workshop-gbb/datacorp-sifap-legacy@b87992324dda18bdfc86e6507c3f99b86b99e35d/01-archaeology/legacy-sifap/natural-programs/CADPROG.NSP#L141-L147`
- **Acceptance.** Given a successful registration, when the audit trail is queried, then exactly one entry exists for that program code. Given a registration that fails after the audit write, then neither the program nor the audit entry survives, because both are in one transaction.

**REQ-014** — The system shall not permit an audit entry to be updated or deleted through any application path.

- `source_legacy:` `[GREENFIELD]` The legacy program only ever appends to the audit file, but nothing in the code enforces immutability. This requirement makes the existing intent explicit and enforceable, and the legacy audit trail cites IN-TCU 63/2010 as its origin.
- **Acceptance.** Given any application role, when an update or delete against the audit store is attempted, then it is refused.

---

## Traceability

| Requirement | Evidence | Status |
|---|---|---|
| REQ-001 | EV-001 | ready |
| REQ-002 | EV-002, EV-003 | ready |
| REQ-003 | EV-002 | ready |
| REQ-004 | EV-002 | ready |
| REQ-005 | EV-002 | ready |
| REQ-006 | EV-002 | ready |
| REQ-007 | `[GREENFIELD]` | ready |
| REQ-008 | EV-004 | ready |
| REQ-009 | EV-004 | ready |
| REQ-010 | EV-004 | ready |
| REQ-011 | EV-005 | **blocked** by CLAR-001, CLAR-003 |
| REQ-012 | EV-006 | ready |
| REQ-013 | EV-007 | ready |
| REQ-014 | `[GREENFIELD]` | ready |

## Definition of done

- [ ] Every ready requirement has a characterization test naming its `REQ-NNN`.
- [ ] Expected values come from the legacy code, never from the modern implementation output.
- [ ] REQ-011 remains unimplemented while CLAR-001 or CLAR-003 is open.
- [ ] No CPF appears in any log or trace.
- [ ] The slice runs end to end: schema, API, user interface and tests.
