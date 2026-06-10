"""Tests for robotsix_board._render."""

from __future__ import annotations

import json
import re
from typing import Any

from robotsix_board import RenderMode
from robotsix_board._render import esc, render_board, render_config_script

# ── mock adapter ──────────────────────────────────────────────────────


class MockAdapter:
    """Minimal BoardAdapter implementation for testing."""

    def columns(self) -> list[tuple[str, str]]:
        return [
            ("todo", "To Do"),
            ("in_progress", "In Progress"),
            ("done", "Done"),
        ]

    def card_id(self, c: object) -> str:
        assert isinstance(c, dict)
        return c["id"]  # type: ignore[no-any-return]

    def card_title(self, c: object) -> str:
        assert isinstance(c, dict)
        return c["title"]  # type: ignore[no-any-return]

    def card_badges(self, c: object) -> list[str]:
        assert isinstance(c, dict)
        return c.get("badges", [])  # type: ignore[no-any-return]

    def card_timestamps(self, c: object) -> dict[str, str]:
        assert isinstance(c, dict)
        return c.get("timestamps", {})  # type: ignore[no-any-return]

    def move_endpoint(self, c: object) -> tuple[str, str]:
        assert isinstance(c, dict)
        return (f"/move/{c['id']}", "POST")

    def move_endpoint_template(self) -> str:
        return "/move/{card_id}/{target_status}"

    def render_mode(self) -> RenderMode:
        return RenderMode.SERVER_FRAGMENTS


# ── helpers ───────────────────────────────────────────────────────────


def _sample_cards() -> dict[str, list[dict[str, object]]]:
    """Return cards grouped by status for use with render_board."""
    return {
        "todo": [
            {
                "id": "card-1",
                "title": "Fix login bug",
                "badges": ["bug", "high"],
                "timestamps": {"created": "2025-01-01", "updated": "2025-01-02"},
            },
            {
                "id": "card-2",
                "title": "Add <script> sanitizer",
                "badges": ["feature"],
                "timestamps": {},
            },
        ],
        "in_progress": [
            {
                "id": "card-3",
                "title": 'Refactor "core" module',
                "badges": [],
                "timestamps": {"created": "2025-01-03"},
            },
        ],
        "done": [],
    }


def _adapter() -> MockAdapter:
    return MockAdapter()


def _extract_script_json(result: str) -> dict[str, Any]:
    """Extract and parse the JSON embedded in the rendered <script> tag."""
    match = re.search(r"<script[^>]*>\s*(.*?)\s*</script>", result, re.DOTALL)
    assert match is not None, "Could not find script tag in rendered output"
    return json.loads(match.group(1))  # type: ignore[no-any-return]


# ── tests ─────────────────────────────────────────────────────────────


class TestEsc:
    def test_esc_escapes_html(self) -> None:
        s = "<script>alert(\"&\" 'x')</script>"
        result = esc(s)
        assert "&lt;" in result
        assert "&gt;" in result
        assert "&amp;" in result
        assert "&quot;" in result
        assert "&#x27;" in result
        # The original dangerous chars should be gone
        assert "<" not in result
        assert ">" not in result
        assert '"' not in result

    def test_esc_noop_on_safe_string(self) -> None:
        assert esc("hello world") == "hello world"


