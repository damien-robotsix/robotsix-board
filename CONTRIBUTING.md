# Contributing to robotsix-board

Looking for support instead of contributing? See [SUPPORT.md](.github/SUPPORT.md).

## Changelog

Commit subjects and PR titles must follow
[Conventional Commits](https://www.conventionalcommits.org/) (`feat:`,
`fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `ci:`).
[release-please](https://github.com/googleapis/release-please) generates
`CHANGELOG.md` automatically from these prefixes — do **not** add manual
entries or changelog fragments.

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
