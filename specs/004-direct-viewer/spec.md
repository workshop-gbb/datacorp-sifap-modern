# Feature 004: Public workshop landing and one-click viewer access

**REQ-116** — When a visitor opens the legacy origin, the system shall display a
public, responsive landing page describing SIFAP in the shared editorial design
language with a dark retro-terminal treatment and EN/ES/PT-BR selection.

- `source_legacy:` [GREENFIELD] The user requested a retro legacy landing consistent with the modern application and workshop site.
- Acceptance: no Basic Auth dialog on the landing; local fonts, accessible controls and a clearly non-interactive terminal illustration.

**REQ-117** — When a visitor explicitly selects the access button in either
workshop, the server shall create a time-bounded VIEWER session without requiring
the visitor to enter or receive an account password.

- `source_legacy:` [GREENFIELD] The user explicitly authorized one-click public viewer access to the synthetic classroom environments.
- Acceptance: a single click opens the dashboard or legacy viewer terminal; session cookies are HttpOnly, Secure on HTTPS and same-site.

**REQ-118** — While a guest viewer is signed in, the systems shall reject
administrative access and business writes regardless of client-supplied role,
identity, headers or URL parameters.

- `source_legacy:` [GREENFIELD] Removing the classroom password prompt must not remove server-side permission enforcement.
- Acceptance: modern mutations return 403; the legacy session only reaches the existing VIEWBENF terminal; Adabas administration remains protected.

**REQ-119** — When a viewer signs out or presents a forged/expired session, the
system shall deny further protected requests and offer the public entry point
without creating a session on a GET request.

- `source_legacy:` [GREENFIELD] Explicit user gestures, bounded sessions and logout are required for predictable direct access.
- Acceptance: login and logout use POST; cross-origin requests are rejected; no password, token or administrative credential is embedded in public assets.

**REQ-120** — Where public viewer access is not enabled, the modern system shall
retain credential-based access and shall not issue guest sessions.

- `source_legacy:` [GREENFIELD] This is an opt-in synthetic-workshop behavior, not a production authentication default.
- Acceptance: the application flag defaults false; the workshop deployment explicitly enables it; both cases are tested.
