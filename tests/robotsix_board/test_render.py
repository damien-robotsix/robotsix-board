"""Tests for robotsix_board._render."""

from __future__ import annotations

import json
import re
from typing import Any, cast

import pytest

from robotsix_board import BoardAdapter
from robotsix_board._render import _render_card, esc, render_board, render_config_script
from tests.conftest import MockAdapter, sample_cards


def _adapter() -> MockAdapter:
    return MockAdapter()


def _extract_script_json(result: str) -> dict[str, Any]:
    """Extract and parse the JSON embedded in the rendered <script> tag."""
    match = re.search(r"<script[^>]*>\s*(.*?)\s*</script>", result, re.DOTALL)
    assert match is not None, "Could not find script tag in rendered output"
    return json.loads(match.group(1))  # type: ignore[no-any-return]


# ── tests ─────────────────────────────────────────────────────────────


class TestEsc:
    @pytest.mark.parametrize(
        ("s", "expected_in", "expected_not_in"),
        [
            pytest.param(
                "<script>alert(1)</script>",
                ["&lt;", "&gt;"],
                ["<script>"],
                id="html_special_chars",
            ),
            pytest.param("hello world", ["hello world"], [], id="safe_string"),
            pytest.param("", [""], [], id="empty_string"),
            pytest.param("cafe", ["cafe"], [], id="unicode"),
        ],
    )
    def test_esc(
        self, s: str, expected_in: list[str], expected_not_in: list[str]
    ) -> None:
        result = esc(s)
        for text in expected_in:
            assert text in result
        for text in expected_not_in:
            assert text not in result


