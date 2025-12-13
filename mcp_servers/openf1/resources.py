"""MCP resources (PRPs) for OpenF1 API documentation."""

import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

DOCS_DIR = Path(__file__).parent / "docs"

# Map endpoint names to their PRP files
ENDPOINT_DOCS = {
    "car_data": "prp_car_data.md",
    "drivers": "prp_drivers.md",
    "sessions": "prp_sessions.md",
    "meetings": "prp_meetings.md",
    "laps": "prp_laps.md",
    "positions": "prp_positions.md",
    "pit_stops": "prp_pit_stops.md",
    "intervals": "prp_intervals.md",
    "stints": "prp_stints.md",
    "weather": "prp_weather.md",
    "race_control": "prp_race_control.md",
    "team_radio": "prp_team_radio.md",
}


async def get_resource(uri: str) -> Optional[str]:
    """Get PRP content for a specific OpenF1 endpoint."""
    if not uri.startswith("prp://openf1/"):
        return None
    
    endpoint = uri.replace("prp://openf1/", "")
    
    if endpoint not in ENDPOINT_DOCS:
        logger.warning(f"Unknown endpoint in URI: {endpoint}")
        return None
    
    filename = ENDPOINT_DOCS[endpoint]
    doc_path = DOCS_DIR / filename
    
    if not doc_path.exists():
        logger.error(f"PRP file not found: {doc_path}")
        return None
    
    try:
        return doc_path.read_text(encoding="utf-8")
    except Exception as e:
        logger.error(f"Error reading PRP file {doc_path}: {e}", exc_info=True)
        return None
