# ADR-0001: Platform baseline for the modernized SIFAP

| Field | Value |
|---|---|
| **Status** | accepted |
| **Date** | 2026-08-27 |
| **Deciders** | Modernization team |
| **Supersedes** | N/A |

---

## Context

The immersion material describes a target stack of **Java 21 + Spring Boot 3.3**. Constitution principle P4 requires every version to be re-verified against the vendor support page on the day it is chosen, rather than inherited from a document.

That verification invalidates the inherited numbers. According to the Spring Boot support page and its published release calendar:

| Generation | OSS support | Commercial support |
|---|---|---|
| 4.1.x | until 2027-07 | until 2028-07 |
| 4.0.x | until 2026-12 | until 2027-12 |
| 3.5.x | **ended 2026-06** | until 2032-06 |
| 3.3.x | **ended 2025-06** | **ended 2026-06** |

**Spring Boot 3.3 is out of both OSS and commercial support.** Starting a multi-year modernization on it would mean shipping a system that receives no security patches on the day it is written. The current release is **4.1.1** (2026-08-20).

Spring Boot publishes a supported Java range per generation: 4.1 supports **Java 17 through 26**, and 3.5 through 4.0 support Java 17 through 25. Java 25 is the current long-term-support release; Java 26 is not.

This system administers social benefit payments. It is long-lived, audited, and handles personal data, so predictable support windows matter more than novelty.

## Decision

The baseline is **Java 25 (LTS)** on **Spring Boot 4.1.x**, with **PostgreSQL** as the system of record.

- Java 25 is chosen over Java 26 because it is an LTS release and sits inside the supported range for Spring Boot 4.1.
- Spring Boot 4.1.x is chosen over 4.0.x because its OSS window extends roughly seven months further, and over 3.5.x because 3.5 OSS support has already ended.
- Exact patch versions are pinned in the build files and raised deliberately, not by floating ranges.

Every future version decision repeats this verification and records the result. A version is never carried forward because a previous document mentioned it.

## Alternatives considered

| Alternative | Why it was rejected |
|---|---|
| Java 21 + Spring Boot 3.3, as inherited from the immersion brief | Both OSS and commercial support for 3.3 have ended. The system would ship unpatched. |
| Spring Boot 3.5.x on Java 21 | OSS support ended 2026-06. It remains viable only under a paid commercial subscription, which is a procurement decision, not a default. |
| Spring Boot 4.1.x on Java 26 | Java 26 is not an LTS release, so the runtime would need replacing far sooner than the application. |

## Consequences

- **Easier:** the stack is supported for the whole expected build period, and security patches arrive without a support contract.
- **Harder:** examples, tutorials and generated code that assume Spring Boot 3.x need adjustment for 4.x package and configuration changes.
- **Risks:** the Spring Boot 4.1 OSS window closes 2027-07. A follow-up ADR must plan the move to 4.2.x or later before that date.
- **Mitigations:** dependency updates run in continuous integration, and this ADR is revisited whenever a generation approaches end of OSS support.

## References

- Spring Boot support and release calendar: <https://spring.io/projects/spring-boot#support>
- Spring Boot supported versions and Java compatibility matrix: <https://github.com/spring-projects/spring-boot/wiki/Supported-Versions>
- Spring Boot release and support timeline: <https://endoflife.date/spring-boot>