class TestRenderCard:
    """Tests for _render_card helper."""

    @pytest.fixture(autouse=True)
    def _setup(self) -> None:
        self.adapter = MockAdapter()
        columns = self.adapter.columns()
        self.other_keys = [k for k, _ in columns if k != "todo"]
        self.other_labels = dict(columns)

    @pytest.mark.parametrize(
        ("card", "expected_in", "expected_not_in"),
        [
            pytest.param(
                {"id": "c1", "title": "Fix bug", "badges": [], "timestamps": {}},
                ["Fix bug", 'class="board-card-title"'],
                [],
                id="basic_title",
            ),
            pytest.param(
                {
                    "id": "c2",
                    "title": "Task",
                    "badges": ["bug", "high"],
                    "timestamps": {},
                },
                ["bug", "high"],
                [],
                id="badges_rendered",
            ),
            pytest.param(
                {"id": "c3", "title": "Task", "badges": [], "timestamps": {}},
                ["board-card-badges"],
                ['class="board-badge"'],
                id="no_badges",
            ),
            pytest.param(
                {
                    "id": "c4",
                    "title": "Task",
                    "badges": [],
                    "timestamps": {"created": "2025-01-01"},
                },
                ["created: 2025-01-01", 'class="board-card-timestamps"'],
                [],
                id="timestamps_rendered",
            ),
            pytest.param(
                {"id": "c5", "title": "Task", "badges": [], "timestamps": {}},
                [],
                ["board-card-timestamps"],
                id="empty_timestamps",
            ),
        ],
    )
    def test_card_rendering(
        self,
        card: dict[str, object],
        expected_in: list[str],
        expected_not_in: list[str],
    ) -> None:
        parts = _render_card(self.adapter, card, self.other_keys, self.other_labels)
        html = "".join(parts)
        for text in expected_in:
            assert text in html
        for text in expected_not_in:
            assert text not in html

    # ── move-form rendering ──

    def test_move_form_present(self) -> None:
        card = {"id": "c6", "title": "Task", "badges": [], "timestamps": {}}
        parts = _render_card(self.adapter, card, self.other_keys, self.other_labels)
        html = "".join(parts)
        assert 'class="board-card-move"' in html
        assert "Move to…" in html
        assert "Move</button>" in html

    def test_move_form_lists_other_columns(self) -> None:
        card = {"id": "c7", "title": "Task", "badges": [], "timestamps": {}}
        parts = _render_card(self.adapter, card, self.other_keys, self.other_labels)
        html = "".join(parts)
        # Current column "todo"; other columns "in_progress", "done"
        assert "In Progress" in html
        assert "Done" in html
        assert "To Do" not in html  # current column not listed as target

    # ── HTML escaping ──

    def test_html_escaped_in_title(self) -> None:
        card = {
            "id": "xss-1",
            "title": "<script>alert(1)</script>",
            "badges": [],
            "timestamps": {},
        }
        parts = _render_card(self.adapter, card, self.other_keys, self.other_labels)
        html = "".join(parts)
        assert "<script>alert(1)</script>" not in html
        assert "&lt;script&gt;" in html

    def test_html_escaped_in_card_id(self) -> None:
        card = {
            "id": 'x" onmouseover="alert(1)',
            "title": "Safe",
            "badges": [],
            "timestamps": {},
        }
        parts = _render_card(self.adapter, card, self.other_keys, self.other_labels)
        html = "".join(parts)
        # Double-quotes in the id are escaped, preventing attribute injection.
        assert 'onmouseover="alert(1)"' not in html
        assert "&quot;" in html

    # ── adapter error handling ──

    def test_exception_in_card_property_skips_card(self) -> None:
        class FailingAdapter(MockAdapter):
            def card_title(self, card: object) -> str:
                raise RuntimeError("boom")

        adapter = FailingAdapter()
        card = {"id": "fail-1", "title": "irrelevant"}
        parts = _render_card(adapter, card, self.other_keys, self.other_labels)
        assert parts == []

    # ── card_extra_html injection ──

    def test_card_extra_html_injected_verbatim(self) -> None:
        class HookAdapter(MockAdapter):
            def card_extra_html(self, card: object) -> str:
                return '<button class="x-delete">Del</button>'

        adapter = HookAdapter()
        card = {"id": "h1", "title": "Task", "badges": [], "timestamps": {}}
        parts = _render_card(adapter, card, self.other_keys, self.other_labels)
        html = "".join(parts)
        assert '<button class="x-delete">Del</button>' in html

    def test_card_extra_html_hook_exception_omits_output(self) -> None:
        class FailingHookAdapter(MockAdapter):
            def card_extra_html(self, card: object) -> str:
                raise RuntimeError("hook boom")

        adapter = FailingHookAdapter()
        card = {"id": "h2", "title": "Task", "badges": [], "timestamps": {}}
        parts = _render_card(adapter, card, self.other_keys, self.other_labels)
        html = "".join(parts)
        # Card is still rendered; extra output is just omitted.
        assert "Task" in html

    def test_no_card_extra_html_on_adapter_without_hook(self) -> None:
        card = {"id": "h3", "title": "Task", "badges": [], "timestamps": {}}
        parts = _render_card(self.adapter, card, self.other_keys, self.other_labels)
        html = "".join(parts)
        assert 'class="x-delete"' not in html

    # ── empty card fields ──

    def test_empty_title_still_renders(self) -> None:
        card = {"id": "e1", "title": "", "badges": [], "timestamps": {}}
        parts = _render_card(self.adapter, card, self.other_keys, self.other_labels)
        html = "".join(parts)
        assert 'id="card-e1"' in html
        assert "board-card-title" in html

    def test_card_id_data_attribute(self) -> None:
        card = {"id": "my-card-42", "title": "T", "badges": [], "timestamps": {}}
        parts = _render_card(self.adapter, card, self.other_keys, self.other_labels)
        html = "".join(parts)
        assert 'id="card-my-card-42"' in html
        assert 'data-card-id="my-card-42"' in html

    # ── structural attributes ──

    def test_returns_list_of_strings(self) -> None:
        card = {"id": "s1", "title": "T", "badges": [], "timestamps": {}}
        parts = _render_card(self.adapter, card, self.other_keys, self.other_labels)
        assert isinstance(parts, list)
        assert all(isinstance(p, str) for p in parts)

    def test_returns_empty_list_on_skip(self) -> None:
        class BoomAdapter(MockAdapter):
            def card_id(self, card: object) -> str:
                raise ValueError("nope")

        adapter = BoomAdapter()
        card = {"id": "b1", "title": "T"}
        parts = _render_card(adapter, card, self.other_keys, self.other_labels)
        assert parts == []
        assert isinstance(parts, list)


