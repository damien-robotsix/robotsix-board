"""Tests for robotsix_board logging infrastructure."""

from __future__ import annotations

import importlib
import logging

import pytest

import robotsix_board
import robotsix_board._render
from robotsix_board._render import render_board, render_config_script


class TestNullHandler:
    """Package-level logger must have a NullHandler so consumers
    don't get "No handler found" warnings."""

    def test_package_logger_has_null_handler(self) -> None:
        logger = logging.getLogger("robotsix_board")
        handlers = logger.handlers
        assert any(
            isinstance(h, logging.NullHandler) for h in handlers
        ), f"Expected a NullHandler in {handlers!r}"

    def test_import_does_not_emit_no_handler_warning(
        self, capsys: pytest.CaptureFixture[str]
    ) -> None:
        """After import, no "No handler" warning should appear on stderr."""
        # Re-import to trigger any logging setup code.
        importlib.reload(robotsix_board._render)
        importlib.reload(robotsix_board)

        captured = capsys.readouterr()
        assert "No handler" not in captured.err, (
            f"Unexpected stderr: {captured.err!r}"
        )


class _FailingAdapter:
    """Adapter that raises on every method call for error-resilience testing."""

    def columns(self) -> list[tuple[str, str]]:
        raise RuntimeError("columns failed")

    def card_id(self, card: object) -> str:
        raise RuntimeError("card_id failed")

    def card_title(self, card: object) -> str:
        raise RuntimeError("card_title failed")

    def card_badges(self, card: object) -> list[str]:
        raise RuntimeError("card_badges failed")

    def card_timestamps(self, card: object) -> dict[str, str]:
        raise RuntimeError("card_timestamps failed")

    def move_endpoint(self, card: object) -> tuple[str, str]:
        raise RuntimeError("move_endpoint failed")

    def move_endpoint_template(self) -> str:
        raise RuntimeError("move_endpoint_template failed")


