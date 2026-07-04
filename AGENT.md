This repo follows the [robotsix stack standards](https://github.com/damien-robotsix/robotsix-standards).

## BoardAdapter Protocol stability

**Rule:** Never add a *required* member to the runtime-checkable `BoardAdapter` Protocol (`src/robotsix_board/__init__.py`). Because the Protocol is `@runtime_checkable`, every existing **structural** implementer (a consumer that does NOT subclass `BoardAdapter`, e.g. robotsix-auto-mail) must define *every* member to satisfy `isinstance()` — Protocol-body method defaults apply only to subclassers, never to structural implementers. Adding a required member silently breaks `isinstance()` for all of them.

For a new optional capability, add a **duck-typed hook** instead: do NOT declare it on the Protocol. Have `render_board` look it up via `getattr(adapter, name, None)` and skip it when absent — the pattern already used for `card_extra_html` / `column_extra_html` in `_render.py`.

**Rationale (2026-06-10 incident):** PR #40 added `card_extra_html` / `column_extra_html` directly to the Protocol. Its own tests passed, but every structural implementer began failing `isinstance()`, crash-looping the auto-mail board in production. Hotfix #41 moved the hooks back out to optional `getattr`-read duck-typed hooks. `tests/test_protocol_contract.py` freezes the v1 structural surface and enforces this rule in CI.

## Frontend code conventions

Fleet-wide frontend conventions (lockfile discipline, vitest coverage floor, no-inline-styles, export surfaces) are owned by the [robotsix-standards JavaScript page](https://damien-robotsix.github.io/robotsix-standards/javascript/).  This file covers only board-specific rules.
