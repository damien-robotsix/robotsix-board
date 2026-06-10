"""robotsix-board — shared kanban-board frontend library.

This package owns the board HTML/CSS/JS chrome (a column-per-status board
of cards with a move-between-columns action, auto-refresh, and a
click-through detail panel). It is parameterized by a small data adapter
(see :class:`BoardAdapter`) and a render mode (server-rendered HTML
fragments vs JSON + client-side JS hydration).

The public surface is intentionally minimal for the create step:

* :data:`__version__` — the package version, matching ``[project].version``.
* :func:`static_dir` — on-disk path to the packaged ``static/`` assets.
* :class:`BoardAdapter` — the adapter contract anchor the build-out targets.
* :class:`RenderMode` — the render-mode selector.

See ``README.md`` for the full design contract.
"""

from __future__ import annotations

import pathlib
from enum import StrEnum
from typing import Protocol, runtime_checkable

__version__ = "0.1.0"

__all__ = [
    "__version__",
    "static_dir",
    "RenderMode",
    "BoardAdapter",
    "esc",
    "render_board",
    "render_config_script",
]

from ._render import esc, render_board, render_config_script  # noqa: E402


def static_dir() -> pathlib.Path:
    """Return the on-disk path to the packaged ``static/`` directory.

    A FastAPI consumer (e.g. robotsix-mill) mounts this directory as a
    static-files route; a stdlib consumer (e.g. robotsix-auto-mail) reads
    the asset files and inlines them into its server-rendered responses.
    """
    return pathlib.Path(__file__).parent / "static"


class RenderMode(StrEnum):
    """Render-mode selector for the board chrome.

    * :attr:`SERVER_FRAGMENTS` — the board is rendered as server-side HTML
      fragments (stdlib/Jinja consumer, e.g. robotsix-auto-mail).
    * :attr:`JSON_HYDRATION` — the board ships JSON and is hydrated by
      ``board.js`` on the client (FastAPI consumer, e.g. robotsix-mill).
    """

    SERVER_FRAGMENTS = "server_fragments"
    JSON_HYDRATION = "json_hydration"


@runtime_checkable
class BoardAdapter(Protocol):
    """Contract a consumer implements to drive the shared board chrome.

    This is the stable import target the follow-on build-out fills in. The
    create step ships a skeleton: methods document the contract but are not
    implemented. See ``README.md`` for the authoritative description of the
    column order/labels, card-field accessors, move endpoint, and render
    mode.
    """

    def columns(self) -> list[tuple[str, str]]:
        """Return the ordered ``(status_key, label)`` pairs for the board columns."""
        raise NotImplementedError  # pragma: no cover

    def card_id(self, card: object) -> str:
        """Return the stable identifier for ``card``."""
        raise NotImplementedError  # pragma: no cover

    def card_title(self, card: object) -> str:
        """Return the display title for ``card``."""
        raise NotImplementedError  # pragma: no cover

    def card_badges(self, card: object) -> list[str]:
        """Return the badge labels to render on ``card``."""
        raise NotImplementedError  # pragma: no cover

    def card_timestamps(self, card: object) -> dict[str, str]:
        """Return the timestamp fields (e.g. created/updated) for ``card``."""
        raise NotImplementedError  # pragma: no cover

    def move_endpoint(self, card: object) -> tuple[str, str]:
        """Return the ``(url, http_method)`` used to move ``card`` between columns."""
        raise NotImplementedError  # pragma: no cover

    def card_extra_html(self, card: object) -> str:
        """Return trusted raw HTML to inject inside this card's ``.board-card``.

        The returned string is appended VERBATIM (NOT through ``esc()``)
        immediately after the move form, still inside the ``.board-card``
        container. It is the consumer's responsibility to escape any
        dynamic/untrusted text it embeds. Defaults to ``""`` (no injection).
        """
        return ""

    def column_extra_html(self, status_key: str) -> str:
        """Return trusted raw HTML to inject inside this column's ``.board-column``.

        The returned string is appended VERBATIM (NOT through ``esc()``)
        after the ``.board-column-cards`` list, still inside the
        ``.board-column`` container. It is the consumer's responsibility to
        escape any dynamic/untrusted text it embeds. Defaults to ``""``.
        """
        return ""

    def move_endpoint_template(self) -> str:
        """Return the URL template used by the board config in JSON_HYDRATION mode.

        The template should contain the placeholders ``{card_id}`` and
        ``{target_status}``, e.g. ``"/move/{card_id}/{target_status}"``.
        """
        raise NotImplementedError  # pragma: no cover

    def render_mode(self) -> RenderMode:
        """Return the render mode this consumer uses."""
        raise NotImplementedError  # pragma: no cover
