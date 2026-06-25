# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- Future contributors: reference a PR/issue number in each [Unreleased] entry. -->

## [Unreleased]

### Added

- ESLint logic-enforcement rules: `no-console`, `no-debugger`, `eqeqeq`, `prefer-const`, `curly`, and `no-alert` added to `eslint.config.mjs` for parity with Python-side ruff strictness.

- `build-smoke` CI job: builds a wheel (`uv build`) and verifies it imports cleanly in a fresh ephemeral environment (`uv run --with dist/*.whl --no-project`), catching packaging regressions at PR time.
- Add `markdownlint-cli2` pre-commit hook and CI step to lint all Markdown files for accessibility and formatting issues.
- `performMove()` helper extracted from `attachMoveDelegation()` in `board.js` for the fetch + move lifecycle, exposed via `window.robotsixBoardInternals`.
- Cross-file CSS class name consistency tests: Vitest test validates every JS-side class name has a matching rule in `board.css`, and Python test validates every `render_board()` class name exists in `board.css`.
- PyPI metadata: `[project.urls]` and `[project.classifiers]` in `pyproject.toml`.
- GitHub Sponsors: `.github/FUNDING.yml` pointing to `damien-robotsix`.
- `.github/SUPPORT.md` with links to Discussions, Issues, and security reporting guidance.
- `check-jsonschema` `check-github-workflows` pre-commit hook to validate GitHub Actions workflow YAML against the official schema.
- `gate_endpoint` keyword-only parameter to `render_config_script()` enabling server-to-client gate-blocking endpoint configuration.  `bootConfig()` in `board.js` automatically wires `CFG.gate_endpoint` via `robotsixBoardSetGateEndpoint()`.

### Changed

- CI: enable `setup-uv` cache and `setup-node` npm cache across all jobs, cutting install time for cache hits.

## [0.1.0] - 2026-06-12

### Added

- Initial public release of the board HTML/CSS/JS chrome (`src/robotsix_board/static/`).
- Data adapter contract: the `BoardAdapter` runtime-checkable Protocol (`src/robotsix_board/__init__.py`).
- Render modes: server-rendered HTML and JSON+JS hydration (`RenderMode`).
