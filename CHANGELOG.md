## 0.0.0 (unreleased)

- Add Integrating nav entry to mkdocs.yml between Home and API Reference.
- Add Integrating page to mkdocs.yml nav so the consumer onboarding guide is reachable from the published docs site.
- Added Integrating guide to the mkdocs nav so the consumer onboarding page is reachable from the published docs site.
- Add Integrating guide to mkdocs.yml nav block between Home and API Reference.
- Add `exclude-newer = "3 days"` to `[tool.uv]` in `pyproject.toml` for supply-chain security cooldown window.
- Add `Integrating` nav entry to `mkdocs.yml` for the existing `docs/robotsix_board/integrating.md` integration guide, and remove three stale duplicate changelog entries that claimed this was already done.
- Fix incorrect test name in consumer integration guide §6: `test_board_config_script_id_consistent` → `test_board_config_id_consistent_across_python_and_js`.
- Bump `fast-uri` override from `>=3.1.4` to `>=4.1.2` to address GHSA-7p8r-x3mc-p8w7 (host confusion via backslash authority introducer).
- Added consumer integration guide (`docs/robotsix_board/integrating.md`) — transport selection, parity-contract explanation, minimal mount examples for JSON hydration and server fragments, and escaping guarantees.
- Bump `brace-expansion` override from `>=5.0.8` to `>=5.0.9` to fix GHSA-rgw5-rvv9-x895 (HIGH severity DoS).
- Remove stale `move_endpoint_template` / `BoardAdapter.move_endpoint()` references from `SECURITY.md`; rewrite "Consumer responsibility" section to document the current attack surface (duck-typed HTML hooks, `refresh_url`/`gate_endpoint`, `board-config` JSON tag).
- Add frontend code convention: vendored third-party CSS assets must be excluded from `stylelint` to preserve byte-identical upstream copies.
- Add fast-check property-based escaping oracle for JS `esc()` with raw-sigil and round-trip invariants, mirroring the Python Hypothesis oracle from PR #273.
- Adopt robotsix-ui shared base stylesheet: vendored `robotsix-ui-base.css` provides `--rsu-*` design tokens, a minimal reset, and shared component styles.  Board-specific styles now use `--rsu-*` tokens for colors, spacing, radii, fonts, and transitions, with board-only `--board-*` tokens kept for kanban-specific properties (header bg, card bg, merged accent, source badges, shadows).
- Enable `mypy_baseline` periodic agent to track mypy baseline entry counts, triage growth by error category, and file targeted draft tickets for new type errors.
- Add Hypothesis property-based escaping oracle with round-trip invariant and raw-special-character checks
- Add `[tool.uv]` and `[tool.uv.audit]` sections to `pyproject.toml` for supply-chain security: `exclude-newer = "7 days"` cooldown window, `index-strategy = "first-index"` dependency-confusion protection, and `malware-check = true` pre-install malware blocking.

## 0.2.0 (unreleased)

- Consolidate three identical focus-ring CSS rules (`.board-move-select:focus`, `.board-move-submit:focus-visible`, `.drawer-close:focus-visible`) into a single multi-selector rule to eliminate jscpd clone pairs 42 and 43.

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

### Removed

- Removed the per-card move control from the board chrome. `BoardAdapter.move_endpoint()` and `move_endpoint_template()` are gone, the `JSON_HYDRATION` config no longer emits `move_endpoint_template` / `move_method`, and `board.js` no longer builds a `<form class="board-card-move">` or handles its submit. The board is read-only chrome: moving a card between columns is the owning service's business, exposed through that service's own API. Removing members from the runtime-checkable Protocol only loosens `isinstance()`, so existing structural implementers keep passing. The gate subsystem is retained — consumers drive it directly through `window.robotsixBoardSetGate` and read it via `robotsixBoardInternals.getGateBlockedColumns()`.

### Misc

