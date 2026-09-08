# ADR-0004: Explicit one-click workshop viewer sessions

| Field | Value |
|---|---|
| Status | accepted for the synthetic workshop; review before main |
| Date | 2026-09-08 |
| Scope | REQ-116 through REQ-120 |

The user explicitly requests direct viewer access without a credential prompt in
both running workshop systems. This changes who can inspect the synthetic data:
any visitor to the public workshop can become a viewer. It does not authenticate
a real person's identity and must not be used for production benefit data.

The modern API adds an opt-in guest-session operation, disabled by default,
issuing the existing Spring Security JWT with only VIEWER authority. Server
actions store it in an HttpOnly cookie; no shared password is sent to a browser.
Credential login remains available separately for compatibility.

The legacy origin gets a small internal Node 24 session gateway using built-in
HTTP and cryptographically random opaque session identifiers. It has no database,
cloud credentials, Docker socket or admin credentials. The store is bounded and
expires sessions after one hour. Caddy validates guest sessions before proxying
only to the already restricted `ttyd-viewer`/`VIEWBENF` runtime. Operator Basic
Auth remains separate; guest cookies cannot authorize operator/admin paths.

Session creation is an explicit same-origin POST, never a GET/prefetch. Logout
invalidates the opaque legacy session and removes browser cookies. Existing
legacy WebSocket streams are capped at one hour; the viewer page closes its
iframe when navigating away. All this remains a read-only classroom environment.

Alternatives rejected: putting the viewer password in HTML or a URL; silently
removing authorization from terminal routes; using an admin account with hidden
buttons; sharing a cross-origin cookie between the two applications.

Node 24 is already the modern frontend's pinned LTS runtime. The legacy gateway
uses that same image digest and no new npm dependencies. Its native test runner
verifies session, origin, expiry and role boundaries. Static retro design assets
reuse the user's existing draft and licensed self-hosted Inter/JetBrains Mono
fonts. The draft worktree remains untouched.
