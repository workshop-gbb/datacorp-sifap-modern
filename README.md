# SIFAP modern

> [!CAUTION]
> **PRIVATE.** This repository rebuilds a system that administers social benefit payments. Treat every requirement here as financially and legally consequential.

The modernized **Payment Inspection and Administration System (SIFAP)**, rebuilt from a 29-year-old Natural/Adabas system through spec-driven development. The rule that shapes everything else: **no requirement enters this repository without evidence from the legacy code.**

| Field | Value |
|---|---|
| **Method** | Spec-driven development, governed by a written constitution |
| **Legacy system of record** | `workshop-gbb/datacorp-sifap-legacy` |
| **Language** | English only |
| **Current state** | Specifications and gates; no application code yet |

---

## Why this repository exists

Most modernization projects fail because the team rebuilds the **brief** rather than the **system**. Twenty-nine years of business rules live in code nobody reads, and the rewrite quietly loses them.

This repository is built so that cannot happen quietly:

- Every requirement cites legacy code at a **pinned commit SHA**, so a citation cannot drift.
- Rules whose intent nobody has confirmed become **clarification gates**, not invented requirements.
- Continuous integration **fails** when a requirement has no evidence. The guard is tested against a deliberately invalid specification, so it is known to reject what it claims to reject.

Read [`.specify/memory/constitution.md`](.specify/memory/constitution.md) before contributing. It is short and it is binding.

---

## Repository layout

```text
.specify/memory/constitution.md      the binding rules for every artifact
docs/adr/                            architecture decision records
docs/discovery/evidence-register.yaml  pinned legacy evidence and CLAR gates
specs/<NNN>-<slice>/spec.md          EARS requirements for one increment
.github/scripts/                     the traceability validator
.github/workflows/spec-quality.yml   the gates that run on every push
```

---

## How evidence works

A requirement points at real legacy code, at a commit that cannot move:

```text
github://workshop-gbb/datacorp-sifap-legacy@<40-char-sha>/<path>#L<start>-L<end>
```

A branch name is not evidence, because branches move and line numbers shift under them. The validator rejects any citation that is not pinned, that names the wrong repository, or that names a commit other than the one the evidence register pins.

When the legacy code says something nobody can explain, that becomes a gate rather than a guess. For example, program registration multiplies the operator amount by a factor built from the constant `0.347215`, whose origin is unrecorded. Registration amounts are therefore **blocked** until the benefits policy area confirms it, because guessing would corrupt every downstream payment.

---

## Current increment

**Feature 001 — Trusted administration.** Document validation with legacy-equivalent outcomes, social program registration with duplicate rejection, and an immutable audit trail. See [`specs/001-trusted-administration/spec.md`](specs/001-trusted-administration/spec.md).

| Measure | Value |
|---|---|
| Requirements | 14 |
| Backed by legacy evidence | 12 |
| Justified as greenfield | 2 |
| Blocked by open gates | 1 |

Document validation comes first because every other SIFAP behavior calls it. Building it once, correctly, means later features inherit a proven contract instead of re-implementing one.

---

## Gates

Every push and pull request runs:

| Gate | What it enforces |
|---|---|
| `traceability` | every requirement cites pinned evidence or a justified greenfield exception |
| `markdown-lint` | consistent, readable documents |
| `repo-hygiene` | no state, plans, credentials or `.env` files are tracked |

Run them locally before pushing:

```bash
python3 .github/scripts/validate-traceability.py
npx markdownlint-cli2 "**/*.md"
```

---

## Related repositories

| Repository | Purpose |
|---|---|
| `workshop-gbb/datacorp-sifap-legacy` | the running Natural/Adabas lab and frozen corpus |
| `workshop-gbb/datacorp-sifap-instructor-kit-pt-br` | instructor kit and decks |
| `workshop-gbb/datacorp-sifap-team-kit-pt-br` | public participant kit |

The facilitator answer key is **never** copied into this repository. It may guide where to look, but a requirement is justified by the legacy code it cites, not by an answer sheet.
