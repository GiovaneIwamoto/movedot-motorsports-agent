# Intervals Endpoint

## Overview
Real-time interval data between drivers and their gap to the race leader. Available during races only, with updates approximately every 4 seconds.

**Note**: Live data is currently unavailable during sessions. Data is provided shortly after each session completes.

## Endpoint
- **Method**: `GET`
- **Base URL**: `https://api.openf1.org/v1/intervals`
- **Response Format**: JSON array

## Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `session_key` | integer | Session identifier (use `latest` for current) | `9165` or `latest` |
| `meeting_key` | integer | Meeting identifier (use `latest` for current) | `1219` or `latest` |
| `driver_number` | integer | Unique F1 driver number | `1` |
| `date` | string | UTC timestamp (ISO 8601) | `2023-09-17T13:31:02.395000+00:00` |
| `interval` | float | Time gap to car ahead in seconds (supports `>=`, `<=`, `=`) | `interval>0&interval<0.005` |
| `gap_to_leader` | float | Time gap to race leader in seconds (supports `>=`, `<=`, `=`) | `gap_to_leader>=40` |

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `date` | string | UTC timestamp in ISO 8601 format |
| `driver_number` | integer | Unique F1 driver number |
| `gap_to_leader` | float/string/null | Time gap to race leader in seconds, `"+1 LAP"` if lapped, or `null` for race leader |
| `interval` | float/string/null | Time gap to car ahead in seconds, `"+1 LAP"` if lapped, or `null` for race leader |
| `meeting_key` | integer | Meeting identifier |
| `session_key` | integer | Session identifier |

## Example Response

```json
[
  {
    "date": "2023-09-17T13:31:02.395000+00:00",
    "driver_number": 1,
    "gap_to_leader": 41.019,
    "interval": 0.003,
    "meeting_key": 1219,
    "session_key": 9165
  }
]
```

## Usage Notes

- Use `session_key=latest` or `meeting_key=latest` to get current/latest session data
- Available during races only (not practice or qualifying)
- Updates approximately every 4 seconds during live sessions
- `interval` and `gap_to_leader` can be:
  - Numeric (float): Time gap in seconds
  - String: `"+1 LAP"` if driver is lapped
  - `null`: For the race leader (no gap)
- Multiple query parameters can be combined: `?session_key=9165&interval>0&interval<0.005`
- Response is an array of objects, even for single results
