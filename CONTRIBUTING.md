# Contributing to robotsix-board

Looking for support instead of contributing? See [SUPPORT.md](.github/SUPPORT.md).

## Changelog fragments

Every user-facing pull request must include a changelog fragment — a short
Markdown file describing the change — placed in the `changelog.d/` directory.
The file naming convention is:

```text
changelog.d/<PR_NUMBER>.<type>.md
```

Where `<type>` is one of:

- `feature` — a new feature
- `bugfix` — a bug fix
- `doc` — documentation improvement
- `removal` — a deprecation or removal
- `misc` — minor changes (tooling, CI, refactors)

A CI gate (`changelog.yml`) enforces that a fragment is present on every
PR, using `towncrier check --compare-with origin/main`.

**Skipping the check:** Trivial, non-user-facing PRs (e.g. CI tweaks,
dev-dependency bumps) can skip the gate by adding the `skip-changelog`
label to the pull request. Dependabot PRs are also excluded automatically.

## Pre-commit hooks

This repository uses [pre-commit](https://pre-commit.com) to enforce
formatting, structural, and linting checks. After cloning and installing
dependencies:

```bash
uv sync --extra dev
uv run pre-commit install
```

The configured hooks run automatically on every `git commit`. CI enforces
all hooks via `pre-commit run --all-files`.
