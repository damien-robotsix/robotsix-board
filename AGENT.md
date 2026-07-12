This repo follows the [robotsix stack standards](https://github.com/damien-robotsix/robotsix-standards).

## Repository scope

**Rule:** This repository (`robotsix-board`) implements the shared Kanban board rendering library (`src/robotsix_board/`), the `BoardAdapter` protocol, tests, and frontend conventions. Tickets that describe application-layer UX features (session management, prompt submission, chat panels, subsession panels) or CI/DevOps configuration belong to consumer repositories such as `robotsix-auto-mail` or `robotsix-mill`. If you are unsure whether a ticket belongs here, verify that the fix would change a file under `src/robotsix_board/` or `tests/` before filing.

**Rationale:** Multiple mis-routed tickets (2026-07-06 'Prompt and answer lost when switching session', 2026-07-06 'Subsession panel auto-scrolls up', 2026-07-12 'Subsession panel preserve scroll position') were filed to robotsix-board describing features that do not exist in this codebase. Each mis-routing wastes refine-stage resources ($0.0013, ~38s) before being caught at the implement stage. A scope rule at the top of AGENT.md helps both human contributors and mill agents recognize out-of-scope tickets earlier.

## BoardAdapter Protocol stability

**Rule:** Never add a *required* member to the runtime-checkable `BoardAdapter` Protocol (`src/robotsix_board/__init__.py`). Because the Protocol is `@runtime_checkable`, every existing **structural** implementer (a consumer that does NOT subclass `BoardAdapter`, e.g. robotsix-auto-mail) must define *every* member to satisfy `isinstance()` — Protocol-body method defaults apply only to subclassers, never to structural implementers. Adding a required member silently breaks `isinstance()` for all of them.

For a new optional capability, add a **duck-typed hook** instead: do NOT declare it on the Protocol. Have `render_board` look it up via `getattr(adapter, name, None)` and skip it when absent — the pattern already used for `card_extra_html` / `column_extra_html` in `_render.py`.

**Rationale (2026-06-10 incident):** PR #40 added `card_extra_html` / `column_extra_html` directly to the Protocol. Its own tests passed, but every structural implementer began failing `isinstance()`, crash-looping the auto-mail board in production. Hotfix #41 moved the hooks back out to optional `getattr`-read duck-typed hooks. `tests/test_protocol_contract.py` freezes the v1 structural surface and enforces this rule in CI.

## Frontend code conventions

Fleet-wide frontend conventions (lockfile discipline, vitest coverage floor, no-inline-styles, export surfaces) are owned by the [robotsix-standards JavaScript page](https://damien-robotsix.github.io/robotsix-standards/javascript/).  This file covers only board-specific rules.
