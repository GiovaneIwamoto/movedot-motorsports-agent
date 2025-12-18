# Pit Endpoint

## Overview
Information about cars going through the pit lane, including pit stop duration and timing.

## Endpoint
- **Method**: `GET`
- **Base URL**: `https://api.openf1.org/v1/pit`
- **Response Format**: JSON array

## Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `session_key` | integer | Session identifier (use `latest` for current) | `9158` or `latest` |
| `meeting_key` | integer | Meeting identifier (use `latest` for current) | `1219` or `latest` |
| `driver_number` | integer | Unique F1 driver number | `63` |
| `lap_number` | integer | Sequential lap number within session (starts at 1) | `5` |
| `date` | string | UTC timestamp (ISO 8601, supports `>=`, `<=`, `=`) | `date>=2023-09-15T09:38:23` |
| `pit_duration` | float | Time in pit lane in seconds (supports `>=`, `<=`, `=`) | `pit_duration<31` |

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `date` | string | UTC timestamp in ISO 8601 format |
| `driver_number` | integer | Unique F1 driver number |
| `lap_number` | integer | Sequential lap number within session (starts at 1) |
| `meeting_key` | integer | Meeting identifier |
| `pit_duration` | float | Time spent in pit lane (from entering to leaving) in seconds |
| `session_key` | integer | Session identifier |

## Example Response

```json
[
  {
    "date": "2023-09-15T09:38:23.038000+00:00",
    "driver_number": 63,
    "lap_number": 5,
    "meeting_key": 1219,
    "pit_duration": 24.5,
    "session_key": 9158
  }
]
```

## Usage Notes

- Use `session_key=latest` or `meeting_key=latest` to get current/latest session data
- `pit_duration` measures total time from entering to leaving the pit lane (includes pit stop work)
- `lap_number` starts at 1 for the first lap of the session
- Multiple query parameters can be combined: `?session_key=9158&pit_duration<31`
- Response is an array of objects, even for single results
- Useful for analyzing pit stop strategies and timing
