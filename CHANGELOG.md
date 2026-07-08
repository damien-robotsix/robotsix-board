## 0.0.0 (unreleased)

- Pin npm commands in CI workflow by replacing bare `npm audit` and `npx` calls with `npm run` scripts from `package.json`, resolving a Scorecard "npmCommand not pinned by hash" warning.
- Fixed CONTRIBUTING.md to reference the correct `changelog.d/` directory (was incorrectly `changes/`)
- Added weekly cron workflow (`.github/workflows/bump-git-deps.yml`) to auto-bump the git-pinned `robotsix-modules` dependency, with manual `workflow_dispatch` trigger.
- Document optional duck-typed hooks (`card_extra_html`, `column_extra_html`) in the `docs/robotsix_board/index.md` BoardAdapter contract reference, matching existing method subsections.
- Fix stale method count in `docs/robotsix_board/index.md`: "eight methods" → "seven methods", matching the actual `BoardAdapter` Protocol.
- Deactivate all periodic mill workflows by removing every `.yaml` file under `.robotsix-mill/periodic/`
- Added automated release workflow that triggers on pushes to `main`
  when a towncrier changelog fragment is present, using the shared
  `auto-release.yml` reusable workflow for version bumping, CHANGELOG
  assembly, tagging, and PyPI publishing.
- Extract agent-badges rendering from `buildCardElement` into private helper `_buildAgentBadgeElements`, reducing nesting depth.
- Add `triage_boilerplate` periodic workflow config (`.robotsix-mill/periodic/triage_boilerplate.yaml`).

# Changelog

<!-- towncrier release notes start -->

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- Future contributors: reference a PR/issue number in each [Unreleased] entry. -->

## [Unreleased]

### Changed

- Extract card-rendering logic from `render_board()` into a private `_render_card()` helper, reducing nesting depth and making card rendering independently testable.
- CI: enable `setup-uv` cache and `setup-node` npm cache across all jobs, cutting install time for cache hits.

### Fixed

- Replaced verbatim `render_board()` and `render_config_script()` signature copies in `docs/robotsix_board/index.md` with a prose summary and cross-reference to the auto-generated API reference, eliminating a drift-prone 48-line duplicate.

- `render_board()` and `render_config_script()` now catch exceptions from adapter method calls, logging a WARNING and continuing (skipping the failing card or falling back to empty config) instead of crashing.
- Add `start_string` configuration to `[tool.towncrier]` in `pyproject.toml` and the corresponding `<!-- towncrier release notes start -->` marker comment in `CHANGELOG.md` so `towncrier build` inserts release notes at the correct position below the `# Changelog` heading.
- `render_config_script` now references `RenderMode.JSON_HYDRATION.value` instead of a hardcoded `"json_hydration"` string, keeping the canonical source in the StrEnum. Added a cross-file smoke test to catch drift between the Python enum value and the JS bail-out checks in `board.js`.
- Replace `uv sync --frozen` with `uv sync --locked` in CI and documentation to catch stale lockfiles at PR time, matching the `changelog.yml` workflow which already used `--locked`.

### Added

- TypeScript `checkJs` type-checking for `board.js`: `tsconfig.json` with `checkJs: true` and `strict: true`, `typescript` devDependency, `typecheck` npm script, and CI lint step (`npx tsc --noEmit`) to validate JSDoc type annotations at PR time.
- `logging.NullHandler` in `robotsix_board.__init__` so consumers can configure logging without "No handler found" warnings, following the stdlib library-logging convention.
- `@vitest/eslint-plugin` devDependency with `recommended` config applied to test files in `eslint.config.mjs`, catching `test.only()`, `describe.only()`, missing `expect()`, and duplicate test titles at lint time.
- `pytest-xdist` dependency and `-n auto` in `addopts` for parallel test execution in CI and locally.
- `.editorconfig` at repo root for editor-agnostic formatting defaults (4-space for Python, 2-space for JS/CSS/YAML, UTF-8, LF endings).
- ESLint logic-enforcement rules: `no-console`, `no-debugger`, `eqeqeq`, `prefer-const`, `curly`, and `no-alert` added to `eslint.config.mjs` for parity with Python-side ruff strictness.
- `engines` field in `package.json` and `engine-strict=true` in `.npmrc` to enforce minimum Node.js version (`>=20.0.0`), matching `.nvmrc`.
- `build-smoke` CI job: builds a wheel (`uv build`) and verifies it imports cleanly in a fresh ephemeral environment (`uv run --with dist/*.whl --no-project`), catching packaging regressions at PR time.
- Add `markdownlint-cli2` pre-commit hook and CI step to lint all Markdown files for accessibility and formatting issues.
- `performMove()` helper extracted from `attachMoveDelegation()` in `board.js` for the fetch + move lifecycle, exposed via `window.robotsixBoardInternals`.
- `appendCardToColumn()` helper extracted from `applyCardDiff()` in `board.js` to encapsulate column-find-and-append logic, reducing nesting depth from 5 to 3, exposed via `window.robotsixBoardInternals`.
- Cross-file CSS class name consistency tests: Vitest test validates every JS-side class name has a matching rule in `board.css`, and Python test validates every `render_board()` class name exists in `board.css`.
- PyPI metadata: `[project.urls]` and `[project.classifiers]` in `pyproject.toml`.
- GitHub Sponsors: `.github/FUNDING.yml` pointing to `damien-robotsix`.
- `.github/SUPPORT.md` with links to Discussions, Issues, and security reporting guidance.
- `check-jsonschema` `check-github-workflows` pre-commit hook to validate GitHub Actions workflow YAML against the official schema.
- `gate_endpoint` keyword-only parameter to `render_config_script()` enabling server-to-client gate-blocking endpoint configuration.  `bootConfig()` in `board.js` automatically wires `CFG.gate_endpoint` via `robotsixBoardSetGateEndpoint()`.
- `readme = "README.md"` field in `pyproject.toml` so `hatchling` includes the README in the package description on PyPI.

## [0.1.0] - 2026-06-12

### Added

- Initial public release of the board HTML/CSS/JS chrome (`src/robotsix_board/static/`).
- Data adapter contract: the `BoardAdapter` runtime-checkable Protocol (`src/robotsix_board/__init__.py`).
- Render modes: server-rendered HTML and JSON+JS hydration (`RenderMode`).
