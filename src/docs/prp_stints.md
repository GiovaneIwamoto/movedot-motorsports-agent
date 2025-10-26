# Stints Endpoint
## Overview
Provides information about individual stints (periods of continuous driving).
## HTTP Request: GET https://api.openf1.org/v1/stints
### Attributes
- compound: Tyre compound (SOFT, MEDIUM, HARD)
- driver_number: Driver number
- lap_end: Last lap in stint
- lap_start: First lap in stint
- meeting_key: Meeting identifier
- session_key: Session identifier
- stint_number: Sequential stint number
- tyre_age_at_start: Tyre age in laps at start
## Example Query
GET https://api.openf1.org/v1/stints?session_key=9165&tyre_age_at_start>=3
## Use Case: Tire strategy analysis, stint length optimization
