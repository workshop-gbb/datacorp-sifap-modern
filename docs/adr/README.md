# Architecture decision records

Every decision that is expensive to reverse is recorded here. An ADR explains the context that forced a choice, the choice itself, what was rejected, and what the choice costs.

| ADR | Title | Status |
|---|---|---|
| [0001](0001-platform-baseline.md) | Platform baseline for the modernized SIFAP | accepted |
| [0002](0002-viewer-workshop-platform.md) | Isolated multilingual viewer platform | accepted for the workshop; peer review before main |
| [0003](0003-isolated-workshop-host.md) | Isolated Azure workshop host | accepted for the workshop; peer review before main |
| [0004](0004-public-workshop-viewer.md) | Explicit one-click workshop viewer sessions | accepted for the workshop; peer review before main |

## Rules

- One decision per record. If a record needs the word "and" in its title, it is probably two records.
- Record the alternatives that were genuinely considered, and why each lost. A record with no rejected alternative is a description, not a decision.
- Never supersede by editing. Add a new ADR and mark the old one superseded.
- Cite sources. Constitution principle P4 requires version choices to reference a vendor support page.
