# robotsix-board — Integration Reference

## Overview

`robotsix-board` is a shared kanban-board frontend library. It owns the
board HTML/CSS/JS chrome — a column-per-status board of cards with a
move-between-columns action, auto-refresh, and a click-through detail
panel — and is parameterized by a small data adapter and a render mode.

The library is designed for a **two-consumer architecture**:

| Consumer | Framework | Render mode | Static assets |
|---|---|---|---|
| [`robotsix-mill`](https://github.com/damien-robotsix/robotsix-mill) | FastAPI | `JSON_HYDRATION` | Mounted as a static-files route |
| `robotsix-auto-mail` | stdlib `BaseHTTPRequestHandler` + inline Jinja | `SERVER_FRAGMENTS` | Inlined into responses |

Both consumers share the same board chrome, the same DOM shape, and the
same CSS/JS — only the transport (server-HTML vs JSON+JS hydration) differs.

## Installation

Install from source via `git+https` (the recommended path until the first
PyPI release):

```bash
pip install "robotsix-board @ git+https://github.com/damien-robotsix/robotsix-board.git"
```

Or add it to your consumer's `pyproject.toml`:

```toml
[project]
dependencies = [
    "robotsix-board @ git+https://github.com/damien-robotsix/robotsix-board.git",
]
```

`pip install robotsix-board` will work once the package is published to
PyPI.

---

## BoardAdapter contract

A consumer drives the board by supplying an object conforming to the
[`BoardAdapter`][robotsix_board.BoardAdapter] protocol. Import it from the
top-level package:

```python
from robotsix_board import BoardAdapter
```

The protocol declares **eight methods**. The library calls these methods
during rendering; the consumer provides the implementations.

### `columns()`

```python
def columns(self) -> list[tuple[str, str]]:
```

Return the ordered `(status_key, label)` pairs that define the board
columns.

- **Column order is significant** — it is the left-to-right order that
  columns appear on the board.
- Each pair is a `(status_key, label)` tuple where `status_key` is a
  machine-readable string (e.g. `"todo"`, `"in_progress"`) and `label` is
  the human-readable column heading (e.g. `"To Do"`, `"In Progress"`).

### `card_id()`

```python
def card_id(self, card: object) -> str:
```

Return the **stable identifier** for `card`. This is used as:

- The DOM element id (`id="card-{card_id}"`).
- The `data-card-id` attribute on the card element.
- The key in move URLs and refresh-hydration logic.

The identifier must be stable across renders for the same logical card.

### `card_title()`

```python
def card_title(self, card: object) -> str:
```

Return the **display title** for `card`. Rendered inside a
`.board-card-title` element.

### `card_badges()`

```python
def card_badges(self, card: object) -> list[str]:
```

Return zero or more **badge labels** to display on `card`. Each string is
rendered as a `<span class="board-badge">`. Return an empty list if the
card has no badges.

### `card_timestamps()`

```python
def card_timestamps(self, card: object) -> dict[str, str]:
```

Return the **timestamp fields** for `card` as a `dict` of `{label: value}`
pairs (e.g. `{"created": "2026-06-09", "updated": "2026-06-09"}`). Each
entry renders as `<span class="board-timestamp">label: value</span>`.

If a card has no timestamps, return an empty `dict` — the timestamps block
will be omitted from the output.

### `move_endpoint()`

```python
def move_endpoint(self, card: object) -> tuple[str, str]:
```

Return the `(url, http_method)` tuple used to **move a card** between
columns. The move form (a `<form class="board-card-move">`) posts the
selected `target_status` to this endpoint.

- `http_method` is typically `"POST"`.
- `url` is the action target — the form will submit `target_status` as a
  form field to this URL.

This is used in `SERVER_FRAGMENTS` mode, where each card gets its own
inline form with a per-card endpoint.

### `move_endpoint_template()`

```python
def move_endpoint_template(self) -> str:
```

Return a **URL template** consumed by `board.js` in `JSON_HYDRATION` mode.
The template must contain the placeholders `{card_id}` and
`{target_status}`, e.g. `"/move/{card_id}/{target_status}"`.

The JavaScript client expands these placeholders before issuing the move
request, so the server only needs to expose a single parameterized route.

This method is **not** called in `SERVER_FRAGMENTS` mode — only
`JSON_HYDRATION` mode uses the template.

### `render_mode()`

```python
def render_mode(self) -> RenderMode:
```

Return the [`RenderMode`][robotsix_board.RenderMode] this consumer uses.
The library uses this to decide which rendering code path to take.

---

## RenderMode enum

[`RenderMode`][robotsix_board.RenderMode] is a `StrEnum` with two members:

| Member | Value | Transport | Consumer |
|---|---|---|---|
| `SERVER_FRAGMENTS` | `"server_fragments"` | Server emits ready-to-insert HTML fragments | `robotsix-auto-mail` (stdlib + inline Jinja) |
| `JSON_HYDRATION` | `"json_hydration"` | Server emits JSON; `board.js` hydrates the markup on the client | `robotsix-mill` (FastAPI) |

Import it from the top-level package:

```python
from robotsix_board import RenderMode
```

Both transports render the **same markup contract** (see [Markup
contract](#markup-contract)), so styling and behavior are shared regardless
of transport.

---

## Rendering API

The library provides two rendering functions via `robotsix_board._render`
(reexported from the top-level package). Import them directly:

```python
from robotsix_board import render_board, render_config_script
```

### `render_board()`

```python
def render_board(adapter: BoardAdapter, cards: Mapping[str, Sequence[object]]) -> str:
```

**Purpose:** Produce the complete board HTML for **`SERVER_FRAGMENTS`**
mode.

**Parameters:**

- `adapter` — a [`BoardAdapter`][robotsix_board.BoardAdapter] that describes
  columns, card accessors, and move endpoints.
- `cards` — a mapping from `status_key` → list of card objects. Each key
  should correspond to a column returned by `adapter.columns()`. Cards whose
  `status_key` has no matching column are silently excluded.

**Returns:** A complete HTML string containing:

- The `#board` container with one `.board-column` per column.
- Each column's header (label + card count), card list, per-card move forms.
- A `#drawer` shell for the detail panel.

Call this from your server-side templating layer when `adapter.render_mode()`
returns `SERVER_FRAGMENTS`.

### `render_config_script()`

```python
def render_config_script(
    adapter: BoardAdapter,
    *,
    refresh_url: str | None = None,
    refresh_interval_ms: int = 30_000,
) -> str:
```

**Purpose:** Emit a `<script id="board-config" type="application/json">` tag
for **`JSON_HYDRATION`** mode.

**Parameters:**

- `adapter` — a [`BoardAdapter`][robotsix_board.BoardAdapter]; columns and
  `move_endpoint_template()` are read from the adapter.
- `refresh_url` *(keyword-only)* — optional URL the client should poll for
  board refreshes. When `None` (the default), no polling URL is included in
  the config and the client does not auto-refresh.
- `refresh_interval_ms` *(keyword-only)* — polling interval in milliseconds
  (default `30_000` = 30 seconds). Ignored if `refresh_url` is `None`.

**Returns:** A `<script>` tag containing a JSON config blob. The fields are:

- `columns` — the column `[status_key, label]` pairs from the adapter.
- `move_endpoint_template` — from `adapter.move_endpoint_template()`.
- `move_method` — always `"POST"`.
- `render_mode` — always `"json_hydration"`.
- `refresh_interval_ms` — as passed.
- `refresh_url` — as passed (omitted if `None`).

Call this from your `JSON_HYDRATION` endpoint, typically embedded in the
`<head>` or at the top of the board page alongside the `<script>` tag that
loads `board.js`.

---

## Asset-mounting pattern

The packaged `static/` directory ships `board.css` and `board.js` as
package data. Resolve its on-disk path at runtime:

```python
from robotsix_board import static_dir

assets = static_dir()  # pathlib.Path
```

### FastAPI consumer (robotsix-mill)

Mount the directory as a static-files route:

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from robotsix_board import static_dir

app = FastAPI()
app.mount("/board/static", StaticFiles(directory=static_dir()), name="board_static")
```

The HTML page then references `/board/static/board.css` and
`/board/static/board.js` in `<link>` and `<script>` tags.

### stdlib consumer (robotsix-auto-mail)

Read the asset files from disk and inline them into server-rendered
responses:

```python
css = (static_dir() / "board.css").read_text()
js = (static_dir() / "board.js").read_text()
```

Embed `css` in a `<style>` tag and `js` in a `<script>` tag within the
rendered page.

---

## `esc()` utility

```python
from robotsix_board import esc
```

`esc(s: str) -> str` is the single centralized HTML-escape helper. It
delegates to Python's `html.escape(s, quote=True)`.

All HTML interpolation in both `render_board()` and `render_config_script()`
goes through `esc()`, so the server-fragment and JSON-hydration transports
share **one** escaping implementation. Consumer code rendering additional
content should also use `esc()` for any user-supplied strings interpolated
into the board markup to prevent XSS.

---

## Markup contract

Both `SERVER_FRAGMENTS` and `JSON_HYDRATION` transports produce the same
DOM shape. The following describes the structure produced by
`render_board()`; `board.js` hydrates an equivalent shape from JSON.

### Board container

```html
<div id="board" class="board">
```

A single `#board` element wraps all columns.

### Column

```html
<div class="board-column" data-status="<status_key>">
  <div class="board-column-header">
    <h2 class="board-column-label"><label></h2>
    <span class="board-column-count"><count></span>
  </div>
  <div class="board-column-cards">
    <!-- cards -->
  </div>
</div>
```

One `.board-column` per entry in `adapter.columns()`, in order. The
`data-status` attribute holds the machine-readable status key.

### Card

```html
<div class="board-card" id="card-<id>" data-card-id="<id>">
  <div class="board-card-title"><title></div>
  <div class="board-card-badges">
    <span class="board-badge"><badge></span>  <!-- zero or more -->
  </div>
  <div class="board-card-timestamps">
    <span class="board-timestamp"><key>: <value></span>  <!-- zero or more -->
  </div>
  <form class="board-card-move" method="<method>" action="<url>">
    <select name="target_status" class="board-move-select">
      <option value="">Move to…</option>
      <option value="<other_key>"><other_label></option>  <!-- one per other column -->
    </select>
    <button type="submit" class="board-move-submit">Move</button>
  </form>
</div>
```

Each card is keyed by its stable `card_id` via both the `id` attribute and
`data-card-id`.

### Move control

The per-card move form includes:

- A `<select>` listing every **other** column as a target option.
- A `<button type="submit">` labelled "Move".
- The form `action` and `method` come from `adapter.move_endpoint(card)`.

In `JSON_HYDRATION` mode, `board.js` generates equivalent interactive
controls from the config; the server does not produce any `<form>` markup.

### Drawer shell

```html
<div id="drawer" class="drawer hidden">
  <div class="drawer-content"></div>
</div>
```

The `#drawer` is an off-screen detail panel. It starts with the CSS class
`hidden`; `board.js` toggles visibility when a card is clicked. Consumer
code populates `.drawer-content` with card-detail markup.