class TestRenderBoardErrorResilience:
    def test_render_board_logs_warning_on_columns_failure(
        self, caplog: pytest.LogCaptureFixture
    ) -> None:
        adapter = _FailingAdapter()
        with caplog.at_level(logging.WARNING, logger="robotsix_board._render"):
            result = render_board(adapter, {"todo": []})

        assert result == '<div id="board" class="board"></div>'
        assert "Failed to fetch columns from adapter" in caplog.text
        assert "columns failed" in caplog.text

    def test_render_board_logs_warning_and_skips_failing_card(
        self, caplog: pytest.LogCaptureFixture
    ) -> None:
        """When a card's adapter calls raise, the card is skipped with a warning."""
        class SemiFailingAdapter(_FailingAdapter):
            def columns(self) -> list[tuple[str, str]]:
                return [("todo", "To Do")]

        adapter = SemiFailingAdapter()
        cards: dict[str, list[object]] = {
            "todo": [{"id": "c1", "title": "Card 1"}],
        }
        with caplog.at_level(logging.WARNING, logger="robotsix_board._render"):
            result = render_board(adapter, cards)

        assert "Failed to render card" in caplog.text
        assert "card_id failed" in caplog.text
        # The card should be skipped — no .board-card div.
        assert 'class="board-card"' not in result
        # But the column structure still renders.
        assert 'class="board-column"' in result
        assert "To Do" in result

    def test_render_board_continues_after_failing_card(
        self, caplog: pytest.LogCaptureFixture
    ) -> None:
        """When the first card fails, the second card still renders."""
        class PickyAdapter:
            def columns(self) -> list[tuple[str, str]]:
                return [("todo", "To Do")]

            def card_id(self, card: object) -> str:
                if isinstance(card, dict) and card.get("id") == "g2":
                    return "g2"
                raise RuntimeError("fail")

            def card_title(self, card: object) -> str:
                if isinstance(card, dict) and card.get("id") == "g2":
                    return "Good"
                raise RuntimeError("fail")

            def card_badges(self, card: object) -> list[str]:
                return []

            def card_timestamps(self, card: object) -> dict[str, str]:
                return {}

            def move_endpoint(self, card: object) -> tuple[str, str]:
                return ("/move/x", "POST")

            def move_endpoint_template(self) -> str:
                return "/move/{card_id}/{target_status}"

        adapter = PickyAdapter()
        bad_card: dict[str, str] = {"id": "bad", "title": "Will Fail"}
        good_card: dict[str, str] = {"id": "g2", "title": "Good"}

        with caplog.at_level(logging.WARNING, logger="robotsix_board._render"):
            html = render_board(adapter, {"todo": [bad_card, good_card]})

        # One warning for the bad card
        assert "Failed to render card" in caplog.text
        # The good card rendered
        assert "Good" in html
        assert 'id="card-g2"' in html

    def test_failing_card_extra_html_hook_is_logged_and_continued(
        self, caplog: pytest.LogCaptureFixture
    ) -> None:
        """When card_extra_html raises, the warning is logged and
        the card div is still closed (no unclosed tags)."""

        class HookAdapter:
            def columns(self) -> list[tuple[str, str]]:
                return [("todo", "To Do")]

            def card_id(self, card: object) -> str:
                return "c1"

            def card_title(self, card: object) -> str:
                return "Title"

            def card_badges(self, card: object) -> list[str]:
                return []

            def card_timestamps(self, card: object) -> dict[str, str]:
                return {}

            def move_endpoint(self, card: object) -> tuple[str, str]:
                return ("/move/x", "POST")

            def card_extra_html(self, card: object) -> str:
                raise RuntimeError("hook exploded")

        adapter = HookAdapter()
        with caplog.at_level(logging.WARNING, logger="robotsix_board._render"):
            html = render_board(adapter, {"todo": [{"id": "c1"}]})

        assert "card_extra_html hook failed" in caplog.text
        assert "hook exploded" in caplog.text
        # Card div is still present and properly structured (no crash).
        assert 'id="card-c1"' in html
        assert "Title" in html

    def test_failing_column_extra_html_hook_is_logged_and_continued(
        self, caplog: pytest.LogCaptureFixture
    ) -> None:
        """When column_extra_html raises, the warning is logged and
        the column div is still closed."""

        class HookAdapter:
            def columns(self) -> list[tuple[str, str]]:
                return [("todo", "To Do")]

            def card_id(self, card: object) -> str:
                return "c1"

            def card_title(self, card: object) -> str:
                return "Title"

            def card_badges(self, card: object) -> list[str]:
                return []

            def card_timestamps(self, card: object) -> dict[str, str]:
                return {}

            def move_endpoint(self, card: object) -> tuple[str, str]:
                return ("/move/x", "POST")

            def column_extra_html(self, status_key: str) -> str:
                raise RuntimeError("column hook exploded")

        adapter = HookAdapter()
        with caplog.at_level(logging.WARNING, logger="robotsix_board._render"):
            html = render_board(adapter, {"todo": [{"id": "c1"}]})

        assert "column_extra_html hook failed" in caplog.text
        assert "column hook exploded" in caplog.text
        # Column div and card are still present (no crash).
        assert "To Do" in html
        assert 'id="card-c1"' in html


class TestRenderConfigScriptErrorResilience:
    def test_render_config_script_columns_failure(
        self, caplog: pytest.LogCaptureFixture
    ) -> None:
        adapter = _FailingAdapter()
        with caplog.at_level(logging.WARNING, logger="robotsix_board._render"):
            result = render_config_script(adapter)

        assert "Failed to fetch columns from adapter" in caplog.text
        assert "columns failed" in caplog.text
        assert '"columns":[]' in result

    def test_render_config_script_move_endpoint_template_failure(
        self, caplog: pytest.LogCaptureFixture
    ) -> None:
        class SemiFailingAdapter(_FailingAdapter):
            def columns(self) -> list[tuple[str, str]]:
                return [("todo", "To Do")]

        adapter = SemiFailingAdapter()
        with caplog.at_level(logging.WARNING, logger="robotsix_board._render"):
            result = render_config_script(adapter)

        assert "Failed to fetch move_endpoint_template from adapter" in caplog.text
        assert '"columns":[["todo","To Do"]]' in result
