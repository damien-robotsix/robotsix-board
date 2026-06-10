## Pre-commit

`.pre-commit-config.yaml` must contain these hooks:

- `pre-commit/pre-commit-hooks`: `trailing-whitespace`, `end-of-file-fixer`, `check-yaml`, `check-toml`, `check-merge-conflict`, `check-added-large-files` (`--maxkb=500`), `detect-private-key`, `check-json`
- `astral-sh/ruff-pre-commit`: `ruff` (`--fix`), `ruff-format`
- `local` (`mypy`): `uv run mypy src tests`
- `PyCQA/bandit`: `bandit` (`-ll`)
- `Yelp/detect-secrets`: `detect-secrets` (`--baseline .secrets.baseline`)

These are the expected hooks. Deeper checks run in CI.

## Tooling

**Rule:** When adding an optional-dependency group whose packages are CLI tools (not imported in Python code), add those packages to `DEP002` in `[tool.deptry.per_rule_ignores]`. Otherwise `deptry` (run in CI) will flag them as unused dependencies, causing CI failure.

## BoardAdapter Protocol stability

**Rule:** Never add a *required* member to the runtime-checkable `BoardAdapter` Protocol (`src/robotsix_board/__init__.py`). Because the Protocol is `@runtime_checkable`, every existing **structural** implementer (a consumer that does NOT subclass `BoardAdapter`, e.g. robotsix-auto-mail) must define *every* member to satisfy `isinstance()` — Protocol-body method defaults apply only to subclassers, never to structural implementers. Adding a required member silently breaks `isinstance()` for all of them.

For a new optional capability, add a **duck-typed hook** instead: do NOT declare it on the Protocol. Have `render_board` look it up via `getattr(adapter, name, None)` and skip it when absent — the pattern already used for `card_extra_html` / `column_extra_html` in `_render.py`.

**Rationale (2026-06-10 incident):** PR #40 added `card_extra_html` / `column_extra_html` directly to the Protocol. Its own tests passed, but every structural implementer began failing `isinstance()`, crash-looping the auto-mail board in production. Hotfix #41 moved the hooks back out to optional `getattr`-read duck-typed hooks. `tests/test_protocol_contract.py` freezes the v1 structural surface and enforces this rule in CI.
