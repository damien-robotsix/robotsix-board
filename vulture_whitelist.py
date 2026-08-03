"""vulture whitelist — names referenced here are treated as used.

Generated initially for the robotsix-board create step.
"""

from robotsix_board import RenderMode

# FrozenV1Adapter retains move_endpoint / move_endpoint_template
# as part of the frozen v1 contract surface even though the
# BoardAdapter Protocol no longer requires them (PR #281).
from tests.robotsix_board.test_protocol_contract import FrozenV1Adapter

# _setup is an autouse=True pytest fixture — called by pytest,
# not directly.  vulture does not see the implicit call.
from tests.robotsix_board.test_render import TestRenderCard

# StrEnum members are flagged because they're defined but only read
# externally (outside this package).  Referencing them here silences
# the false positives.
RenderMode.SERVER_FRAGMENTS
RenderMode.JSON_HYDRATION

FrozenV1Adapter.move_endpoint
FrozenV1Adapter.move_endpoint_template

TestRenderCard._setup
