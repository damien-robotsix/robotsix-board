# Security Policy

## Supported versions

We release patches for security vulnerabilities on the **latest release
only**. Older versions do not receive security fixes.

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |
| < latest | :x:                |

## Reporting a vulnerability

If you discover a security vulnerability, please **do not** open a
public issue.

Instead, report it by one of these channels:

- **GitHub Security Advisory** — use the
  [private vulnerability reporting](https://github.com/damien-robotsix/robotsix-board/security/advisories/new)
  form.
- **Email** — send a description to `damien.robotsix@gmail.com`.

We aim to acknowledge your report within 72 hours and to provide a
preliminary assessment within 5 business days.

## Security considerations

The library provides HTML/CSS/JS board chrome and DOM-rendering helpers.
It does not handle authentication, authorization, or CSRF protection —
those are the consumer's responsibility.  Below is a summary of the
security model for consumers who embed the board.

### HTML escaping

Every user-visible value interpolated into HTML is escaped:

- **Server-side** (`_render.py`): the `esc()` function delegates to
  `html.escape(s, quote=True)`, which escapes `&`, `<`, `>`, `"`, and
  `'`.
- **Client-side** (`board.js`): `esc()` applies an equivalent regex
  replacement (`/[&<>"']/g`) against the same five characters.

The sole `innerHTML` assignment in the library — the detail drawer
populated by `openDrawer()` — only receives values that were already
escaped and extracted via `textContent` from existing DOM elements.
Those values are re-escaped through `esc()` before interpolation.

### `board-config` JSON blob

In `JSON_HYDRATION` mode the server emits a
`<script id="board-config" type="application/json">` element whose
content is produced by `json.dumps()`.  The client reads this element
with `textContent` + `JSON.parse()` — no executable JavaScript is ever
parsed from the tag.  An attacker who controls the JSON payload can
corrupt the board's client-side configuration but cannot execute
arbitrary script through this channel.

### URL interpolation

The client replaces the `{card_id}` and `{target_status}` placeholders
in `move_endpoint_template` with `encodeURIComponent()`-encoded values,
preventing injection of additional path segments or query-string
parameters.

### Consumer responsibility for adapter URLs

`BoardAdapter` implementers control every piece of card content (title,
badges, timestamps).  The library escapes that content, but
`BoardAdapter.move_endpoint()` and `BoardAdapter.move_endpoint_template()`
return URLs that the library uses verbatim.  Consumers **must** ensure
those URLs are safe:

- Use `https:` endpoints on trusted hosts.
- Never return `javascript:` or `data:` URIs.
- Validate that the URL host is not attacker-controlled (e.g. avoid
  raw user input in the URL).

### Content Security Policy

Consumers embedding the board in a page should deploy a Content
Security Policy that restricts `script-src` and `object-src`.  The
board ships:

- No inline event handlers (`onclick`, `onerror`, etc.).
- A single inline `<script>` element — the `board-config` JSON tag
  (see above).

A nonce-based or hash-based CSP is therefore feasible: the consumer can
generate a nonce for the `board-config` script at render time and
include it in the `script-src` directive.

### No authentication or authorization

The board is a pure frontend chrome library.  It does **not** perform
authentication, authorization, session management, or CSRF protection.
All of those concerns belong to the consuming application.  In
particular, the move endpoint (the only state-changing request the
board makes) must be protected by the consumer with appropriate
same-origin and anti-CSRF measures.
