# ADR-0002: Isolated multilingual viewer platform

| Field | Value |
|---|---|
| Status | accepted for the synthetic workshop; peer review required before main |
| Date | 2026-09-07 |
| Scope | REQ-101 through REQ-112 |
| Supersedes | No business-rule decision or clarification gate |

## Context

Students need to explore both existing repositories as running environments. The
modern repository currently contains specifications, not an application. The user
requests a complete modern presentation layer, authenticated viewer access,
dashboards, charts, reports, integrations, and EN/ES/PT-BR localization.

The unresolved financial and document-validation rules cannot be inferred from
this request. A viewer platform can be delivered independently without enabling
benefit administration or claiming behavioral equivalence.

## Decision

Implement a separately deployed, read-only workshop increment in this existing
repository. Keep the legacy lab intact. Clearly label deterministic synthetic
data and expose only consultation and export to students.

- Retain Java 25 and Spring Boot 4.1.1 from ADR-0001 rather than reverting to the
  older instructor-kit baseline. The 4.1.1 Maven artifact and Spring Initializr
  metadata were verified on the decision date.
- Use PostgreSQL 16, Flyway migrations, Spring Data JPA, and a modular monolith.
  Query persisted records for indicators and exports; do not hardcode dashboard
  results independently of the dataset.
- Use Spring Security's authentication and Nimbus JWT support. Store only a
  bcrypt password hash in deployment configuration. A short-lived VIEWER token
  is held in an HttpOnly cookie by the Next.js backend-for-frontend. Do not
  implement cryptographic primitives or expose tokens to browser JavaScript.
- Use Next.js 15.5.24, React 19.2.8, TypeScript strict, Tailwind, and accessible
  shadcn-style components. npm availability was verified on the decision date.
  The vendor lists Next.js 15 as Maintenance LTS. Its two-year support window
  requires revisiting this baseline before a longer-lived production deployment.
- Reuse the supplied editorial design language and licensed local Inter and
  JetBrains Mono fonts. Open-source icon and component dependencies are justified
  by accessible, consistent controls; no marketing artwork is copied.
- Authenticated record links use ordinary document navigation. This deliberately
  revalidates the viewer session on each consultation and avoids speculative
  requests for every visible table row. Filters remain in the URL, so browser
  history and language changes preserve the selected view.
- Use JUnit, Testcontainers with PostgreSQL, ArchUnit, Vitest, Testing Library,
  and a small Playwright critical-path suite. These are required to verify API
  permissions, persistence, three locales, and the deployed browser experience.
- Use actual, bounded read-only integrations with the existing legacy health
  endpoint and the public IBGE states API. Report failures explicitly. Legacy
  liveness does not prove that Natural business workflows passed.
- Provision isolated Azure resources with Terraform. Cloud service credentials
  use managed identity; application secrets remain in a secret store or protected
  runtime configuration. Nothing is deployed into the legacy resource group.

## Alternatives considered

| Alternative | Reason not selected |
|---|---|
| Extend the static legacy `/app/` placeholder | It cannot demonstrate authenticated API queries, persisted records, or enforced viewer permissions. |
| Implement all unresolved benefit rules now | It would invent financial policy and violate the existing clarification gates. |
| Reuse or rebuild the live legacy VM | It would couple deployment failure and student access across both environments. |
| Public anonymous access to all demonstration data | It would not exercise the authenticated viewer experience explicitly requested. |
| Microservices per screen | There is no measured need for independent services; a modular API and one frontend are sufficient. |

## Consequences

The workshop gains a complete navigable viewer experience, but this increment
does not resolve the five existing CLAR gates or provide production benefit
administration. Authentication is workshop-specific; enterprise federation and
real payment integrations require separately approved contracts and identities.

Server-side authorization remains authoritative even if a viewer crafts requests
outside the interface. CSV export is read-only and spreadsheet-safe. Synthetic
data and fixture dates remain visible so the application cannot be mistaken for
a production financial system.

## References

- [Spring Boot support](https://spring.io/projects/spring-boot#support)
- [Spring Initializr](https://start.spring.io)
- [Next.js support policy](https://nextjs.org/support-policy)
- [React releases](https://react.dev/versions)
- [PostgreSQL versioning](https://www.postgresql.org/support/versioning/)
- [Spring Security resource server](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html)
- [IBGE locality API](https://servicodados.ibge.gov.br/api/docs/localidades)
