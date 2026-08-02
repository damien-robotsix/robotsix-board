"""Shared test adapters and helpers for robotsix_board tests."""

from __future__ import annotations

from robotsix_board import BoardAdapter


class MockAdapter(BoardAdapter):
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


class FailingAdapter:
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


def sample_cards() -> dict[str, list[dict[str, object]]]:
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
