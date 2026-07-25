## 0.0.0 (unreleased)

- Respect `prefers-reduced-motion` for `.board-card`, `.board-move-submit`, and `.drawer` transition animations; add `:focus-visible` styles to `.drawer-close` and `.board-move-submit` for keyboard navigation (WCAG 2.2 SC 2.4.7).
- CI: replace `npm install --package-lock-only && npm ci` with plain `npm ci` in JS lint job (PR #258 fix, never pushed to origin/main)
- Bump 13 transitive Python dependencies in uv.lock (certifi, charset-normalizer, click, coverage, filelock, mkdocstrings, platformdirs, python-discovery, requirements-parser, rpds-py, stevedore, typing-extensions, virtualenv) to latest compatible versions to address `uv audit` vulnerability findings.
- Bump pymdown-extensions to >=11.0.0 (GHSA-9xwg-3r6f-jcx2 path traversal fix), bump js-yaml override to >=5.2.2 (GHSA-pm4m-ph32-ghv5 DoS fix), and add brace-expansion >=5.0.8 override (GHSA-mh99-v99m-4gvg DoS fix).
- Enable `module_size` periodic agent to monitor Python modules for excessive line counts.
- Remove dead periodic presence files `security_posture.yaml` and `state_sync.yaml` (name-only, no `system_prompt`) from `.robotsix-mill/periodic/`.
- Add Playwright E2E smoke test for drawer accessibility contract (visibility, focus trap, Escape-to-close, focus restoration). Verifies `.hidden` computed visibility and real browser focus semantics that happy-dom cannot. Gated as a separate `test:e2e` npm script and CI job.
- Updated `docs/robotsix_board/architecture.md` subsystem map to match the current 10-section, 1,273-line `board.js` source: corrected all line ranges, added missing Column count update subsystem, split Gate cache and Closed-ticket toggle into separate entries, and removed phantom `_drawerOpen` / `_drawerTrigger` globals.
- Extract `_trapFocus()` helper from `_attachDrawerHandlers()` to reduce nesting depth and make focus-trap logic independently testable (PR #4bb7 follow-up).
- Moved JS test files from `tests/robotsix_board/` into `tests/robotsix_board/static/` to mirror the source tree structure.
- Bump version from 0.1.0 to 0.2.0 in `pyproject.toml` and `src/robotsix_board/__init__.py` to match the 0.2.0 release recorded in CHANGELOG.md, and add a cross-reference test (`test_version_matches_pyproject`) to prevent future drift.
- CSS Theming documentation page added to the mkdocs site (`docs/robotsix_board/theming.md`), exposing the `--board-*` custom properties table and light-theme override example that were previously only in README.md.
- Add npm override for ``fast-uri >=3.1.4`` to fix a pre-existing transitive-dependency
  vulnerability flagged by ``npm audit --audit-level=high``.
- Add JS frontend architecture documentation page (`docs/robotsix_board/architecture.md`) covering IIFE structure, subsystem map, key globals, public API, and testing patterns.
- Switch ruff pre-commit hooks from remote `astral-sh/ruff-pre-commit` to local hooks using `uv run`, making `uv.lock` the single source of truth for ruff's version.
- Refactor `openDrawer()`: extract `_buildDrawerHtml()`, `_setupDrawerA11y()`, and `_attachDrawerHandlers()` helpers to reduce function complexity from ~117 lines to ~20 lines.
- Add `aria-expanded` attribute toggle on `.board-card` elements when the detail drawer opens/closes, complementing the existing `aria-haspopup="dialog"` for screen reader support.
- Add ARIA semantics and keyboard interaction throughout the board:
  - `.board-column-cards` gets `role="list"`, `.board-card` gets `role="listitem" tabindex="0" aria-haspopup="dialog"`
  - Columns get `aria-labelledby` pointing to their `<h2>` heading
  - Move `<select>` and `<button>` get contextual `aria-label` attributes
  - Move error `<span>` gets `role="alert"` for screen-reader announcement
  - Drawer gets `role="dialog" aria-modal="true" aria-labelledby="drawer-title"`, focus moves into the drawer on open, focus is restored to the triggering card on close, Escape closes the drawer, and Tab is trapped within
  - Keyboard activation: Enter / Space on a `.board-card` opens the drawer
  - Server-fragment (`_render.py`) and JSON-hydration (`board.js`) transports updated at parity
  - `.visually-hidden` / `.sr-only` utility class added to `board.css`
  - Documented a11y contract in `docs/robotsix_board/index.md`
- Enable `changelog_autofill` periodic workflow to auto-generate changelog entries from merged PRs.
- Add `docstring_coverage` periodic task config (`.robotsix-mill/periodic/docstring_coverage.yaml`) to enable automated docstring coverage scanning of the public Python API.
- Enable periodic health check via `.robotsix-mill/periodic/health.yaml`
- Hoist `other_labels = dict(columns)` out of the column loop in `render_board()`, eliminating redundant dict construction on every iteration.
- Add `repo_description_sync` periodic workflow to keep forge description aligned with README.
- Enable `copy_paste` periodic workflow for jscpd duplication scanning.)
- Collected 97 accumulated towncrier fragments into CHANGELOG.md under `## robotsix_board 0.2.0` and added a CI fragment-count check (`.github/workflows/changelog.yml`) that warns when `changelog.d/` exceeds 50 fragments.
- Migrate from pip-audit to `uv audit` for vulnerability scanning: remove `pip-audit` dev dependency, replace `run-pip-audit: true` in CI with a dedicated `uv audit --frozen` job, and add `UV_MALWARE_CHECK=1` to all `uv sync` steps for defense-in-depth.
- Enable `audit` periodic workflow in `.robotsix-mill/periodic/audit.yaml`
- cleanup: remove stale empty tests/__init__.py left behind after PR #217 reorg
- Enable `completeness_check` periodic agent to catch protocol, rendering, and asset regressions before they reach consumers
- Enable `module_curator` periodic agent to keep `docs/modules.yaml` taxonomy accurate.
- Enable baseline periodic mill agents (`test_gap`, `bc_check`, `security_posture`) with minimal presence YAML configs under `.robotsix-mill/periodic/`.
- Add `robotsix-modules-validate` pre-commit hook and CI step to keep `docs/modules.yaml` in sync with the source tree.
- Add `## Repository scope` section to AGENT.md to help identify mis-routed tickets before they reach the implement stage.
- Pin npm commands in CI workflow by replacing bare `npm audit` and `npx` calls with `npm run` scripts from `package.json`, resolving a Scorecard "npmCommand not pinned by hash" warning.
- Fixed CONTRIBUTING.md to reference the correct `changelog.d/` directory (was incorrectly `changes/`)
- Added weekly cron workflow (`.github/workflows/bump-git-deps.yml`) to auto-bump the git-pinned `robotsix-modules` dependency, with manual `workflow_dispatch` trigger.
- Document optional duck-typed hooks (`card_extra_html`, `column_extra_html`) in the `docs/robotsix_board/index.md` BoardAdapter contract reference, matching existing method subsections.
- Fix stale method count in `docs/robotsix_board/index.md`: "eight methods" → "seven methods", matching the actual `BoardAdapter` Protocol.
- Deactivate all periodic mill workflows by removing every `.yaml` file under `.robotsix-mill/periodic/`
- Extract agent-badges rendering from `buildCardElement` into private helper `_buildAgentBadgeElements`, reducing nesting depth.
- Add `triage_boilerplate` periodic workflow config (`.robotsix-mill/periodic/triage_boilerplate.yaml`).

# Changelog

<!-- towncrier release notes start -->
# robotsix_board 0.2.0 (2026-07-17)

## Bugfixes

- Scope the `Dependency Review` workflow's concurrency group by PR number instead of `github.ref` — on `pull_request_target`, `github.ref` is always `refs/heads/main` for every PR, so any two PRs' Dependency Review runs shared one concurrency group and canceled each other (`cancel-in-progress: true`), silently turning a passing check into a "cancelled" failure whenever two PRs updated close together. (20260709T100500Z-fix-dependency-review-concurrency-group-a1c2)

## Misc

- 20260622T002619Z-robotsix-board-enable-the-deps-bump-yml-d7e5, 20260704T035246Z-add-ai-llm-contribution-policy-to-github-ea7b, 20260704T035854Z-add-codeql-yml-using-shared-reusable-wor-69ff, 20260704T035854Z-add-lint-workflows-yml-using-shared-reus-6564, 20260716T040733Z-robotsix-board-enable-completeness-check-2bc4, 20260704T040918Z-ci-fix-out-of-scope-ci-failure-lint-work-1304, 20260704T042928Z-ci-fix-out-of-scope-ci-failure-lint-work-bd26, 20260714T052616Z-robotsix-board-add-robotsix-modules-vali-745b, 20260713T072528Z-ci-failure-bump-git-pinned-deps-on-main-a550, 20260702T072620Z-enable-changelog-autofill-periodic-workf-6e80, 20260629T074206Z-ci-failure-deps-bump-on-main-c472, 20260622T074922Z-ci-failure-deps-bump-on-main-0383, 20260703T080810Z-standards-alignment-towncrier-prune-stan-77a3, 20260701T083636Z-add-security-posture-periodic-workflow-t-2adb, 20260706T093146Z-deactivate-all-periodic-mill-workflows-k-3722, 20260715T093758Z-robotsix-board-enable-module-curator-per-3827, 20260705T094818Z-centralize-shared-test-adapter-classes-i-ad1d, 20260621T102004Z-enforce-js-export-surface-convention-wit-db46, 20260621T102004Z-use-npm-ci-instead-of-npm-install-in-ci-b4b2, 20260622T102421Z-add-npm-audit-to-ci-workflow-for-javascr-edbb, 20260622T102421Z-add-nvmrc-and-use-node-version-file-in-c-07a1, 20260622T102421Z-add-ruf-ruff-specific-and-perf-performan-f989, 20260623T102903Z-add-check-jsonschema-check-github-workfl-41d4, 20260623T102903Z-add-funding-yml-to-enable-github-sponsor-f56f, 20260623T102903Z-add-project-urls-and-project-classifiers-937a, 20260623T102903Z-add-support-md-community-health-file-to-77dc, 20260624T103407Z-add-cross-file-css-class-name-consistenc-7b7b, 20260624T103407Z-add-markdownlint-cli2-pre-commit-hook-an-a935, 20260622T103743Z-ci-fix-out-of-scope-ci-failure-npm-audit-f54b, 20260625T103855Z-add-editorconfig-for-editor-agnostic-for-1544, 20260625T103855Z-add-engines-field-to-package-json-for-np-5541, 20260625T103855Z-add-logic-enforcement-eslint-rules-no-co-5809, 20260625T103855Z-consolidate-duplicate-python-ci-job-setu-f85c, 20260625T103855Z-remove-redundant-npm-install-package-loc-63e3, 20260715T104533Z-reorganize-module-robotsix-board-align-t-6d07, 20260626T104605Z-add-cross-file-test-to-validate-python-r-115f, 20260626T104605Z-add-github-codeowners-for-automated-pr-r-31e4, 20260627T105005Z-add-vitest-eslint-plugin-to-enforce-vite-f852, 20260627T105005Z-consolidate-duplicate-js-lint-and-js-tes-72c1, 20260628T105442Z-add-towncrier-start-string-to-pyproject-1986, 20260628T105442Z-extract-repo-root-module-level-constant-a27c, 20260629T110114Z-remove-orphan-numeric-towncrier-fragment-0d72, 20260629T110114Z-replace-verbatim-function-signature-copi-56f9, 20260706T110142Z-add-vitest-setupfiles-entry-to-eliminate-1fcc, 20260703T110407Z-align-coverage-gates-to-fleet-wide-80-floor-b86a, 20260703T110407Z-raise-test-coverage-to-80-and-align-both-b86a, 20260706T110444Z-ci-failure-scorecard-on-main-2112, 20260630T110804Z-add-readme-field-to-pyproject-toml-for-p-e4f3, 20260715T111637Z-remove-stale-empty-tests-init-py-acf4, 20260707T112445Z-add-weekly-auto-bump-workflow-for-git-pi-28fb, 20260715T113228Z-fix-changelog-md-entry-to-describe-remov-e994, 20260619T113950Z-pin-all-inline-github-actions-to-full-co-2a39, 20260712T120946Z-agent-md-repository-scope-this-repositor-5780, 20260620T122248Z-expand-mkdocs-site-add-api-reference-mkd-1e50, 20260620T122747Z-fix-changelog-snippet-enable-pymdownx-sn-c181, 20260621T130948Z-add-readme-badges-ci-status-pypi-version-dd36, 20260702T133648Z-add-robotsix-standards-reference-link-to-ced9, 20260702T134126Z-add-cross-file-test-to-verify-board-conf-5f63, 20260702T134126Z-add-dependabot-pre-commit-ecosystem-to-a-bd19, 20260623T141811Z-extract-performmove-helper-from-attachmo-8c1e, 20260619T142213Z-robotsixboardsetrefreshinterval-missing-f04f, 20260704T142553Z-add-openssf-scorecard-ci-workflow-for-su-1835, 20260701T143215Z-bump-globals-from-15-to-17, 20260701T143215Z-track-external-pr-robotsix-board-88-7d09, 20260701T143215Z-track-external-pr-robotsix-board-89-00a8, 20260706T143306Z-fix-contributing-md-changelog-fragment-d-3d78, 20260623T143306Z-gate-endpoint-missing-from-render-config-a62e, 20260703T143738Z-update-stale-dependabot-smoke-test-name-9832, 20260708T143915Z-expand-bootstrap-init-test-coverage-in-b-4571, 20260708T143915Z-fix-docs-robotsix-board-index-md-boardad-1ee0, 20260622T160226Z-enforce-jsdoc-correctness-with-eslint-pl-7f75, 20260701T163352Z-track-external-pr-robotsix-board-94-39da, 20260623T165008Z-enable-uv-and-npm-caching-in-ci-to-reduc-1ec8, 20260714T165300Z-robotsix-board-enable-baseline-periodic-aaac, 20260624T181454Z-add-wheel-build-and-import-smoke-test-jo-a424, 20260625T185009Z-extract-appendcardtocolumn-helper-from-a-6b68, 20260625T185009Z-split-board-test-js-into-section-mirrori-b6f8, 20260625T190229Z-add-pytest-xdist-for-parallel-test-execu-7634, 20260716T192337Z-robotsix-board-enable-audit-periodic-wor-c476, 20260704T193907Z-add-dependency-review-github-action-to-b-70a2, 20260627T195909Z-add-library-logging-nullhandler-pattern-1d18, 20260628T200129Z-replace-uv-sync-frozen-with-locked-in-ci-3aad, 20260629T203101Z-extract-render-card-helper-from-render-b-0415, 20260629T204712Z-add-typescript-checkjs-type-checking-for-692c, 20260704T205235Z-robotsix-board-add-triage-boilerplate-pe-85f8, 20260701T210003Z-add-state-sync-periodic-workflow-to-robo-a61b, 20260630T213505Z-add-deptry-to-ci-python-lint-matrix-to-e-3d61, 20260702T214949Z-drop-the-pypi-publish-workflow-release-y-786a, 20260702T220954Z-classify-docs-modules-yaml-assign-to-exi-bd19, 20260702T220954Z-classify-tests-init-py-assign-to-existin-671f, 20260705T223817Z-extract-agent-badges-rendering-from-buil-1a1f, 20260701T224827Z-add-pre-commit-ci-job-to-enforce-formatt-ff4e, 20260702T231607Z-add-dependabot-auto-merge-caller-workflo-ec75, 20260702T233319Z-add-pytest-mark-parametrize-to-test-rend-c1a7, 20260708T234202Z-document-optional-duck-typed-hooks-card-da78, 20260705T234250Z-update-pinned-workflow-sha-in-docs-yml-16ca

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
