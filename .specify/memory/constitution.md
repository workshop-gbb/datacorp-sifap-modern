# SIFAP modernization constitution

The rules every specification, plan, task and pull request in this repository must satisfy. When a rule here conflicts with convenience, the rule wins. Amending the constitution is a pull request of its own.

| Field | Value |
|---|---|
| **Applies to** | Every artifact in this repository |
| **Legacy system of record** | `workshop-gbb/datacorp-sifap-legacy` |
| **Amendment** | Pull request, one reviewer, recorded in an ADR |

---

## P1. Evidence before requirement

No requirement is accepted on the strength of a description, a brief, or a memory of how the system works. Every requirement carries a `source_legacy:` line that resolves to real legacy code, or is explicitly marked `[GREENFIELD]` with a written justification.

Evidence is cited as a pinned URI so it can never drift:

```text
github://workshop-gbb/datacorp-sifap-legacy@<40-char-sha>/<path>#L<start>-L<end>
```

A branch name or a bare path is not evidence, because both move. The SHA is mandatory.

## P2. Behavior preservation is proven, not asserted

"It behaves like the legacy system" is a claim, and a claim needs a test. Every rule extracted from the legacy system becomes a characterization test whose expected values come from the legacy code or a captured legacy run, never from what the modern implementation happens to produce.

When the modern system **intentionally** diverges from legacy behavior, the divergence is recorded as an ADR and referenced from the requirement. Silent divergence is a defect.

## P3. Unknowns are gates, not guesses

The legacy system contains constants, contradictions and dead paths whose intent nobody has confirmed. These become `CLAR-NNN` clarification gates with recorded evidence, an owner and a status. They are never resolved by inventing a plausible rule.

A `CLAR` gate blocks only the requirements that depend on it. Work continues everywhere else.

## P4. Supported versions only

Every runtime, framework and provider is pinned to a version under active support on the day it is chosen, and the choice cites the vendor support page in an ADR. Inherited version numbers are re-verified rather than copied, because a stack that was current when a document was written may be out of support when the code is built.

## P5. Simple until measured

The system starts as a modular monolith with clear internal boundaries. Distribution, additional datastores, message brokers, orchestrators and AI features are introduced only when a measured requirement demands them, and the measurement is recorded.

Boundaries are enforced in the build, not in a diagram.

## P6. Privacy and security are defaults

- Personal identifiers such as CPF and NIS are masked in logs, traces and error messages.
- Benefit amounts are never written to application logs.
- No secret, key or connection string is committed; secrets come from a managed identity or a secret store.
- Every input is validated at the system boundary, and validation failures are explicit and typed.
- Access decisions are deny by default.

## P7. Every increment ships end to end

An increment is done when it runs: schema, API, user interface and tests, deployed through the pipeline. Layers are not delivered as separate milestones, because a layer alone cannot be demonstrated or falsified.

## P8. Traceability is mechanical

- Every requirement has a stable `REQ-NNN` identifier.
- Every test names the `REQ-NNN` it covers.
- Every commit and pull request names the `REQ-NNN` or `CLAR-NNN` it advances.
- Continuous integration fails when a requirement has no evidence, or a `REQ-NNN` has no test.

Traceability that depends on a human remembering is not traceability.

---

## Definition of done for any change

- [ ] Every new or changed requirement cites pinned legacy evidence or is justified as `[GREENFIELD]`.
- [ ] Every extracted rule has a characterization test with legacy-derived expected values.
- [ ] Unconfirmed intent is recorded as a `CLAR` gate rather than guessed.
- [ ] Version choices cite a vendor support page.
- [ ] No personal identifier or amount reaches a log.
- [ ] Continuous integration is green.
