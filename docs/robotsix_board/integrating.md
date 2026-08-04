# Integrating robotsix-board

A step-by-step guide for adding the shared kanban board to a downstream
project.  If you already have a working integration and want the full API
reference, see the [API Reference](api.md) and the
[Architecture overview](architecture.md).

---

## 1. Choose a transport

`robotsix-board` ships two transports that produce **identical markup**.
Pick the one that matches your server stack.

| Transport | Function | How it delivers markup | Best for |
|---|---|---|---|
| **JSON hydration** | `render_config_script()` | Server emits a `<script id="board-config">` JSON blob; `board.js` builds the DOM on the client. | FastAPI / ASGI servers, any stack that can mount static files. |
| **Server fragments** | `render_board()` | Server emits ready-to-insert HTML for `#board` and `#drawer`. | stdlib servers, Jinja templates, any stack that renders HTML on the server. |

Examples of each pattern in the wild:

| Project | Transport | Why |
|---|---|---|
| [`robotsix-mill`](https://github.com/damien-robotsix/robotsix-mill) | JSON hydration | FastAPI serves JSON; `board.js` refreshes periodically. |
| `robotsix-auto-mail` | Server fragments | stdlib `BaseHTTPRequestHandler` + inline Jinja; server owns every byte of HTML. |

If your stack can **mount a static directory**, JSON hydration is usually
simpler.  If your stack **already renders full HTML pages** on the server,
server fragments fit more naturally.  Both paths end up with the same board
chrome and the same CSS.

---

## 2. Install the library

```bash
pip install "robotsix-board @ git+https://github.com/damien-robotsix/robotsix-board.git"
```

`pip install robotsix-board` will work once the package is published to PyPI.

---

## 3. Implement the BoardAdapter

Both transports need the same five-method contract.  Import it:

```python
from robotsix_board import BoardAdapter
```

Write a class (or any object) with these methods:

```python
class MyAdapter:
    def columns(self) -> list[tuple[str, str]]:
        """Ordered (status_key, label) pairs for board columns."""
        return [("todo", "To Do"), ("doing", "In Progress"), ("done", "Done")]

    def card_id(self, card) -> str:
        """Stable identifier — used as DOM id and data-card-id."""
        return str(card["id"])

    def card_title(self, card) -> str:
        return card["title"]

    def card_badges(self, card) -> list[str]:
        return card.get("labels", [])

    def card_timestamps(self, card) -> dict[str, str]:
        return {
            "created": card.get("created_at", ""),
            "updated": card.get("updated_at", ""),
        }
```

The library does not force you to subclass `BoardAdapter` — any object with
these five methods satisfies the runtime-checkable protocol.  For the full
contract including optional hooks, see the [API Reference](api.md).

---

## 4. Mount the board (JSON hydration)

### 4a. Serve the static assets

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from robotsix_board import static_dir

app = FastAPI()
app.mount("/board/static", StaticFiles(directory=static_dir()), name="board_static")
```

### 4b. Emit the config script in your page template

```python
from robotsix_board import render_config_script

@app.get("/board")
def board_page():
    adapter = MyAdapter()
    config_tag = render_config_script(
        adapter,
        refresh_url="/api/board-data",
        refresh_interval_ms=30_000,
    )
    return HTMLResponse(f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>My Board</title>
  <link rel="stylesheet" href="/board/static/board.css">
</head>
<body>
  <div id="board" class="board"></div>
  {config_tag}
  <script src="/board/static/board.js"></script>
</body>
</html>""")
```

### 4c. Provide a refresh endpoint

`board.js` issues `GET {refresh_url}` and expects a JSON response with
`render_mode: "json_hydration"` and a `columns` array of `[status_key, [cards…]]` entries.  Each card object must include `id`, `title`, `status`,
and optionally `badges`, `timestamps`, `merged`, `agent_badges`, and
`source_badge`.  See the [API Reference](api.md) for the full card schema.

---

## 5. Mount the board (server fragments)

### 5a. Read and inline the static assets

```python
from robotsix_board import static_dir

css = (static_dir() / "board.css").read_text()
js  = (static_dir() / "board.js").read_text()
```

### 5b. Call `render_board()` and embed the output

```python
from robotsix_board import render_board

def board_page(cards_by_status: dict[str, list[dict]]):
    adapter = MyAdapter()
    board_html = render_board(adapter, cards_by_status)

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>My Board</title>
  <style>{css}</style>
</head>
<body>
  {board_html}
  <script>{js}</script>
</body>
</html>"""
```

The server is responsible for collecting the cards and grouping them by
status key before calling `render_board()`.  The consumer owns the
card-fetching logic — `robotsix-board` only renders what it is given.

---

## 6. The parity contract

Both transports **must** produce byte-identical markup.  This invariant is
load-bearing: if one transport's DOM drifts from the other's, cards that
look correct under JSON hydration may silently misrender under server
fragments (and vice versa).

The parity contract is enforced by a **cross-language parity test** at
[`tests/robotsix_board/test_smoke.py`](../../tests/robotsix_board/test_smoke.py):

- **`test_board_config_script_id_consistent`** — confirms that the
  `board-config` script `id` is the same across `_render.py`, `board.js`,
  and `board_shared.js`.

- **`test_esc_consistent_across_python_and_js`** — verifies that Python
  `esc()` and JavaScript `esc()` produce identical output for the same
  character set (`&`, `<`, `>`, `"`, `'`), using shared test vectors.  This
  is the single escaping surface; if the two implementations diverge, XSS
  vectors can appear in one transport while the other remains safe.

As a consumer, you are bound to this contract in two ways:

1. **Do not change the DOM shape** that `render_board()` emits and
   `board.js` expects.  The CSS selectors and JS query logic depend on the
   class names, attribute names, and nesting described in the
   [Markup contract](index.md#markup-contract).

2. **Do not double-escape.**  Both `render_board()` and `board.js` apply
   HTML escaping to card fields before interpolation.  If your adapter or
   refresh endpoint returns already-escaped strings, the board will display
   entity references as literal text (e.g. `&amp;` instead of `&`).

---

## 7. Escaping guarantees

The library provides a single centralized escaping helper:

```python
from robotsix_board import esc
```

`esc(s)` delegates to Python's `html.escape(s, quote=True)`.  It is used
internally by both `render_board()` (server fragments) and the config
script (JSON hydration).  The JavaScript `esc()` in `board.js` mirrors this
behaviour exactly, as verified by the cross-language parity test.

**Rules for consumers:**

- **Adapter return values** (`card_title`, `card_badges`, `card_timestamps`,
  `columns` labels) are passed through `esc()` automatically — return raw
  values, not pre-escaped HTML.
- **Optional hook output** (`card_extra_html`, `column_extra_html`) is
  emitted **verbatim** — if you embed user-controlled data there, you must
  call `esc()` yourself.
- **Refresh-endpoint JSON** (JSON hydration) is escaped by `board.js` on
  the client — return raw strings in the JSON, not entity-encoded.

---

## 8. Next steps

- **[API Reference](api.md)** — full signatures for `render_board()`,
  `render_config_script()`, `esc()`, `static_dir()`, `BoardAdapter`, and
  `RenderMode`.
- **[Architecture](architecture.md)** — how `board.js` hydrates the board,
  the refresh loop, merging, agent-colour hashing, and gate caching.
- **[CSS Theming](theming.md)** — custom properties, colour tokens,
  responsive breakpoints, and dark-mode support.
- **[Contributing](contributing.md)** — how to run tests, lint, format, and
  type-check.
