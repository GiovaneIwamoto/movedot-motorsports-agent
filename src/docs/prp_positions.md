# Position Endpoint
## Overview
Provides driver positions throughout a session, including initial placement and subsequent changes.
## HTTP Request: GET https://api.openf1.org/v1/position
### Attributes
- date: UTC timestamp (ISO 8601)
- driver_number: Driver number
- meeting_key: Meeting identifier
- position: Position (starts at 1)
- session_key: Session identifier
## Example Query
GET https://api.openf1.org/v1/position?meeting_key=1217&driver_number=40&position<=3
## Use Case: Track position changes over time, analyze position battles
