# ADR-0004: Credentialed administrator and viewer sessions

| Field | Value |
|---|---|
| Status | accepted for the synthetic workshop; review before main |
| Date | 2026-09-08 |
| Scope | REQ-116 and REQ-121 through REQ-124 |

The user requires both running systems to authenticate with username, password
and an explicit ADMIN/VIEWER selector. The selected value is a request, not an
authorization decision: credentials are bound to one role on the server.

The modern API keeps one login operation and two independently hashed accounts.
It issues the existing Spring Security JWT with the authenticated authority.
Server actions store it in an HttpOnly cookie. No guest-session operation exists.
The current modern API exposes consultation only, so ADMIN is a distinct identity
but does not invent writes blocked by the open clarification gates.

The legacy origin gets a small internal Node 24 sign-in gateway using built-in
HTTP, scrypt password hashes and cryptographically random opaque sessions. It has
no database, cloud credentials or Docker socket. Caddy strips client role headers,
validates the server session and sends VIEWER only to `ttyd-viewer`/`VIEWBENF`;
ADMIN reaches the operator terminal and Adabas console.

Sign-in is an explicit same-origin POST, never a GET/prefetch. Logout invalidates
the session. Legacy WebSocket streams are capped at one hour. The restricted
session driver terminates its Natural process when the browser disconnects,
preventing orphan sessions from exhausting the Natural CE buffer pool.

Alternatives rejected: storing plaintext passwords in Git or HTML; allowing the
selector to define the granted role; using an admin account with hidden buttons;
sharing a cross-origin session between applications.

Node 24 is already the modern frontend's pinned LTS runtime. The legacy gateway
uses that same image digest and no new npm dependencies. Its native test runner
verifies session, origin, expiry and role boundaries. Static retro design assets
reuse the user's existing draft and licensed self-hosted Inter/JetBrains Mono
fonts. The draft worktree remains untouched.
