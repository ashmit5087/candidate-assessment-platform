"""Configuration defaults. No secrets live here."""

import os

ALGORITHM_VERSION = "1.0.0"
SERVICE_NAME = "radix-role5-skill-matching"

# Score contribution per match status (spec section 4.3).
STATUS_SCORE = {
    "matched": 1.0,
    "partial": 0.5,
    "review_required": 0.0,
    "missing": 0.0,
}

# Output length limit for preserved upstream evidence strings.
MAX_EVIDENCE_CHARS = 300

# Default API port (spec section 6).
DEFAULT_HOST = os.environ.get("SKILL_MATCH_HOST", "127.0.0.1")
DEFAULT_PORT = int(os.environ.get("SKILL_MATCH_PORT", "8005"))
