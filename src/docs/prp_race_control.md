# Race Control Endpoint
## Overview
Provides information about race control events (incidents, flags, safety car).
## HTTP Request: GET https://api.openf1.org/v1/race_control
### Attributes
- category: Event category (CarEvent, Drs, Flag, SafetyCar, etc.)
- date: UTC timestamp
- driver_number: Driver number
- flag: Type of flag (GREEN, YELLOW, DOUBLE YELLOW, CHEQUERED, etc.)
- lap_number: Lap number
- meeting_key: Meeting identifier
- message: Description of event
- scope: Event scope (Track, Driver, Sector, etc.)
- sector: Track sector where event occurred
- session_key: Session identifier
## Example Query
GET https://api.openf1.org/v1/race_control?flag=BLACK AND WHITE&driver_number=1
## Use Case: Incident analysis, flag/safety car periods
