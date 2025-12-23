# Meetings Endpoint

## Overview
Information about meetings (Grand Prix or testing weekends). A meeting typically includes multiple sessions (practice, qualifying, race, etc.).

## Endpoint
- **Method**: `GET`
- **Base URL**: `https://api.openf1.org/v1/meetings`
- **Response Format**: JSON array

## Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `meeting_key` | integer | Meeting identifier (use `latest` for current) | `1219` or `latest` |
| `year` | integer | Year of the event | `2023` |
| `country_name` | string | Full country name | `Singapore` |
| `country_code` | string | ISO country code (3 letters) | `SGP` |
| `country_key` | integer | Country identifier | `157` |
| `circuit_key` | integer | Circuit identifier | `61` |
| `circuit_short_name` | string | Short name of circuit | `Singapore` |
| `location` | string | City or geographical location | `Marina Bay` |
| `date_start` | string | UTC start date/time (ISO 8601, supports `>=`, `<=`, `=`) | `date_start>=2023-09-15` |

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `circuit_key` | integer | Unique identifier for the circuit |
| `circuit_short_name` | string | Short or common name of the circuit |
| `country_code` | string | ISO country code (3 letters) |
| `country_key` | integer | Unique identifier for the country |
| `country_name` | string | Full name of the country |
| `date_start` | string | UTC starting date and time in ISO 8601 format |
| `gmt_offset` | string | Time difference between local time and GMT (format: `HH:MM:SS`) |
| `location` | string | City or geographical location of the event |
| `meeting_key` | integer | Unique identifier for the meeting |
| `meeting_name` | string | Name of the meeting (e.g., "Singapore Grand Prix") |
| `meeting_official_name` | string | Official full name of the meeting |
| `year` | integer | Year the event takes place |

## Example Response

```json
[
  {
    "circuit_key": 61,
    "circuit_short_name": "Singapore",
    "country_code": "SGP",
    "country_key": 157,
    "country_name": "Singapore",
    "date_start": "2023-09-15T09:30:00+00:00",
    "gmt_offset": "08:00:00",
    "location": "Marina Bay",
    "meeting_key": 1219,
    "meeting_name": "Singapore Grand Prix",
    "meeting_official_name": "FORMULA 1 SINGAPORE AIRLINES SINGAPORE GRAND PRIX 2023",
    "year": 2023
  }
]
```

## Usage Notes

- Use `meeting_key=latest` to get the latest or current meeting
- A meeting represents a Grand Prix or testing weekend and includes multiple sessions
- `gmt_offset` format is `HH:MM:SS` (e.g., "08:00:00" for UTC+8)
- Multiple query parameters can be combined: `?year=2023&country_name=Singapore`
- Response is an array of objects, even for single results
- Useful for finding meeting keys to query other endpoints (sessions, drivers, etc.)
