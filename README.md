[![CI](https://github.com/damien-robotsix/robotsix-board/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/damien-robotsix/robotsix-board/actions/workflows/ci.yml?query=branch%3Amain)
[![License](https://img.shields.io/github/license/damien-robotsix/robotsix-board?style=flat)](https://github.com/damien-robotsix/robotsix-board/blob/main/LICENSE)
[![PyPI version](https://img.shields.io/pypi/v/robotsix-board?style=flat)](https://pypi.org/project/robotsix-board/)
[![Python versions](https://img.shields.io/pypi/pyversions/robotsix-board?style=flat)](https://pypi.org/project/robotsix-board/)

# robotsix-board

Shared kanban-board frontend library: column-per-status board of cards with a move-between-columns action, auto-refresh, and a click-through detail panel. Owns the board HTML/CSS/JS chrome, parameterized by a small data adapter (column order, card fields, move endpoint) and a render mode (server-rendered fragments vs JSON+JS hydration). Consumed by robotsix-mill (FastAPI + static files) and robotsix-auto-mail (stdlib BaseHTTPRequestHandler + inline Jinja).

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

- **A data adapter** that describes the board's shape — the column order, which card fields to display, and the endpoint used to move a card between columns.
- **A render mode** that selects how the board is produced — server-rendered HTML fragments, or a JSON payload hydrated by the bundled JavaScript.

This lets it be consumed by both robotsix-mill (FastAPI + static files) and robotsix-auto-mail (stdlib `BaseHTTPRequestHandler` + inline Jinja).

> **Note:** The public API is now available. Import the adapter contract and render-mode selector via `robotsix_board.BoardAdapter` and `robotsix_board.RenderMode`. The packaged static assets are accessed via `robotsix_board.static_dir()`. See the Design contract section below for full documentation.

## Development

Clone the repository, then install development dependencies:

```bash
uv sync --extra dev
```

Run tests:

```bash
uv run pytest
```

Lint and format with ruff:

```bash
uv run ruff check .
uv run ruff format .
```

Or run all pre-commit hooks at once:

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
  - `id` — a stable identifier (used as the DOM/card key and in move URLs).
  - `title` — the display title.
  - `badges` — zero or more short badge labels.
  - `timestamps` — named timestamp fields (e.g. created / updated).
- **Move endpoint** — the `(url, http_method)` used to move a card from one
  column to another. The move control posts the target `status_key` to this
  endpoint.
- **Structural HTML hooks (optional)** — two optional adapter methods inject
  trusted raw HTML into the server-rendered markup (`SERVER_FRAGMENTS` only):
  - `card_extra_html(card) -> str` — output is injected inside `.board-card`,
    immediately after the per-card move form.
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

Both transports render the **same markup contract** so the styling and
behavior are shared regardless of transport.

### Shared markup contract

Both transports produce the same DOM shape:

- **Column container** — one container per column, keyed by `status_key`,
  headed by the column `label`.
- **Card markup** — a card element keyed by the card `id`, showing `title`,
  `badges`, and `timestamps`.
- **Move control** — a per-card form/dropdown listing the other columns;
  selecting a target column issues the adapter's move endpoint request.

All HTML interpolation goes through a single centralized `esc()` escaping
helper, so the server-fragment and JSON-hydration transports share **one**
escaping implementation rather than each re-implementing escaping.

### Static assets

The packaged `static/` directory ships `board.css` and `board.js` as package
data. Resolve it at runtime via `robotsix_board.static_dir()`:

- A FastAPI consumer mounts the directory as a static-files route.
- A stdlib consumer reads the asset files and inlines them into responses.

The create step ships **skeleton placeholder** assets; the real chrome lands
in the build-out ticket.

### CSS custom properties (theming)

`board.css` is layered on top of the [robotsix-ui](https://github.com/damien-robotsix/robotsix-ui)
shared base stylesheet (vendored as `robotsix-ui-base.css`).  The shared base
provides design tokens (`--rsu-*`), a minimal reset, and shared component
styles.  See [Consuming robotsix-ui styles](#consuming-robotsix-ui-styles)
below for details on the vendored stylesheet.

`board.css` overrides the following `--rsu-*` tokens inside `#board` / `.board`
for the board's default dark theme:

| Token                         | Board default | Purpose              |
|-------------------------------|---------------|----------------------|
| `--rsu-color-bg`              | `#1a1a2e`     | Surface background   |
| `--rsu-color-bg-secondary`    | `#16213e`     | Column / drawer bg   |
| `--rsu-color-text`            | `#e0e0e0`     | Primary text         |
| `--rsu-color-text-secondary`  | `#c0c0e0`     | Secondary text       |
| `--rsu-color-border`          | `#2a2a4a`     | Card / column border |
| `--rsu-color-border-focus`    | `#4a6fa5`     | Focus ring           |
| `--rsu-color-primary`         | `#0f3460`     | Accent / button bg   |
| `--rsu-color-primary-hover`   | `#1a4a80`     | Hover state          |
| `--rsu-color-error`           | `#ff6b6b`     | Error text           |

Board-specific `--board-*` tokens (no `--rsu-*` equivalent):

| Category  | Property                     | Default     |
|-----------|------------------------------|-------------|
| Surfaces  | `--board-header-bg`          | `#0f3460`   |
|           | `--board-card-bg`            | `#1a1a2e`   |
| Borders   | `--board-border-hover`       | `#3a3a6a`   |
| Text      | `--board-text-muted`         | `#a0a0c0`   |
|           | `--board-text-dim`           | `#8080a0`   |
|           | `--board-text-empty`         | `#505070`   |
| Accent    | `--board-accent-merged`      | `#4a9eff`   |
| Badges    | `--board-badge-src-bg`       | `#2d1f4e`   |
|           | `--board-badge-src-color`    | `#c0a0e0`   |
|           | `--board-badge-src-border`   | `#4a3a6a`   |
| Shadows   | `--board-shadow-card-hover`  | `0 2px 8px rgba(0,0,0,0.3)` |
|           | `--board-shadow-focus`       | `0 0 0 2px rgba(74,111,165,0.4)` |
|           | `--board-shadow-focus-select`| `0 0 0 2px rgba(74,111,165,0.3)` |
|           | `--board-shadow-drawer`      | `-4px 0 16px rgba(0,0,0,0.4)` |

Consumers can override any `--rsu-*` or `--board-*` property on `#board` or
their own `:root` to customise the appearance without selector wars.

Example — light-theme override:

```css
#board {
  --rsu-color-bg: #ffffff;
  --rsu-color-bg-secondary: #f5f5f5;
  --rsu-color-text: #1a1a2e;
  --rsu-color-text-secondary: #4b5563;
  --rsu-color-border: #e5e7eb;
  /* ... */
}
```

### Consuming robotsix-ui styles

The shared base stylesheet (`robotsix-ui-base.css`) is **vendored** — a
pinned copy of robotsix-ui's design tokens, reset, and component styles
committed directly in `src/robotsix_board/static/`.  This avoids requiring
Node.js / npm for Python-only consumers of robotsix-board.

**Source:** [robotsix-ui](https://github.com/damien-robotsix/robotsix-ui)
(`src/styles/{tokens,base,components}.css` concatenated).

**To update the vendored copy** to a newer robotsix-ui revision:

```bash
# Fetch the three source CSS files at the desired commit SHA:
SHA=<full-40-char-commit-sha>
curl -sL "https://raw.githubusercontent.com/damien-robotsix/robotsix-ui/$SHA/src/styles/tokens.css" > /tmp/t.css
curl -sL "https://raw.githubusercontent.com/damien-robotsix/robotsix-ui/$SHA/src/styles/base.css" > /tmp/b.css
curl -sL "https://raw.githubusercontent.com/damien-robotsix/robotsix-ui/$SHA/src/styles/components.css" > /tmp/c.css

# Concatenate, update the pinned-SHA comment, and replace:
cat /tmp/t.css /tmp/b.css /tmp/c.css > src/robotsix_board/static/robotsix-ui-base.css
# (update the header comment with the new SHA)
```

The vendored file carries a header comment with the pinned commit SHA so
the exact revision is always traceable.

## Build-out phasing

The build-out should start with the **highest-overlap, lowest-risk slice**:
the shared CSS plus the column/card/move-form markup contract. Only after
that lands should it unify the JS refresh/detail behavior.

**Out of scope for this shared library:** mill-specific chrome — the agents
menu, cost dashboard, AGENT.md candidates, the repo selector, and the
proposals/runs panels all stay in robotsix-mill. Only the `#board`
columns/cards/move control, the `#drawer`/detail panel, and the refresh loop
are shared here.

## Standards

This repo follows the [robotsix stack standards](https://github.com/damien-robotsix/robotsix-standards).

## License

MIT — see the [LICENSE](LICENSE) file.

Copyright 2026 Damien Robotsix.
