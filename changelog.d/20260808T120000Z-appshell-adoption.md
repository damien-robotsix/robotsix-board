### Added

- Adopted shared AppShell navigation chrome from robotsix-ui v0.1.40
  (`render_appshell()`, `AppShellConfig` TypedDict).
- Vendored `vanilla.js` (framework-free mount script for AppShell) alongside
  the existing `robotsix-ui-base.css`.
- `mountAppShell` vitest suite (`tests/robotsix_board/static/appshell.test.js`).

### Changed

- Aligned vendored `robotsix-ui-base.css` from v0.1.2 to v0.1.40 (now
  concatenates `tokens.css` + `base.css` + `components.css` + `utilities.css`).
- Updated `.github/workflows/bump-git-deps.yml` to track the latest v0.1.x
  tag (instead of `main` HEAD) and to fetch `vanilla.js` from the GitHub
  release alongside the CSS.
- Exported `render_appshell` and `AppShellConfig` from the public
  `robotsix_board` surface.
- Updated E2E fixture (`board.html`) to include the AppShell header.
