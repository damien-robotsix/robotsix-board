This repo follows the [robotsix stack standards](https://github.com/damien-robotsix/robotsix-standards).

## Tooling

**Rule:** When adding an optional-dependency group whose packages are CLI tools (not imported in Python code), add those packages to `DEP002` in `[tool.deptry.per_rule_ignores]`. Otherwise `deptry` (run in CI) will flag them as unused dependencies, causing CI failure.

## BoardAdapter Protocol stability

**Rule:** Never add a *required* member to the runtime-checkable `BoardAdapter` Protocol (`src/robotsix_board/__init__.py`). Because the Protocol is `@runtime_checkable`, every existing **structural** implementer (a consumer that does NOT subclass `BoardAdapter`, e.g. robotsix-auto-mail) must define *every* member to satisfy `isinstance()` — Protocol-body method defaults apply only to subclassers, never to structural implementers. Adding a required member silently breaks `isinstance()` for all of them.

For a new optional capability, add a **duck-typed hook** instead: do NOT declare it on the Protocol. Have `render_board` look it up via `getattr(adapter, name, None)` and skip it when absent — the pattern already used for `card_extra_html` / `column_extra_html` in `_render.py`.

**Rationale (2026-06-10 incident):** PR #40 added `card_extra_html` / `column_extra_html` directly to the Protocol. Its own tests passed, but every structural implementer began failing `isinstance()`, crash-looping the auto-mail board in production. Hotfix #41 moved the hooks back out to optional `getattr`-read duck-typed hooks. `tests/test_protocol_contract.py` freezes the v1 structural surface and enforces this rule in CI.

## Frontend code conventions

**Rule:** Never hard-code presentational styles via `element.style.*` (or `element.style.cssText`) assignments in JavaScript. Instead, apply a class name via `className` / `classList` and define the appearance in the corresponding CSS file (`src/robotsix_board/static/board.css`). Behavioral toggles that flip visibility on events (e.g. `el.style.display = 'none'` to show/hide) and `el.id = ...` selector-hook assignments are permitted — the rule targets *presentational* styling (color, font, margin, padding, layout, initial `display:none`), not logic.

**Rationale:** Recurring pattern in this codebase — `.hidden`, `.board-card--merged`, drawer classes, `.board-move-error`. Keeping appearance in CSS preserves separation of concerns and eases styling maintenance; inline styles also override the stylesheet, making class-based theming impossible.

### JavaScript test coverage floor

**Rule:** JS coverage is measured by `@vitest/coverage-v8` and enforced in CI via `vitest run --coverage` (the `coverage` block in `vitest.config.mjs`). The `thresholds` in `vitest.config.mjs` are set to a fleet-wide **80** coverage floor (lines, functions, branches, statements). This aligns with the Python coverage floor: `[tool.coverage.report] fail_under = 80` in `pyproject.toml` and `coverage-threshold: 80` in `.github/workflows/ci.yml`. Never lower a threshold below 80 to make a PR pass; add tests to raise coverage instead.

### Export surfaces in board.js

**Rule:** Every new module-level function in `src/robotsix_board/static/board.js` must be assigned to one of the two export surfaces at the bottom of the file: `window.robotsixBoard*` (direct assignment) for the public API, or `window.robotsixBoardInternals = { ... }` for testable helpers. All function names must use **camelCase**.

**Rationale:** Ticket `20260618T142122Z`: `getGateBlockedColumns` was the only module-level function (out of 29) missing from either export block, breaking direct unit-testability. Every other function follows this convention.