- Collect 97 accumulated towncrier changelog fragments into CHANGELOG.md
- Migrate from pip-audit to uv audit for vulnerability scanning
- robotsix-board: Enable copy_paste periodic workflow
- robotsix-board: Enable repo_description_sync periodic workflow
- robotsix-board: Enable state_sync periodic workflow
- Align ruff version between pyproject.toml and .pre-commit-config.yaml
- Hoist redundant `other_labels` dict construction out of column loop in `render_board()`
- robotsix-board: Enable docstring_coverage periodic workflow
- robotsix-board: Enable health periodic workflow
- Relax test_periodic_workflows_enabled to use subset check
- robotsix-board: Enable changelog_autofill periodic workflow
- robotsix-board: Enable survey periodic workflow
- Add ARIA roles, keyboard activation, and a11y tests to the shared board UI
- CI failure: Bump git-pinned deps on main
- Add missing `aria-expanded` toggle on `.board-card` when drawer opens/closes
- Add tsc --noEmit typecheck as a pre-commit hook
- Refactor openDrawer to extract drawer-content building and event-handler setup into smaller helpers
- Switch ruff pre-commit hooks from remote to local `language: unsupported` + `uv run` to eliminate dual-pin version drift
- Add JS frontend architecture documentation page to mkdocs site
- ci_fix: out-of-scope CI failure — JS (lint) / npm audit --audit-level=high in package.json overrides (add fast-uri >=3.1.4 override) or package-lock.json — neither touched by this PR
- Bump version from 0.1.0 to match 0.2.0 CHANGELOG release
- Extract focus-trap focus-wrapping logic from `_attachDrawerHandlers` into a dedicated `_trapFocus` helper
- Move JS test files into a tests/robotsix_board/static/ subdirectory to mirror source structure
- Add CSS theming documentation page to the mkdocs site
- Add cross-file test to verify Python and JS `esc()` produce identical output
- Update stale line ranges, subsystem numbering, and removed variables in architecture.md after focus-trap extraction shifted the IIFE layout
- Add a minimal Playwright browser smoke test for drawer focus-trap and computed visibility
- robotsix-board: Remove dead periodic presence files (security_posture.yaml, state_sync.yaml)
- robotsix-board: Enable module_size periodic workflow
- ci_fix: out-of-scope CI failure — uv audit (pymdown-extensions GHSA-9xwg-3r6f-jcx2) and npm audit --audit-level=high (brace-expansion GHSA-mh99-v99m-4gvg, js-yaml GHSA-pm4m-ph32-ghv5) in pyproject.toml / uv.lock (to bump pymdown-extensions to >=11.0.0) and package.json overrides / package-lock.json (to bump markdownlint-cli2 js-yaml override and resolve brace-expansion)
- ci_fix: out-of-scope CI failure — uv audit in uv.lock (bump 13 transitive Python dependencies to latest compatible versions: certifi 2026.5.20→2026.7.22, charset-normalizer 3.4.7→3.4.9, click 8.4.1→8.4.2, coverage 7.14.1→7.15.2, filelock 3.29.1→3.32.0, mkdocstrings 1.0.4→1.0.6, platformdirs 4.10.0→4.11.0, python-discovery 1.4.2→1.5.0, requirements-parser 0.13.0→0.13.1, rpds-py 2026.5.1→2026.6.3, stevedore 5.8.0→5.9.0, typing-extensions 4.15.0→4.16.0, virtualenv 21.5.1→21.7.0)
- Apply npm-ci simplification to JS (lint) job on origin/main
- Add `prefers-reduced-motion` support and missing focus styles to `board.css`
- Fix CHANGELOG autofill heading: `0.0.0` → `0.2.0` to match project version
- CI failure: Bump git-pinned deps on main
- Consolidate three identical focus-ring CSS rules in board.css into a single multi-selector rule
- Add `[tool.uv]` supply-chain security configuration to pyproject.toml
- Add Hypothesis property-based escaping oracle with round-trip invariant
- robotsix-board: Enable mypy_baseline periodic workflow
- Pilot adoption of robotsix-ui shared styling base in robotsix-board
- Add integrity coverage for vendored robotsix-ui-base.css (existence, @import resolution, parseability)
- Add fast-check property-based escaping oracle for JS esc()
- AGENT.md: Frontend code conventions — Vendored third-party CSS assets (e.g. `robotsix-ui-base.css`) must be excluded from `stylelint` to preserve byte-identical copies
- Reorganize module robotsix-board: align to per-module layout (src/docs/tests)
- Exclude vendored robotsix-ui-base.css from stylelint (drop from lint:css / add .stylelintignore or ignoreFiles)
- Update SECURITY.md to remove stale move_endpoint references and realign with current read-only board contract
- ci_fix: out-of-scope CI failure — JS (lint) / npm audit in package.json / package-lock.json (npm dependency update or audit exception for brace-expansion)
- Add a consumer integration guide documenting the two-transport markup-parity contract
- Add integrating.md to mkdocs.yml nav
- ci_fix: out-of-scope CI failure — JS (lint) — npm audit in package.json — bump `fast-uri` override from `>=3.1.4` to a version that patches GHSA-7p8r-x3mc-p8w7 (likely `>=4.1.2` or newer)
- Fix wrong parity-test name cited in docs/robotsix_board/integrating.md section 6

## [0.1.0] - 2026-06-12

### Added

- Initial public release of the board HTML/CSS/JS chrome (`src/robotsix_board/static/`).
- Data adapter contract: the `BoardAdapter` runtime-checkable Protocol (`src/robotsix_board/__init__.py`).
- Render modes: server-rendered HTML and JSON+JS hydration (`RenderMode`).
