"""Back-compat contract for the runtime-checkable ``BoardAdapter`` Protocol.

This module is the explicit, discoverable guard for the rule that the
``BoardAdapter`` Protocol must never gain a *required* member. Because the
Protocol is ``@runtime_checkable``, a STRUCTURAL implementer (a consumer that
does NOT subclass ``BoardAdapter``, e.g. robotsix-auto-mail) satisfies
``isinstance()`` only when it defines *every* member of the Protocol —
Protocol-body method defaults apply to subclassers, never to structural
implementers.

PR #40 added required members to the Protocol; its own tests passed (they used
adapters that implemented the new methods) but every existing structural
implementer began failing ``isinstance()``, which crash-looped the auto-mail
board in production on 2026-06-10. Hotfix #41 reverted those members to
OPTIONAL duck-typed hooks read via ``getattr(adapter, name, None)`` in
``render_board``. This suite freezes the v1 surface so a re-break is caught in
CI with an explanatory message instead of a bare ``assert``.
"""

from __future__ import annotations

from robotsix_board import BoardAdapter


class FrozenV1Adapter:
    """FROZEN minimal structural implementer of the v1 ``BoardAdapter`` surface.

    This class deliberately does **NOT** inherit from ``BoardAdapter``: it is a
    *structural* implementer, exactly like real downstream consumers. It
    implements precisely the seven v1 Protocol methods and MUST NOT gain new
    members when the Protocol grows — that is the entire point of this test.
    Its members are the immutable v1 contract; if a Protocol change makes this
    frozen adapter stop satisfying ``isinstance()``, the change is the #40-class
    break and must be reworked as an optional duck-typed hook instead.
    """

    def columns(self) -> list[tuple[str, str]]:
        return [("open", "Open")]

    def card_id(self, card: object) -> str:
        return "x"

    def card_title(self, card: object) -> str:
        return "t"

    def card_badges(self, card: object) -> list[str]:
        return []

    def card_timestamps(self, card: object) -> dict[str, str]:
        return {}

    def move_endpoint(self, card: object) -> tuple[str, str]:
        return ("/move", "POST")

    def move_endpoint_template(self) -> str:
        return "/move/{card_id}/{target_status}"


def test_frozen_v1_adapter_satisfies_protocol() -> None:
    assert isinstance(FrozenV1Adapter(), BoardAdapter), (
        "BoardAdapter gained a required member: every STRUCTURAL implementer "
        "(one that does not subclass BoardAdapter) now fails isinstance(), "
        "because Protocol-body method defaults apply only to subclassers. This "
        "is the #40-class break that took the auto-mail board down on "
        "2026-06-10. Do NOT add required members to the runtime-checkable "
        "Protocol — add an OPTIONAL duck-typed hook instead, read via "
        "getattr(adapter, name, None) in render_board (see _render.py and "
        "BoardAdapter's docstring)."
    )
