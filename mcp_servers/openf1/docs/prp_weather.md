# Weather Endpoint
## Overview
The weather over the track, updated every minute.
## HTTP Request: GET https://api.openf1.org/v1/weather
### Attributes
- air_temperature: Air temperature (°C)
- date: UTC timestamp
- humidity: Relative humidity (%)
- meeting_key: Meeting identifier
- pressure: Air pressure (mbar)
- rainfall: Whether there is rainfall
- session_key: Session identifier
- track_temperature: Track temperature (°C)
- wind_direction: Wind direction (°, 0-359)
- wind_speed: Wind speed (m/s)
## Example Query
GET https://api.openf1.org/v1/weather?meeting_key=1208&wind_direction>=130&track_temperature>=52
## Use Case: Environmental conditions, track temperature analysis
