# Contributing to robotsix-board

Looking for support instead of contributing? See [SUPPORT.md](.github/SUPPORT.md).

## Changelog

Commit subjects and PR titles must follow
[Conventional Commits](https://www.conventionalcommits.org/) (`feat:`,
`fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `ci:`).
[release-please](https://github.com/googleapis/release-please) generates
`CHANGELOG.md` automatically from these prefixes — do **not** add manual
entries or changelog fragments.

## Development setup

This is a dual-language project (Python + JavaScript). A root `Makefile`
wraps the common development commands — run `make help` to list every
target. After cloning, install both Python (uv) and Node (npm) dependencies:

```bash
make install
```

Typical workflow examples:

- Run `make test-python` after backend (Python) changes.
- Run `make test-js` after frontend (JavaScript/CSS) changes.
- Run `make test-all` before committing to exercise both suites.
- Run `make lint` and `make format` to lint/format both languages.

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
