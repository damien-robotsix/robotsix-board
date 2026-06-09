## Pre-commit

`.pre-commit-config.yaml` must contain only `ruff` hooks from `astral-sh/ruff-pre-commit`:

- `ruff` (with `--fix`)
- `ruff-format`

No other linters (`mypy`, `detect-secrets`, etc.) belong in the pre-commit config. Deeper checks run in CI.

## Tooling

**Rule:** When adding an optional-dependency group whose packages are CLI tools (not imported in Python code), add those packages to `DEP002` in `[tool.deptry.per_rule_ignores]`. Otherwise `deptry` (run in CI) will flag them as unused dependencies, causing CI failure.
