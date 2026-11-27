[![CI](https://github.com/damien-robotsix/robotsix-board/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/damien-robotsix/robotsix-board/actions/workflows/ci.yml?query=branch%3Amain)
[![License](https://img.shields.io/github/license/damien-robotsix/robotsix-board?style=flat)](https://github.com/damien-robotsix/robotsix-board/blob/main/LICENSE)
[![PyPI version](https://img.shields.io/pypi/v/robotsix-board?style=flat)](https://pypi.org/project/robotsix-board/)
[![Python versions](https://img.shields.io/pypi/pyversions/robotsix-board?style=flat)](https://pypi.org/project/robotsix-board/)

# robotsix-board

Shared kanban-board frontend library: column-per-status board of cards with auto-refresh and a click-through detail panel. Owns the board HTML/CSS/JS chrome, parameterized by a small data adapter (column order, card fields) and a render mode (server-rendered fragments vs JSON+JS hydration). The chrome is read-only — moving a card between columns is the owning service's business, done through that service's own API. Consumed by robotsix-mill (FastAPI + static files) and robotsix-auto-mail (stdlib BaseHTTPRequestHandler + inline Jinja).

## Installation

From source via git+https (recommended until the first PyPI release):

```bash
pip install "robotsix-board @ git+https://github.com/damien-robotsix/robotsix-board.git"
```

Or add it to your consumer `pyproject.toml`:

```toml
dependencies = [
    "robotsix-board @ git+https://github.com/damien-robotsix/robotsix-board.git",
]
```

`pip install robotsix-board` (PyPI) will work once the package is published.

## Usage

The library owns the board HTML/CSS/JS chrome and is parameterized by two things:

- **A data adapter** that describes the board's shape — the column order and which card fields to display.
- **A render mode** that selects how the board is produced — server-rendered HTML fragments, or a JSON payload hydrated by the bundled JavaScript.

This lets it be consumed by both robotsix-mill (FastAPI + static files) and robotsix-auto-mail (stdlib `BaseHTTPRequestHandler` + inline Jinja).

> **Note:** The public API is now available. Import the adapter contract and render-mode selector via `robotsix_board.BoardAdapter` and `robotsix_board.RenderMode`. The packaged static assets are accessed via `robotsix_board.static_dir()`. See the Design contract section below for full documentation.

## Development

This is a dual-language project (Python + JavaScript). A root `Makefile`
provides a discoverable interface to the common development commands. List
every target with:

```bash
make help
```

Clone the repository, then install both Python (uv) and Node (npm)
development dependencies:

```bash
make install
```

Run the test suites:

```bash
make test-python   # pytest with coverage
make test-js       # vitest + Playwright e2e
make test-all      # both of the above
```

Lint and format both languages:

```bash
make lint          # ruff, mypy, bandit, eslint, stylelint
make format        # ruff format + eslint --fix
```

Each target wraps the underlying tools directly, so you can still call them
by hand (e.g. `uv run pytest`, `uv run ruff check .`, `npm run test:js`).
To run all pre-commit hooks at once:

```bash
uv run pre-commit run --all-files
```

CI runs `uv lock` → `uv sync --locked --extra dev` → `uv run deptry .` → tests.

## Contributing

Open a focused PR against the default branch. Ensure ruff (lint + format) and tests pass and pre-commit hooks are clean before submitting. Code style is enforced by ruff.

## Design contract

This section documents the interface the follow-on build-out and the two
consumer-migration tickets target. It is the source of truth for the shape of
the board; the library implementation must not drift from it.

### Data adapter contract

A consumer drives the board by supplying an adapter (see
`robotsix_board.BoardAdapter`) that answers:

- **Column order + labels** — the ordered list of `(status_key, label)`
  pairs. Column order is significant: it is the left-to-right order columns
  appear on the board, and the labels are the human-readable column headings.
- **Card-field accessors** — given a card object, the adapter exposes:
  - `id` — a stable identifier (used as the DOM/card key).
  - `title` — the display title.
  - `badges` — zero or more short badge labels.
  - `timestamps` — named timestamp fields (e.g. created / updated).
- **Structural HTML hooks (optional)** — two optional adapter methods inject
  trusted raw HTML into the server-rendered markup (`SERVER_FRAGMENTS` only):
  - `card_extra_html(card) -> str` — output is injected inside `.board-card`,
    immediately after the timestamps block.
  - `column_extra_html(status_key) -> str` — output is injected inside
    `.board-column`, after the `.board-column-cards` list.

  **Trust boundary:** hook output is emitted VERBATIM, bypassing `esc()`. The
  consumer owns escaping of any dynamic text it embeds. Both default to `""`,
  so existing consumers that do not implement them are unaffected and render
  byte-for-byte identical markup.

### Render-mode switch

The board supports two transports, selected via `robotsix_board.RenderMode`:

- **Server-rendered HTML fragments** (`RenderMode.SERVER_FRAGMENTS`) — the
  server emits ready-to-insert HTML fragments. This is the stdlib/Jinja
  consumer path (e.g. robotsix-auto-mail, `BaseHTTPRequestHandler` + inline
  Jinja).
- **JSON + client-side JS hydration** (`RenderMode.JSON_HYDRATION`) — the
  server emits JSON and the bundled `board.js` hydrates the markup on the
  client. This is the FastAPI consumer path (e.g. robotsix-mill, which mounts
  the packaged `static/` directory and serves `board.js`).

In `JSON_HYDRATION` mode the server also emits the board column skeleton via
`robotsix_board.build_board_skeleton(adapter.columns())` — `board.js` only
diffs cards into pre-existing `.board-column[data-status]` containers and
never creates the columns, so a JSON_HYDRATION page without the skeleton
renders zero cards.

Both transports render the **same markup contract** so the styling and
behavior are shared regardless of transport.

### Shared markup contract

Both transports produce the same DOM shape:

- **Column container** — one container per column, keyed by `status_key`,
  headed by the column `label`.
- **Card markup** — a card element keyed by the card `id`, showing `title`,
  `badges`, and `timestamps`.

All HTML interpolation goes through a single centralized `esc()` escaping
helper, so the server-fragment and JSON-hydration transports share **one**
escaping implementation rather than each re-implementing escaping.

### Static assets

The packaged `static/` directory ships `board.css` and `board.js` as package
data. Resolve it at runtime via `robotsix_board.static_dir()`:

- A FastAPI consumer mounts the directory as a static-files route.
- A stdlib consumer reads the asset files and inlines them into responses.

The packaged assets ship the **real board chrome** — `board.js` (the
client-side hydration behaviour ported from robotsix-mill's `static/board.js`)
and `board.css` (the styling ported from mill's `static/board.css` plus the
server-fragment markup formerly built inline in robotsix-auto-mail). Consumers
migrate onto these shared assets rather than maintaining their own copies.

### CSS custom properties (theming)

`board.css` is layered on top of the [robotsix-ui](https://github.com/damien-robotsix/robotsix-ui)
shared base stylesheet (vendored as `robotsix-ui-base.css`).  The shared base
provides design tokens (`--rsu-*`), a minimal reset, and shared component
styles.  See [Consuming robotsix-ui styles](#consuming-robotsix-ui-styles)
below for details on the vendored stylesheet.

The full `--rsu-*` / `--board-*` token tables and the light-theme override
example are maintained on the [CSS Theming](docs/robotsix_board/theming.md#css-custom-properties-theming)
docs page so they are not duplicated here.

### Consuming robotsix-ui styles

The shared base stylesheet (`robotsix-ui-base.css`) is **vendored** — a
pinned copy of robotsix-ui's design tokens, reset, and component styles
committed directly in `src/robotsix_board/static/`.  This avoids requiring
Node.js / npm for Python-only consumers of robotsix-board.

**Source:** [robotsix-ui](https://github.com/damien-robotsix/robotsix-ui)
(release asset `style.css` — the compiled tokens + reset + component +
utility styles).

**To update the vendored copy** to a newer robotsix-ui revision, fetch the
release assets with the robotsix-ui `fetch_assets` CLI (stdlib-only Python,
no npm — the same pipeline robotsix-central-deploy consumes) and adopt them
under the board filenames:

```bash
# Install the fetcher from the robotsix-ui git pin into a throwaway venv:
python3 -m venv /tmp/rsui-venv
/tmp/rsui-venv/bin/pip install \
  "robotsix-ui @ git+https://github.com/damien-robotsix/robotsix-ui.git@<40-char-SHA>"

# Fetch style.css + vanilla.js for the desired version tag:
/tmp/rsui-venv/bin/python -m robotsix_ui fetch --version v0.1.48 --dest /tmp/rsui-assets

# Adopt them: style.css becomes robotsix-ui-base.css (keep the header
# comment, updating the pinned SHA/tag) and vanilla.js keeps its name:
cp /tmp/rsui-assets/vanilla.js src/robotsix_board/static/vanilla.js
cat /tmp/rsui-assets/style.css >> src/robotsix_board/static/robotsix-ui-base.css
```

The weekly [`bump-git-deps`](.github/workflows/bump-git-deps.yml) workflow
runs exactly this fetch (via `python -m robotsix_ui fetch`) and opens a
re-vendor PR when a newer `v0.1.x` tag is released.  The vendored file
carries a header comment with the pinned commit SHA + tag so the exact
revision is always traceable.

## Build-out phasing

The build-out should start with the **highest-overlap, lowest-risk slice**:
the shared CSS plus the column/card markup contract. Only after
that lands should it unify the JS refresh/detail behavior.

**Out of scope for this shared library:** mill-specific chrome — the agents
menu, cost dashboard, AGENT.md candidates, the repo selector, and the
proposals/runs panels all stay in robotsix-mill. Only the `#board`
columns/cards, the `#drawer`/detail panel, and the refresh loop
are shared here.

## Standards

This repo follows the [robotsix stack standards](https://github.com/damien-robotsix/robotsix-standards).

## License

MIT — see the [LICENSE](LICENSE) file.

Copyright 2026 Damien Robotsix.
