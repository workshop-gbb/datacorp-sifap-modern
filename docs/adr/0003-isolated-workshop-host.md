# ADR-0003: Isolated Azure workshop host

| Field | Value |
|---|---|
| Status | accepted for the workshop; peer review before main |
| Date | 2026-09-07 |
| Scope | REQ-112 |

## Decision

Run the read-only increment on an isolated Linux VM in `sifap-modern-rg-eus2`.
Docker Compose runs a Caddy HTTPS gateway, the Next.js frontend, the Spring API,
and PostgreSQL 16 on an internal network with a persistent volume.

The tenant currently restricts older small SKUs such as `Standard_B2s`.
`Standard_D2s_v7` was verified available with sufficient quota. The legacy lab
already runs this family, but the modern host has its own network, disk, public
address, runtime and secret store.

The VM managed identity reads runtime credentials from its own Key Vault. During
initialization only, `bootstrap_secrets=true` grants that workload identity
secret-write access so it can seed the new vault. Immediately afterward Terraform
replaces that grant with `Key Vault Secrets User`. No role is granted to the
operator identity or the assistant. Secrets are never embedded in cloud-init.
The tenant disables public Key Vault networking; the host uses a private endpoint
and its own linked private DNS zone. Secure Boot, vTPM and platform agent updates
are declared explicitly to preserve the tenant's hardening without replacing the
VM on the next plan.

## Alternatives

| Alternative | Trade-off |
|---|---|
| Container Apps and managed PostgreSQL | Preferred for a production service, but adds identity bootstrap, networking and independent provisioning lifecycles beyond the workshop's measured needs. |
| Reuse the legacy host | Rejected because deployment failure or resource contention would affect both environments. |
| Static frontend and in-browser fixtures | Rejected because it does not test the API, persisted records or actual viewer authorization. |

## Limits and operational responsibilities

This is a classroom deployment, not a highly available financial production
system. The single host is a failure domain. PostgreSQL data and TLS certificates
survive container restarts; operators must retain an encrypted backup before
replacing its disk. The VM resource has Terraform destruction protection.

The initial operator Terraform state is kept outside Git in a protected directory
on the operator volume. Multi-operator automation must migrate it to an Azure
Storage backend using Entra authentication and an approved, scoped identity;
access must not be granted implicitly to the executing assistant.

All base images are pinned by digest. Java and frontend builds occur in separate
build stages. Runtime application containers use non-root accounts, read-only
root filesystems and dropped capabilities. PostgreSQL is not published on a host
port. Student access is limited to HTTPS; SSH is restricted to one operator /32.
