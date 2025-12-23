# Race Control Endpoint

## Overview
Information about race control events including racing incidents, flags, safety car periods, and other race control actions.

## Endpoint
- **Method**: `GET`
- **Base URL**: `https://api.openf1.org/v1/race_control`
- **Response Format**: JSON array

## Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `session_key` | integer | Session identifier (use `latest` for current) | `9102` or `latest` |
| `meeting_key` | integer | Meeting identifier (use `latest` for current) | `1211` or `latest` |
| `driver_number` | integer | Unique F1 driver number | `1` |
| `date` | string | UTC timestamp (ISO 8601, supports `>=`, `<=`, `=`) | `date>=2023-01-01&date<2023-09-01` |
| `flag` | string | Type of flag (exact match) | `BLACK AND WHITE`, `GREEN`, `YELLOW`, `DOUBLE YELLOW`, `CHEQUERED` |
| `category` | string | Event category | `Flag`, `CarEvent`, `Drs`, `SafetyCar` |
| `scope` | string | Event scope | `Track`, `Driver`, `Sector` |
| `lap_number` | integer | Sequential lap number within session (starts at 1) | `59` |
| `sector` | integer | Track sector where event occurred (starts at 1) | `1` |

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `category` | string | Event category (e.g., `CarEvent`, `Drs`, `Flag`, `SafetyCar`) |
| `date` | string | UTC timestamp in ISO 8601 format |
| `driver_number` | integer | Unique F1 driver number (may be null for track-wide events) |
| `flag` | string | Type of flag displayed (e.g., `GREEN`, `YELLOW`, `DOUBLE YELLOW`, `CHEQUERED`, `BLACK AND WHITE`) |
| `lap_number` | integer | Sequential lap number within session (starts at 1) |
| `meeting_key` | integer | Meeting identifier |
| `message` | string | Description of the event or action |
| `scope` | string | Event scope (e.g., `Track`, `Driver`, `Sector`) |
| `sector` | integer/null | Track sector where event occurred (starts at 1), or `null` if not applicable |
| `session_key` | integer | Session identifier |

## Example Response

```json
[
  {
    "category": "Flag",
    "date": "2023-06-04T14:21:01+00:00",
    "driver_number": 1,
    "flag": "BLACK AND WHITE",
    "lap_number": 59,
    "meeting_key": 1211,
    "message": "BLACK AND WHITE FLAG FOR CAR 1 (VER) - TRACK LIMITS",
    "scope": "Driver",
    "sector": null,
    "session_key": 9102
  }
]
```

## Usage Notes

- Use `session_key=latest` or `meeting_key=latest` to get current/latest session data
- `flag` parameter requires exact match (e.g., `BLACK AND WHITE` not `black and white`)
- Common flag types: `GREEN`, `YELLOW`, `DOUBLE YELLOW`, `CHEQUERED`, `BLACK AND WHITE`, `RED`
- `driver_number` may be `null` for track-wide events (e.g., safety car, track-wide flags)
- `sector` may be `null` if event is not sector-specific
- `scope` indicates whether event affects entire track, specific driver, or specific sector
- Multiple query parameters can be combined: `?flag=BLACK AND WHITE&driver_number=1&date>=2023-01-01&date<2023-09-01`
- Response is an array of objects, even for single results
- Useful for analyzing race incidents, flag periods, and safety car deployments
