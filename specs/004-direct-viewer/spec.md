# Feature 004: Role-based workshop sign-in

**REQ-116** — When a visitor opens the legacy origin, the system shall display a
public, responsive landing page describing SIFAP in the shared editorial design
language with a dark retro-terminal treatment and EN/ES/PT-BR selection.

- `source_legacy:` [GREENFIELD] The user requested a retro legacy landing consistent with the modern application and workshop site.
- Acceptance: no Basic Auth dialog on the landing; local fonts, accessible controls and a clearly non-interactive terminal illustration.

**REQ-121** — When a visitor signs in to either workshop, the system shall require
a username and password and shall identify the account's role on the server
without exposing its password or hash in the browser or repository.

- `source_legacy:` [GREENFIELD] The user requires explicit administrator/viewer credential sign-in for both running environments.
- Acceptance: ADMIN and VIEWER use separate accounts; invalid credentials fail generically; sessions are time-bounded and cookies are HttpOnly and Secure.

**REQ-122** — When credentials are valid, the systems shall grant only the role
bound to that account, regardless of roles supplied in headers, cookies, URL
parameters or request bodies.

- `source_legacy:` [GREENFIELD] A viewer account must never gain administrator access through client-supplied role data.
- Acceptance: legacy VIEWER reaches only VIEWBENF; ADMIN reaches the operator terminal and Adabas console; modern tokens carry the authenticated role and business mutations remain denied.

**REQ-123** — When a user signs out or presents a forged/expired session, the
system shall deny further protected requests and offer the public entry point
without creating a session on a GET request.

- `source_legacy:` [GREENFIELD] Explicit user gestures, bounded sessions and logout are required for predictable direct access.
- Acceptance: login and logout use POST; cross-origin requests are rejected; no password, token or administrative credential is embedded in public assets.

**REQ-124** — When a Natural viewer terminal disconnects, the system shall end
the associated Natural process so it does not consume the limited buffer-pool
session capacity.

- `source_legacy:` [GREENFIELD] Browser disconnections leave container-exec Natural sessions orphaned unless the session driver explicitly cleans them up.
- Acceptance: repeated connect/disconnect cycles do not exhaust the Natural CE user limit; a real VIEWBENF screen renders for the viewer.
