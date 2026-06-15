"""vulture whitelist — names referenced here are treated as used.

Generated initially for the robotsix-board create step.
"""

from robotsix_board import RenderMode

# StrEnum members are flagged because they're defined but only read
# externally (outside this package).  Referencing them here silences
# the false positives.
RenderMode.SERVER_FRAGMENTS
RenderMode.JSON_HYDRATION
