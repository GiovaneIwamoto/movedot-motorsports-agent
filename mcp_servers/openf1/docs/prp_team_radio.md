# Team Radio Endpoint
## Overview
Provides radio exchanges between drivers and teams during sessions.
## HTTP Request: GET https://api.openf1.org/v1/team_radio
### Attributes
- date: UTC timestamp
- driver_number: Driver number
- meeting_key: Meeting identifier
- recording_url: URL of the radio recording
- session_key: Session identifier
## Example Query
GET https://api.openf1.org/v1/team_radio?session_key=9158&driver_number=11
## Use Case: Communication analysis, strategy insights
