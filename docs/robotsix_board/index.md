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

The protocol declares **seven methods**. The library calls these methods
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

### Structural HTML hooks (optional)

Two **optional** duck-typed hooks allow a consumer to inject trusted raw
HTML into the server-rendered markup. These hooks are deliberately **not**
part of the `BoardAdapter` runtime-checkable Protocol — adding a required
method to the Protocol would break `isinstance()` for every existing
structural implementer. Instead, `render_board()` looks them up via
`getattr(adapter, ..., None)`, skipping them when absent.

Both hooks are only called in `SERVER_FRAGMENTS` mode.

#### `card_extra_html(card)`

```python
def card_extra_html(self, card: object) -> str:
```

Return a raw HTML string to inject **inside `.board-card`**, immediately
after the per-card move form. Defaults to `""` when not implemented.

#### `column_extra_html(status_key)`

```python
def column_extra_html(self, status_key: str) -> str:
```

Return a raw HTML string to inject **inside `.board-column`**, after the
`.board-column-cards` list. Defaults to `""` when not implemented.

**Trust boundary:** Hook output is emitted **verbatim**, bypassing `esc()`.
The consumer owns escaping of any dynamic text it embeds — use `esc()` for
any user-supplied strings interpolated into the hook output to prevent XSS.

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

`render_board()` produces the complete board HTML for `SERVER_FRAGMENTS`
mode, and `render_config_script()` emits a `<script>` configuration tag for
`JSON_HYDRATION` mode. Both accept a [`BoardAdapter`][robotsix_board.BoardAdapter].
Full signatures, parameter descriptions, and return-value details are
auto-generated from source in the [API Reference](api.md).

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

## Accessibility (a11y) contract

The board ships with ARIA semantics and keyboard interaction in both
`SERVER_FRAGMENTS` and `JSON_HYDRATION` transports.  Consumers inherit
these guarantees without extra work.

### Semantics

| Element | Role / attribute | Purpose |
|---|---|---|
| `.board-column` | `aria-labelledby="col-heading-<key>"` | Landmark region tied to column heading |
| `.board-column-label` (`<h2>`) | `id="col-heading-<key>"` | Heading anchor for `aria-labelledby` |
| `.board-column-cards` | `role="list"` | Card container with list semantics |
| `.board-card` | `role="listitem" tabindex="0" aria-haspopup="dialog"` | Focusable list item that opens a dialog |
| Move `<select>` | `aria-label="Move <title> to column"` | Contextual label for screen readers |
| Move `<button>` | `aria-label="Move <title>"` | Contextual label for screen readers |
| `.board-move-error` | `role="alert"` | Assertive live region for move failures |
| `#drawer` | `role="dialog" aria-modal="true" aria-labelledby="drawer-title"` | Modal dialog landmark |

### Keyboard interaction

- **Open drawer:** focus a card with <kbd>Tab</kbd>, then press
  <kbd>Enter</kbd> or <kbd>Space</kbd>.
- **Close drawer:** press <kbd>Escape</kbd>, click the *Close* button, or
  click the backdrop outside the drawer content.
- **Focus on open:** focus moves to the *Close* button inside the drawer.
- **Focus on close:** focus returns to the triggering card.
- **Focus trap:** while the drawer is open, <kbd>Tab</kbd> and
  <kbd>Shift</kbd>+<kbd>Tab</kbd> cycle between the drawer's focusable
  elements without escaping to the underlying page.

### CSS utility

A `.visually-hidden` / `.sr-only` utility class is available in
`board.css` for screen-reader-only text that consumers may need:

```css
.visually-hidden, .sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

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
<div class="board-column" data-status="<status_key>" aria-labelledby="col-heading-<status_key>">
  <div class="board-column-header">
    <h2 class="board-column-label" id="col-heading-<status_key>"><label></h2>
    <span class="board-column-count"><count></span>
  </div>
  <div class="board-column-cards" role="list">
    <!-- cards -->
  </div>
</div>
```

One `.board-column` per entry in `adapter.columns()`, in order. The
`data-status` attribute holds the machine-readable status key.  The
`aria-labelledby` attribute links the column region to its `<h2>` heading
so screen readers announce the column name when navigating by landmark.
The `.board-column-cards` container has `role="list"` to convey card-list
semantics.

### Card

```html
<div class="board-card" id="card-<id>" data-card-id="<id>"
     role="listitem" tabindex="0" aria-haspopup="dialog">
  <div class="board-card-title"><title></div>
  <div class="board-card-badges">
    <span class="board-badge"><badge></span>  <!-- zero or more -->
  </div>
  <div class="board-card-timestamps">
    <span class="board-timestamp"><key>: <value></span>  <!-- zero or more -->
  </div>
  <form class="board-card-move" method="<method>" action="<url>">
    <select name="target_status" class="board-move-select"
            aria-label="Move <title> to column">
      <option value="">Move to…</option>
      <option value="<other_key>"><other_label></option>  <!-- one per other column -->
    </select>
    <button type="submit" class="board-move-submit"
            aria-label="Move <title>">Move</button>
  </form>
</div>
```

Each card is keyed by its stable `card_id` via both the `id` attribute and
`data-card-id`.  Cards carry `role="listitem"` (inside the `role="list"`
container), `tabindex="0"` (keyboard-focusable), and
`aria-haspopup="dialog"` (announces the drawer popup).  The move
`<select>` and `<button>` include `aria-label` attributes that embed the
card title for screen-reader context.

### Move control

The per-card move form includes:

- A `<select>` listing every **other** column as a target option, with an
  `aria-label` that includes the card title (e.g. `"Move Fix login bug to
  column"`).
- A `<button type="submit">` labelled "Move", with an `aria-label` that
  includes the card title (e.g. `"Move Fix login bug"`).
- An inline `<span class="board-move-error" role="alert">` for
  screen-reader announcement of move failures.
- The form `action` and `method` come from `adapter.move_endpoint(card)`.

In `JSON_HYDRATION` mode, `board.js` generates equivalent interactive
controls from the config; the server does not produce any `<form>` markup.

### Drawer shell

```html
<div id="drawer" class="drawer hidden"
     role="dialog" aria-modal="true" aria-labelledby="drawer-title">
  <div class="drawer-content"></div>
</div>
```

The `#drawer` is an off-screen detail panel. It starts with the CSS class
`hidden`; `board.js` toggles visibility when a card is clicked or activated
via keyboard (Enter / Space).  The dialog carries `role="dialog"`,
`aria-modal="true"`, and `aria-labelledby="drawer-title"` so screen readers
announce it as a modal.  On open, focus moves into the drawer; on close,
focus is restored to the triggering card.  Pressing Escape closes the
drawer.  Tab focus is trapped within the drawer while it is open.
