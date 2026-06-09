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