class TestRenderBoard:
    def test_render_board_has_columns(self) -> None:
        adapter = _adapter()
        cards = _sample_cards()
        html = render_board(adapter, cards)

        assert 'id="board"' in html
        assert html.count('class="board-column"') == 3
        assert "To Do" in html
        assert "In Progress" in html
        assert "Done" in html

    def test_render_card_includes_fields(self) -> None:
        adapter = _adapter()
        cards = _sample_cards()
        html = render_board(adapter, cards)

        # Title
        assert "Fix login bug" in html
        # Badge
        assert "bug" in html
        assert "high" in html
        # Timestamp
        assert "created: 2025-01-01" in html

    def test_render_card_escapes_html_in_title(self) -> None:
        adapter = _adapter()
        cards = {
            "todo": [
                {
                    "id": "xss-1",
                    "title": "<script>alert(1)</script>",
                    "badges": [],
                    "timestamps": {},
                }
            ],
        }
        html = render_board(adapter, cards)
        assert "<script>alert(1)</script>" not in html
        assert "&lt;script&gt;" in html

    def test_render_move_control_lists_other_columns(self) -> None:
        adapter = _adapter()
        cards = _sample_cards()
        html = render_board(adapter, cards)

        # Cards in "todo" column should have move options for
        # "in_progress" and "done", but NOT "todo" itself.
        # Parse out the first card's move form options.
        # Use regex to find <option> tags within the first card.
        card_pattern = re.compile(
            r'<div class="board-card".*?</div>\s*</div>\s*</div>',
            re.DOTALL,
        )
        first_card_match = card_pattern.search(html)
        assert first_card_match is not None
        first_card_html = first_card_match.group(0)

        # The first card is in "todo" column, so its move form should
        # include "In Progress" and "Done" but not "To Do" as target.
        assert "In Progress" in first_card_html
        assert "Done" in first_card_html
        # The move-to prompt should be present
        assert "Move to…" in first_card_html

    def test_render_board_includes_drawer_shell(self) -> None:
        adapter = _adapter()
        cards = _sample_cards()
        html = render_board(adapter, cards)

        assert 'id="drawer"' in html
        assert "drawer hidden" in html
        assert "drawer-content" in html

    def test_render_board_css_classes_present(self) -> None:
        adapter = _adapter()
        cards = _sample_cards()
        html = render_board(adapter, cards)

        expected_classes = [
            "board",
            "board-column",
            "board-column-header",
            "board-card",
            "board-card-title",
            "board-card-badges",
            "board-badge",
            "board-card-timestamps",
            "board-card-move",
        ]
        for cls in expected_classes:
            assert cls in html, f"Missing CSS class: {cls}"

    def test_render_board_empty_column(self) -> None:
        adapter = _adapter()
        cards: dict[str, list[object]] = {
            "todo": [],
            "in_progress": [],
            "done": [],
        }
        html = render_board(adapter, cards)
        # All three columns should show count 0
        assert html.count(">0<") == 3

    def test_render_board_card_count_badge(self) -> None:
        adapter = _adapter()
        cards = _sample_cards()
        html = render_board(adapter, cards)

        # todo: 2 cards, in_progress: 1, done: 0
        assert ">2<" in html  # todo count
        assert ">1<" in html  # in_progress count

    def test_render_config_script_is_valid_json(self) -> None:
        adapter = _adapter()
        result = render_config_script(adapter)

        # Extract JSON between <script> tags
        parsed = _extract_script_json(result)
        assert isinstance(parsed, dict)

    def test_render_config_script_has_expected_keys(self) -> None:
        adapter = _adapter()
        result = render_config_script(adapter)

        parsed = _extract_script_json(result)

        assert "columns" in parsed
        assert parsed["columns"] == [
            ["todo", "To Do"],
            ["in_progress", "In Progress"],
            ["done", "Done"],
        ]
        assert "move_endpoint_template" in parsed
        assert parsed["move_endpoint_template"] == "/move/{card_id}/{target_status}"
        assert "move_method" in parsed
        assert parsed["move_method"] == "POST"
        assert "render_mode" in parsed
        assert parsed["render_mode"] == "json_hydration"
        assert "refresh_interval_ms" in parsed
        assert parsed["refresh_interval_ms"] == 30000

    def test_render_config_script_includes_refresh_url_when_set(self) -> None:
        adapter = _adapter()
        result = render_config_script(adapter, refresh_url="/api/board/cards")

        parsed = _extract_script_json(result)

        assert "refresh_url" in parsed
        assert parsed["refresh_url"] == "/api/board/cards"

    def test_render_config_script_omits_refresh_url_when_none(self) -> None:
        adapter = _adapter()
        result = render_config_script(adapter, refresh_url=None)

        parsed = _extract_script_json(result)

        assert "refresh_url" not in parsed

    def test_render_config_script_uses_adapter_move_endpoint_template(self) -> None:
        """A custom template from the adapter must appear in the emitted config."""
        adapter = MockAdapter()
        adapter.move_endpoint_template = lambda: "/api/board/{card_id}/transition"  # type: ignore[method-assign]

        result = render_config_script(adapter)
        parsed = _extract_script_json(result)

        assert parsed["move_endpoint_template"] == "/api/board/{card_id}/transition"