class TestRenderBoard:
    def test_render_board_has_columns(self) -> None:
        adapter = _adapter()
        cards = sample_cards()
        html = render_board(adapter, cards)

        assert 'id="board"' in html
        assert html.count('class="board-column"') == 3
        assert "To Do" in html
        assert "In Progress" in html
        assert "Done" in html

    def test_render_card_includes_fields(self) -> None:
        adapter = _adapter()
        cards = sample_cards()
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
        cards = sample_cards()
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
        cards = sample_cards()
        html = render_board(adapter, cards)

        assert 'id="drawer"' in html
        assert "drawer hidden" in html
        assert "drawer-content" in html

    def test_render_board_css_classes_present(self) -> None:
        adapter = _adapter()
        cards = sample_cards()
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

    def test_render_board_css_classes_match_css_file(self) -> None:
        """Every CSS class rendered by render_board() must exist in board.css."""
        from pathlib import Path

        css_path = (
            Path(__file__).resolve().parent.parent.parent
            / "src"
            / "robotsix_board"
            / "static"
            / "board.css"
        )
        css_text = css_path.read_text()

        # Extract CSS class selectors: .class-name where class-name
        # starts with a letter.  Negative lookbehind for a digit
        # avoids matching decimal numbers (0.85, rgba(0.4), etc.).
        css_classes: set[str] = set()
        for m in re.finditer(r"(?<!\d)\.([a-zA-Z_][\w-]*)", css_text):
            css_classes.add(m.group(1))

        # Collect every class="..." value from render_board() output.
        adapter = _adapter()
        cards = sample_cards()
        html = render_board(adapter, cards)

        render_classes: set[str] = set()
        for m in re.finditer(r'class="([^"]+)"', html):
            for cls in m.group(1).split():
                if cls:
                    render_classes.add(cls)

        missing = render_classes - css_classes
        assert not missing, (
            f"CSS classes rendered by render_board() but missing from board.css: "
            f"{sorted(missing)}"
        )

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
        cards = sample_cards()
        html = render_board(adapter, cards)

        # todo: 2 cards, in_progress: 1, done: 0
        assert ">2<" in html  # todo count
        assert ">1<" in html  # in_progress count

    def test_render_board_default_hooks_inject_nothing(self) -> None:
        # MockAdapter does not define the hooks; the getattr fallback must
        # render without injecting any sentinel content.
        adapter = _adapter()
        cards = sample_cards()
        html = render_board(adapter, cards)

        assert 'class="x-delete"' not in html
        assert 'class="col-extra"' not in html

    def test_render_board_adapter_without_hook_methods(self) -> None:
        # A bare structural adapter that lacks the hook methods entirely
        # exercises the getattr non-callable fallback branch (the path that
        # keeps not-yet-updated external consumers rendering identically).
        class BareAdapter:
            def columns(self) -> list[tuple[str, str]]:
                return [("todo", "To Do")]

            def card_id(self, card: object) -> str:
                assert isinstance(card, dict)
                return card["id"]  # type: ignore[no-any-return]

            def card_title(self, card: object) -> str:
                assert isinstance(card, dict)
                return card["title"]  # type: ignore[no-any-return]

            def card_badges(self, card: object) -> list[str]:
                return []

            def card_timestamps(self, card: object) -> dict[str, str]:
                return {}

            def move_endpoint(self, card: object) -> tuple[str, str]:
                assert isinstance(card, dict)
                return (f"/move/{card['id']}", "POST")

        adapter = cast(BoardAdapter, BareAdapter())
        html = render_board(adapter, {"todo": [{"id": "b1", "title": "t"}]})

        assert 'class="x-delete"' not in html
        assert 'class="col-extra"' not in html
        assert 'id="card-b1"' in html

    def test_render_board_card_extra_html_injected_verbatim(self) -> None:
        class CardHookAdapter(MockAdapter):
            def card_extra_html(self, card: object) -> str:
                return (
                    '<button class="x-delete" data-id="'
                    + esc(self.card_id(card))
                    + '">Del</button>'
                )

        adapter = CardHookAdapter()
        cards = sample_cards()
        html = render_board(adapter, cards)

        sentinel = '<button class="x-delete" data-id="card-1">Del</button>'
        # Verbatim, not escaped.
        assert sentinel in html
        assert "&lt;button" not in html

        # Positioned inside .board-card: after the move form's </form>,
        # before the card-closing </div>.
        move_form_end = html.index("</form>")
        sentinel_pos = html.index(sentinel)
        card_close = html.index("</div>", sentinel_pos)
        assert move_form_end < sentinel_pos < card_close

    def test_render_board_column_extra_html_injected_verbatim(self) -> None:
        class ColumnHookAdapter(MockAdapter):
            def column_extra_html(self, status_key: str) -> str:
                return f'<div class="col-extra" data-col="{esc(status_key)}">x</div>'

        adapter = ColumnHookAdapter()
        cards = sample_cards()
        html = render_board(adapter, cards)

        for status_key in ("todo", "in_progress", "done"):
            sentinel = f'<div class="col-extra" data-col="{status_key}">x</div>'
            assert sentinel in html
            # Sits after the .board-column-cards block (its closing </div>)
            # and inside .board-column.
            cards_close = html.index('class="board-column-cards"')
            assert html.index(sentinel) > cards_close

    def test_render_board_hook_output_not_double_escaped(self) -> None:
        class ScriptHookAdapter(MockAdapter):
            def card_extra_html(self, card: object) -> str:
                return "<script>danger()</script>"

        adapter = ScriptHookAdapter()
        html = render_board(adapter, sample_cards())
        # The consumer owns escaping; output is emitted verbatim.
        assert "<script>danger()</script>" in html

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

    @pytest.mark.parametrize(
        ("refresh_url", "expected_present"),
        [
            pytest.param("/api/board/cards", True, id="refresh_url_set"),
            pytest.param(None, False, id="refresh_url_none"),
        ],
    )
    def test_render_config_script_refresh_url(
        self, refresh_url: str | None, expected_present: bool
    ) -> None:
        adapter = _adapter()
        result = render_config_script(adapter, refresh_url=refresh_url)
        parsed = _extract_script_json(result)
        if expected_present:
            assert "refresh_url" in parsed
            assert parsed["refresh_url"] == refresh_url
        else:
            assert "refresh_url" not in parsed

    def test_render_config_script_uses_adapter_move_endpoint_template(self) -> None:
        """A custom template from the adapter must appear in the emitted config."""
        adapter = MockAdapter()
        adapter.move_endpoint_template = lambda: "/api/board/{card_id}/transition"  # type: ignore[method-assign]

        result = render_config_script(adapter)
        parsed = _extract_script_json(result)

        assert parsed["move_endpoint_template"] == "/api/board/{card_id}/transition"

    @pytest.mark.parametrize(
        ("gate_endpoint", "expected_present"),
        [
            pytest.param("/api/gate", True, id="gate_endpoint_set"),
            pytest.param(None, False, id="gate_endpoint_none"),
        ],
    )
    def test_render_config_script_gate_endpoint(
        self, gate_endpoint: str | None, expected_present: bool
    ) -> None:
        adapter = _adapter()
        result = render_config_script(adapter, gate_endpoint=gate_endpoint)
        parsed = _extract_script_json(result)
        if expected_present:
            assert "gate_endpoint" in parsed
            assert parsed["gate_endpoint"] == gate_endpoint
        else:
            assert "gate_endpoint" not in parsed
