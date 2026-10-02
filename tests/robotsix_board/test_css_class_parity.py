"""Cross-file CSS class-name parity for the Python renderer.

This is the Python-side analogue of ``board.integrity.test.js`` §21
("CSS class name cross-file consistency"), which enforces JS->CSS parity.

Here we close the last unenforced edge of the Python<->CSS<->JS
class-name sync triangle: every CSS class that ``_render.py`` hardcodes
into the server-rendered HTML must have a matching ``.<class>`` selector
in ``static/board.css`` (or be referenced by ``static/board.js``, or be
an explicitly documented dynamic/utility class).

Without this test, renaming a class in ``_render.py`` (e.g.
``board-card`` -> ``board-task``) would silently ship HTML that
``board.css`` no longer styles and ``board.js`` no longer hydrates — and
no test would fail.
"""

from __future__ import annotations

import re
from pathlib import Path

from robotsix_board._render import render_board
from tests.robotsix_board.conftest import MockAdapter, sample_cards

# ── static asset locations ──────────────────────────────────────────
_STATIC_DIR = Path(__file__).resolve().parents[2] / "src" / "robotsix_board" / "static"
_BOARD_CSS = _STATIC_DIR / "board.css"
_BOARD_JS = _STATIC_DIR / "board.js"

# ── documented allowlist ────────────────────────────────────────────
# Dynamic / utility classes that may be emitted by the renderer without a
# dedicated ``.<class>`` rule in board.css.  Keep this list small and
# justify every entry.
#
#   hidden — visibility utility toggled dynamically; it appears in
#            board.css only via compound selectors (``.drawer.hidden``,
#            ``.board-column.hidden``) so it is already matched by the
#            CSS extraction below, but it is listed here as documentation
#            of intent in case those compound rules change.
_ALLOWLIST = frozenset({"hidden"})

# Matches ``.class-name`` where the name starts with a letter/underscore
# and is not preceded by a digit (avoids matching decimals like ``0.85``
# inside ``rgb(0 0 0 / 0.85)``).  Mirrors the regex used by integrity §21.
_CSS_CLASS_RE = re.compile(r"(?<!\d)\.([a-zA-Z_][\w-]*)")
_HTML_CLASS_RE = re.compile(r'class="([^"]+)"')


def _css_class_selectors(css: str) -> set[str]:
    return set(_CSS_CLASS_RE.findall(css))


def _rendered_class_tokens() -> set[str]:
    """Every class token emitted by the renderer for a representative board.

    ``sample_cards`` exercises cards with badges and timestamps so that the
    badge/timestamp class literals are present in the output; ``render_board``
    always emits the column and drawer chrome.
    """
    html = render_board(MockAdapter(), sample_cards())
    tokens: set[str] = set()
    for attr in _HTML_CLASS_RE.findall(html):
        tokens.update(token for token in attr.split() if token)
    return tokens


def _js_referenced_classes(js: str) -> set[str]:
    """Class names referenced by board.js (className=, classList.*, selectors, HTML)."""
    classes: set[str] = set()

    for attr in re.findall(r'\.className\s*=\s*"([^"]+)"', js):
        classes.update(token for token in attr.split() if token)

    classes.update(re.findall(r'\.classList\.(?:add|remove|toggle)\("([^"]+)"\)', js))

    for sel in re.findall(r'\.(?:querySelector(?:All)?|closest)\("([^"]+)"\)', js):
        classes.update(_CSS_CLASS_RE.findall(sel))

    for attr in _HTML_CLASS_RE.findall(js):
        classes.update(token for token in attr.split() if token)

    return classes


def test_renderer_emits_classes() -> None:
    """Sanity: the renderer emits a non-trivial set of class tokens."""
    tokens = _rendered_class_tokens()
    assert tokens, "render_board produced no class attributes"
    # Spot-check a few literals so the extraction can't silently go empty.
    assert {"board", "board-card", "drawer"} <= tokens


def test_every_rendered_class_has_a_css_rule() -> None:
    """Every class ``_render.py`` emits is styled by board.css (or allowed)."""
    css_classes = _css_class_selectors(_BOARD_CSS.read_text(encoding="utf-8"))
    rendered = _rendered_class_tokens()

    missing = sorted(
        cls for cls in rendered if cls not in css_classes and cls not in _ALLOWLIST
    )
    assert missing == [], (
        "class(es) emitted by _render.py have no matching selector in "
        f"board.css: {missing}"
    )


def test_every_rendered_class_is_css_styled_or_js_referenced() -> None:
    """Close the Python<->CSS<->JS triangle: each emitted class is known elsewhere."""
    css_classes = _css_class_selectors(_BOARD_CSS.read_text(encoding="utf-8"))
    js_classes = _js_referenced_classes(_BOARD_JS.read_text(encoding="utf-8"))
    known = css_classes | js_classes | _ALLOWLIST

    rendered = _rendered_class_tokens()
    orphans = sorted(cls for cls in rendered if cls not in known)
    assert orphans == [], (
        "class(es) emitted by _render.py are neither styled by board.css nor "
        f"referenced by board.js: {orphans}"
    )
