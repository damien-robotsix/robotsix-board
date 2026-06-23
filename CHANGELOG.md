# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- Future contributors: reference a PR/issue number in each [Unreleased] entry. -->

## [Unreleased]

### Added

- `performMove()` helper extracted from `attachMoveDelegation()` in `board.js` for the fetch + move lifecycle, exposed via `window.robotsixBoardInternals`.
- PyPI metadata: `[project.urls]` and `[project.classifiers]` in `pyproject.toml`.
- GitHub Sponsors: `.github/FUNDING.yml` pointing to `damien-robotsix`.
- `.github/SUPPORT.md` with links to Discussions, Issues, and security reporting guidance.
- `check-jsonschema` `check-github-workflows` pre-commit hook to validate GitHub Actions workflow YAML against the official schema.
- `gate_endpoint` keyword-only parameter to `render_config_script()` enabling server-to-client gate-blocking endpoint configuration.  `bootConfig()` in `board.js` automatically wires `CFG.gate_endpoint` via `robotsixBoardSetGateEndpoint()`.

## [0.1.0] - 2026-06-12

### Added

- Initial public release of the board HTML/CSS/JS chrome (`src/robotsix_board/static/`).
- Data adapter contract: the `BoardAdapter` runtime-checkable Protocol (`src/robotsix_board/__init__.py`).
- Render modes: server-rendered HTML and JSON+JS hydration (`RenderMode`).
