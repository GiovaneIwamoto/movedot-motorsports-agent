# Pit Stops Endpoint
## Overview
Provides information about cars going through the pit lane.
## HTTP Request: GET https://api.openf1.org/v1/pit
### Attributes
- date: UTC timestamp
- driver_number: Driver number
- lap_number: Lap number within session
- meeting_key: Meeting identifier
- pit_duration: Time in pit (seconds)
- session_key: Session identifier
## Example Query
GET https://api.openf1.org/v1/pit?session_key=9158&pit_duration<31
## Use Case: Analyze pit stop strategies, timing efficiency
