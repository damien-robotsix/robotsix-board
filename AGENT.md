## Pre-commit

`.pre-commit-config.yaml` must contain only `ruff` hooks from `astral-sh/ruff-pre-commit`:

- `ruff` (with `--fix`)
- `ruff-format`

No other linters (`mypy`, `detect-secrets`, etc.) belong in the pre-commit config. Deeper checks run in CI.
