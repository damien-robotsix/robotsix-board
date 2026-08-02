"""Server-side rendering for the robotsix-board DOM contract.

Exports:
    esc                  — HTML-escape a string.
    render_board         — Produce full #board HTML for SERVER_FRAGMENTS mode.
    render_config_script — Emit a <script id="board-config"> tag for JSON_HYDRATION.
"""

from __future__ import annotations

import html as _html
import json as _json
import logging
from collections.abc import Mapping, Sequence
from typing import TYPE_CHECKING

_logger = logging.getLogger(__name__)

if TYPE_CHECKING:
    from . import BoardAdapter

__all__ = [
    "esc",
    "render_board",
    "render_config_script",
]


def esc(s: str) -> str:
    """HTML-escape *s* for safe interpolation.

    Delegates to :func:`html.escape` with ``quote=True``.  This is the
    single centralized escaping helper required by the design contract.
    """
    return _html.escape(s, quote=True)


def _render_card(adapter: BoardAdapter, card: object) -> list[str]:
    """Render a single card's HTML fragments.

    Returns a list of HTML strings to be appended to the column's card
    list.  Returns an empty list (no output) when card property access
    raises an exception.
    """
    try:
        cid = adapter.card_id(card)
        title = adapter.card_title(card)
        badges = adapter.card_badges(card)
        timestamps = adapter.card_timestamps(card)
    except Exception:
        _logger.warning("Failed to render card %r: skipping", card, exc_info=True)
        return []

    parts: list[str] = []

    parts.append(
        f'<div class="board-card" id="card-{esc(cid)}" data-card-id="{esc(cid)}"'
        f' role="listitem" tabindex="0" aria-haspopup="dialog"'
        f' aria-expanded="false">'
    )

    # title
    parts.append(f'<div class="board-card-title">{esc(title)}</div>')

    # badges
    parts.append('<div class="board-card-badges">')
    parts.extend(f'<span class="board-badge">{esc(badge)}</span>' for badge in badges)
    parts.append("</div>")  # .board-card-badges

    # timestamps
    if timestamps:
        parts.append('<div class="board-card-timestamps">')
        for key, value in timestamps.items():
            parts.append(
                f'<span class="board-timestamp">{esc(key)}: {esc(value)}</span>'
            )
        parts.append("</div>")  # .board-card-timestamps

    # ── optional duck-typed hook: card_extra_html(card) ──
    card_hook = getattr(adapter, "card_extra_html", None)
    if callable(card_hook):
        try:
            extra = card_hook(card)
        except Exception:
            _logger.warning(
                "card_extra_html hook failed for card %r: omitting",
                card,
                exc_info=True,
            )
            extra = ""
    else:
        extra = ""
    if extra:
        parts.append(extra)

    parts.append("</div>")  # .board-card

    return parts


def render_board(adapter: BoardAdapter, cards: Mapping[str, Sequence[object]]) -> str:
    """Render the full board HTML for SERVER_FRAGMENTS mode.

    Produces the complete ``#board`` container with one ``.board-column``
    per :meth:`~BoardAdapter.columns` entry.  *cards* maps each column's
    ``status_key`` to the list of card objects that belong in that column.
    """
    try:
        columns = adapter.columns()
    except Exception:
        _logger.warning(
            "Failed to fetch columns from adapter %r", adapter, exc_info=True
        )
        return '<div id="board" class="board"></div>'

    parts: list[str] = ['<div id="board" class="board">']

    for status_key, label in columns:
        column_cards = cards.get(status_key, [])
        col_heading_id = f"col-heading-{esc(status_key)}"
        parts.append(
            f'<div class="board-column" data-status="{esc(status_key)}"'
            f' aria-labelledby="{col_heading_id}">'
        )

        # ── header ──
        parts.append('<div class="board-column-header">')
        parts.append(
            f'<h2 class="board-column-label" id="{col_heading_id}">{esc(label)}</h2>'
        )
        parts.append(f'<span class="board-column-count">{len(column_cards)}</span>')
        parts.append("</div>")  # .board-column-header

        # ── card list ──
        parts.append('<div class="board-column-cards" role="list">')

        for card in column_cards:
            parts.extend(_render_card(adapter, card))

        parts.append("</div>")  # .board-column-cards

        # ── optional duck-typed hook: column_extra_html(status_key) ──
        col_hook = getattr(adapter, "column_extra_html", None)
        if callable(col_hook):
            try:
                col_extra = col_hook(status_key)
            except Exception:
                _logger.warning(
                    "column_extra_html hook failed for status_key %r: omitting",
                    status_key,
                    exc_info=True,
                )
                col_extra = ""
        else:
            col_extra = ""
        if col_extra:
            parts.append(col_extra)

        parts.append("</div>")  # .board-column

    parts.append("</div>")  # #board

    # ── drawer shell ──
    parts.append(
        '<div id="drawer" class="drawer hidden"'
        ' role="dialog" aria-modal="true" aria-labelledby="drawer-title">'
        '<div class="drawer-content"></div>'
        "</div>"
    )

    return "\n".join(parts)


def render_config_script(
    adapter: BoardAdapter,
    *,
    refresh_url: str | None = None,
    refresh_interval_ms: int = 30_000,
    gate_endpoint: str | None = None,
) -> str:
    """Render a ``<script id="board-config" type="application/json">`` tag.

    Emits JSON configuration consumed by ``board.js`` in JSON_HYDRATION
    mode.  The config includes column definitions from *adapter* plus
    JS-specific keyword-only parameters.
    """
    from . import RenderMode  # lazy — avoids circular import at module level

    try:
        columns = adapter.columns()
    except Exception:
        _logger.warning(
            "Failed to fetch columns from adapter %r", adapter, exc_info=True
        )
        columns = []

    config: dict[str, object] = {
        "columns": [[k, lbl] for k, lbl in columns],
        "render_mode": RenderMode.JSON_HYDRATION.value,
        "refresh_interval_ms": refresh_interval_ms,
    }
    if refresh_url is not None:
        config["refresh_url"] = refresh_url
    if gate_endpoint is not None:
        config["gate_endpoint"] = gate_endpoint

    json_str = _json.dumps(config, separators=(",", ":"), sort_keys=True)
    return f'<script id="board-config" type="application/json">\n{json_str}\n</script>'
