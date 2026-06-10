"""Server-side rendering for the robotsix-board DOM contract.

Exports:
    esc                  — HTML-escape a string.
    render_board         — Produce full #board HTML for SERVER_FRAGMENTS mode.
    render_config_script — Emit a <script id="board-config"> tag for JSON_HYDRATION.
"""

from __future__ import annotations

import html as _html
import json as _json
from collections.abc import Mapping, Sequence
from typing import TYPE_CHECKING

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


def render_board(adapter: BoardAdapter, cards: Mapping[str, Sequence[object]]) -> str:
    """Render the full board HTML for SERVER_FRAGMENTS mode.

    Produces the complete ``#board`` container with one ``.board-column``
    per :meth:`~BoardAdapter.columns` entry.  *cards* maps each column's
    ``status_key`` to the list of card objects that belong in that column.
    """
    columns = adapter.columns()
    parts: list[str] = ['<div id="board" class="board">']

    for status_key, label in columns:
        column_cards = cards.get(status_key, [])
        parts.append(f'<div class="board-column" data-status="{esc(status_key)}">')

        # ── header ──
        parts.append('<div class="board-column-header">')
        parts.append(f'<h2 class="board-column-label">{esc(label)}</h2>')
        parts.append(f'<span class="board-column-count">{len(column_cards)}</span>')
        parts.append("</div>")  # .board-column-header

        # ── card list ──
        parts.append('<div class="board-column-cards">')

        other_keys = [k for k, _ in columns if k != status_key]
        other_labels = {k: lbl for k, lbl in columns}

        for card in column_cards:
            cid = adapter.card_id(card)
            title = adapter.card_title(card)
            badges = adapter.card_badges(card)
            timestamps = adapter.card_timestamps(card)
            move_url, move_method = adapter.move_endpoint(card)

            parts.append(
                f'<div class="board-card" id="card-{esc(cid)}"'
                f' data-card-id="{esc(cid)}">'
            )

            # title
            parts.append(f'<div class="board-card-title">{esc(title)}</div>')

            # badges
            parts.append('<div class="board-card-badges">')
            for badge in badges:
                parts.append(f'<span class="board-badge">{esc(badge)}</span>')
            parts.append("</div>")  # .board-card-badges

            # timestamps
            if timestamps:
                parts.append('<div class="board-card-timestamps">')
                for key, value in timestamps.items():
                    parts.append(
                        f'<span class="board-timestamp">{esc(key)}: {esc(value)}</span>'
                    )
                parts.append("</div>")  # .board-card-timestamps

            # move form
            parts.append(
                f'<form class="board-card-move" method="{esc(move_method)}"'
                f' action="{esc(move_url)}">'
            )
            parts.append('<select name="target_status" class="board-move-select">')
            parts.append('<option value="">Move to…</option>')
            for other_key in other_keys:
                parts.append(
                    f'<option value="{esc(other_key)}">'
                    f"{esc(other_labels[other_key])}"
                    f"</option>"
                )
            parts.append("</select>")
            parts.append(
                '<button type="submit" class="board-move-submit">Move</button>'
            )
            parts.append("</form>")  # .board-card-move

            card_hook = getattr(adapter, "card_extra_html", None)
            extra = card_hook(card) if callable(card_hook) else ""
            if extra:
                parts.append(extra)

            parts.append("</div>")  # .board-card

        parts.append("</div>")  # .board-column-cards

        col_hook = getattr(adapter, "column_extra_html", None)
        col_extra = col_hook(status_key) if callable(col_hook) else ""
        if col_extra:
            parts.append(col_extra)

        parts.append("</div>")  # .board-column

    parts.append("</div>")  # #board

    # ── drawer shell ──
    parts.append(
        '<div id="drawer" class="drawer hidden">'
        '<div class="drawer-content"></div>'
        "</div>"
    )

    return "\n".join(parts)


def render_config_script(
    adapter: BoardAdapter,
    *,
    refresh_url: str | None = None,
    refresh_interval_ms: int = 30_000,
) -> str:
    """Render a ``<script id="board-config" type="application/json">`` tag.

    Emits JSON configuration consumed by ``board.js`` in JSON_HYDRATION
    mode.  The config includes column definitions from *adapter* plus
    JS-specific keyword-only parameters.
    """
    columns = adapter.columns()

    move_method = "POST"
    move_endpoint_template = adapter.move_endpoint_template()

    config: dict[str, object] = {
        "columns": [[k, lbl] for k, lbl in columns],
        "move_endpoint_template": move_endpoint_template,
        "move_method": move_method,
        "render_mode": "json_hydration",
        "refresh_interval_ms": refresh_interval_ms,
    }
    if refresh_url is not None:
        config["refresh_url"] = refresh_url

    json_str = _json.dumps(config, separators=(",", ":"), sort_keys=True)
    return f'<script id="board-config" type="application/json">\n{json_str}\n</script>'
