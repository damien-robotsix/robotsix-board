# Contributing to robotsix-board

Welcome! This document outlines the process for contributing to
robotsix-board, the shared kanban-board frontend library.

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before
participating — we expect everyone to follow it.

## Reporting bugs

Use the [Bug Report](https://github.com/damien-robotsix/robotsix-board/issues/new?template=01-bug.yml)
issue form. Include:

- A clear description of what happened vs. what you expected.
- Minimal reproduction steps.
- The library version you are using.
- Any relevant logs or error messages.

For **security vulnerabilities**, do NOT open a public issue. See
[SECURITY.md](../SECURITY.md) for the private reporting process.

## Feature requests

Use the [Feature Request](https://github.com/damien-robotsix/robotsix-board/issues/new?template=02-feature.yml)
issue form. Describe the problem you are trying to solve, any
alternatives you have considered, and (if you have one) a proposed
approach.

## Development setup

Clone the repository and install development dependencies:

```bash
uv sync --extra dev
```

Install the pre-commit hooks (this runs linting, formatting, type-checking,
and secret scanning before every commit):

```bash
uv run pre-commit install
```

## Code quality

All contributions must pass the same checks that CI runs:

| Tool | Command | What it checks |
|------|---------|----------------|
| ruff (lint) | `uv run ruff check .` | Python style & correctness |
| ruff (format) | `uv run ruff format .` | Consistent formatting |
| mypy | `uv run mypy src tests` | Static type checking |
| bandit | `uv run bandit -r src -ll` | Security linting |
| detect-secrets | `uv run detect-secrets scan --baseline .secrets.baseline` | No committed secrets |
| deptry | `uv run deptry .` | Dependency hygiene |
| pytest | `uv run pytest` | All tests pass with 100% branch coverage |
| eslint | `npx eslint src/robotsix_board/static/board.js` | JavaScript linting |

Run everything at once with the pre-commit hook:

```bash
uv run pre-commit run --all-files
```

## Pull request process

1. **Branch naming** — use a descriptive kebab-case name (e.g.
   `fix-move-endpoint-encoding`, `feat-column-badge-filter`).

2. **One logical change per PR** — keep the diff focused. If you
   find yourself fixing unrelated things, open a separate PR.

3. **Conventional commits** are encouraged — `feat:`, `fix:`, `docs:`,
   `chore:`, `refactor:`, `test:` prefixes help with changelog
   generation.

4. **CI must pass** — all jobs in `.github/workflows/ci.yml` must
   be green before a maintainer will review. Run the checks locally
   first (see the table above).

5. **Add a changelog entry** — if your change is user-visible, add
   a `[Unreleased]` entry to `CHANGELOG.md`.

6. **AGENT.md rules** — the repo has an `AGENT.md` that documents
   tooling constraints every contributor must follow:
   - CLI-only dependencies must be listed under `DEP002` in
     `[tool.deptry.per_rule_ignores]` (see the existing `mkdocs`
     and `mkdocs-material` entries for the pattern).
   - Never add a required member to the `BoardAdapter` Protocol
     (`src/robotsix_board/__init__.py`) — it is `@runtime_checkable`
     and structural implementers would break. Use duck-typed
     `getattr` hooks for optional capabilities instead.
   - Presentational styles belong in `board.css`, not in inline
     `element.style.*` JavaScript assignments.

## License

By contributing, you agree that your contributions will be licensed
under the MIT License (see [LICENSE](../LICENSE)).
