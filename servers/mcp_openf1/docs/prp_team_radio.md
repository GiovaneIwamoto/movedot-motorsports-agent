# Team Radio Endpoint

## Overview
Collection of radio exchanges between Formula 1 drivers and their teams during sessions. **Note**: Only a limited selection of communications are included, not the complete record of all radio interactions.

## Endpoint
- **Method**: `GET`
- **Base URL**: `https://api.openf1.org/v1/team_radio`
- **Response Format**: JSON array

## Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `session_key` | integer | Session identifier (use `latest` for current) | `9158` or `latest` |
| `meeting_key` | integer | Meeting identifier (use `latest` for current) | `1219` or `latest` |
| `driver_number` | integer | Unique F1 driver number | `11` |
| `date` | string | UTC timestamp (ISO 8601, supports `>=`, `<=`, `=`) | `date>=2023-09-15T09:40:43` |

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `date` | string | UTC timestamp in ISO 8601 format |
| `driver_number` | integer | Unique F1 driver number |
| `meeting_key` | integer | Meeting identifier |
| `recording_url` | string | URL to the audio recording of the radio message (MP3 format) |
| `session_key` | integer | Session identifier |

## Example Response

```json
[
  {
    "date": "2023-09-15T09:40:43.005000+00:00",
    "driver_number": 11,
    "meeting_key": 1219,
    "recording_url": "https://livetiming.formula1.com/static/2023/2023-09-17_Singapore_Grand_Prix/2023-09-15_Practice_1/TeamRadio/SERPER01_11_20230915_104008.mp3",
    "session_key": 9158
  }
]
```

## Usage Notes

- Use `session_key=latest` or `meeting_key=latest` to get current/latest session data
- **Limited data**: Only a selection of radio communications are available, not all exchanges
- `recording_url` provides direct link to MP3 audio file of the radio message
- Audio files are hosted on Formula 1's live timing servers
- Multiple query parameters can be combined: `?session_key=9158&driver_number=11`
- Response is an array of objects, even for single results
- Useful for analyzing team-driver communications and race strategy discussions
