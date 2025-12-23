# Sessions Endpoint

## Overview
Information about sessions (distinct periods of track activity during a Grand Prix or testing weekend). A session can be practice, qualifying, sprint, race, etc.

## Endpoint
- **Method**: `GET`
- **Base URL**: `https://api.openf1.org/v1/sessions`
- **Response Format**: JSON array

## Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `session_key` | integer | Session identifier (use `latest` for current) | `9140` or `latest` |
| `meeting_key` | integer | Meeting identifier (use `latest` for current) | `1216` or `latest` |
| `year` | integer | Year of the event | `2023` |
| `country_name` | string | Full country name | `Belgium` |
| `country_code` | string | ISO country code (3 letters) | `BEL` |
| `country_key` | integer | Country identifier | `16` |
| `circuit_key` | integer | Circuit identifier | `7` |
| `circuit_short_name` | string | Short name of circuit | `Spa-Francorchamps` |
| `location` | string | City or geographical location | `Spa-Francorchamps` |
| `session_name` | string | Name of session | `Practice 1`, `Qualifying`, `Sprint`, `Race` |
| `session_type` | string | Type of session | `Practice`, `Qualifying`, `Race` |
| `date_start` | string | UTC start date/time (ISO 8601, supports `>=`, `<=`, `=`) | `date_start>=2023-07-29` |
| `date_end` | string | UTC end date/time (ISO 8601, supports `>=`, `<=`, `=`) | `date_end<=2023-07-29T15:35:00` |

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `circuit_key` | integer | Unique identifier for the circuit |
| `circuit_short_name` | string | Short or common name of the circuit |
| `country_code` | string | ISO country code (3 letters) |
| `country_key` | integer | Unique identifier for the country |
| `country_name` | string | Full name of the country |
| `date_end` | string | UTC ending date and time in ISO 8601 format |
| `date_start` | string | UTC starting date and time in ISO 8601 format |
| `gmt_offset` | string | Time difference between local time and GMT (format: `HH:MM:SS`) |
| `location` | string | City or geographical location of the event |
| `meeting_key` | integer | Unique identifier for the meeting |
| `session_key` | integer | Unique identifier for the session |
| `session_name` | string | Name of the session (e.g., `Practice 1`, `Qualifying`, `Sprint`, `Race`) |
| `session_type` | string | Type of the session (e.g., `Practice`, `Qualifying`, `Race`) |
| `year` | integer | Year the event takes place |

## Example Response

```json
[
  {
    "circuit_key": 7,
    "circuit_short_name": "Spa-Francorchamps",
    "country_code": "BEL",
    "country_key": 16,
    "country_name": "Belgium",
    "date_end": "2023-07-29T15:35:00+00:00",
    "date_start": "2023-07-29T15:05:00+00:00",
    "gmt_offset": "02:00:00",
    "location": "Spa-Francorchamps",
    "meeting_key": 1216,
    "session_key": 9140,
    "session_name": "Sprint",
    "session_type": "Race",
    "year": 2023
  }
]
```

## Usage Notes

- Use `session_key=latest` or `meeting_key=latest` to get current/latest session data
- A session represents a distinct period of track activity (practice, qualifying, sprint, race, etc.)
- `session_name` examples: `Practice 1`, `Practice 2`, `Practice 3`, `Qualifying`, `Sprint`, `Race`
- `session_type` examples: `Practice`, `Qualifying`, `Race`
- `gmt_offset` format is `HH:MM:SS` (e.g., "02:00:00" for UTC+2)
- Multiple query parameters can be combined: `?country_name=Belgium&session_name=Sprint&year=2023`
- Response is an array of objects, even for single results
- Useful for finding session keys to query other endpoints (laps, car_data, positions, etc.)
