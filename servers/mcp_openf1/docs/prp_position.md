# Position Endpoint

## Overview
Driver positions throughout a session, including initial placement and subsequent position changes over time.

## Endpoint
- **Method**: `GET`
- **Base URL**: `https://api.openf1.org/v1/position`
- **Response Format**: JSON array

## Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `session_key` | integer | Session identifier (use `latest` for current) | `9144` or `latest` |
| `meeting_key` | integer | Meeting identifier (use `latest` for current) | `1217` or `latest` |
| `driver_number` | integer | Unique F1 driver number | `40` |
| `position` | integer | Position value (supports `>=`, `<=`, `=`) | `position<=3` |
| `date` | string | UTC timestamp (ISO 8601, supports `>=`, `<=`, `=`) | `date>=2023-08-26T09:30:47` |

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `date` | string | UTC timestamp in ISO 8601 format |
| `driver_number` | integer | Unique F1 driver number |
| `meeting_key` | integer | Meeting identifier |
| `position` | integer | Driver's position at that timestamp (starts at 1) |
| `session_key` | integer | Session identifier |

## Example Response

```json
[
  {
    "date": "2023-08-26T09:30:47.199000+00:00",
    "driver_number": 40,
    "meeting_key": 1217,
    "position": 2,
    "session_key": 9144
  }
]
```

## Usage Notes

- Use `session_key=latest` or `meeting_key=latest` to get current/latest session data
- `position` starts at 1 (1st place)
- Data includes initial placement and all subsequent position changes during the session
- Multiple position entries for the same driver indicate position changes over time
- Multiple query parameters can be combined: `?meeting_key=1217&driver_number=40&position<=3`
- Response is an array of objects, even for single results
- Useful for tracking position changes over time and analyzing race battles
