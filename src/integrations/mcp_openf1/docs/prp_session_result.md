# Session Result Endpoint (Beta)

## Overview
Final standings after a session completion. Provides driver positions, lap times, gaps, and completion status.

**Note**: This endpoint is in beta status.

## Endpoint
- **Method**: `GET`
- **Base URL**: `https://api.openf1.org/v1/session_result`
- **Response Format**: JSON array

## Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `session_key` | integer | Session identifier (use `latest` for current) | `7782` or `latest` |
| `meeting_key` | integer | Meeting identifier (use `latest` for current) | `1143` or `latest` |
| `driver_number` | integer | Unique F1 driver number | `1` |
| `position` | integer | Final position (supports `>=`, `<=`, `=`) | `position<=3` |
| `dnf` | boolean | Filter by Did Not Finish status | `dnf=false` |
| `dns` | boolean | Filter by Did Not Start status | `dns=false` |
| `dsq` | boolean | Filter by disqualified status | `dsq=false` |

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `dnf` | boolean | `true` if driver Did Not Finish (only for qualifying and race sessions) |
| `dns` | boolean | `true` if driver Did Not Start (only for qualifying and race sessions) |
| `dsq` | boolean | `true` if driver was disqualified |
| `driver_number` | integer | Unique F1 driver number |
| `duration` | float/array | Best lap time (practice/qualifying) or total race time (race) in seconds. For qualifying, array of three values [Q1, Q2, Q3] |
| `gap_to_leader` | float/string/array | Time gap to session leader in seconds, or `"+N LAP(S)"` if lapped. For qualifying, array of three values [Q1, Q2, Q3] |
| `meeting_key` | integer | Meeting identifier |
| `number_of_laps` | integer | Total number of laps completed during session |
| `position` | integer | Driver's final position at end of session |
| `session_key` | integer | Session identifier |

## Example Response

```json
[
  {
    "dnf": false,
    "dns": false,
    "dsq": false,
    "driver_number": 1,
    "duration": 77.565,
    "gap_to_leader": 0,
    "number_of_laps": 24,
    "meeting_key": 1143,
    "position": 1,
    "session_key": 7782
  }
]
```

## Usage Notes

- Use `session_key=latest` or `meeting_key=latest` to get current/latest session data
- **Beta endpoint**: Data structure and availability may change
- `duration` format:
  - Practice/Race: Single float value (seconds)
  - Qualifying: Array of three floats [Q1, Q2, Q3] in seconds
- `gap_to_leader` format:
  - Practice/Race: Float (seconds) or string `"+N LAP(S)"` if lapped
  - Qualifying: Array of three values [Q1, Q2, Q3]
- `dnf` and `dns` are only `true` for qualifying and race sessions
- `position` starts at 1 (1st place)
- Multiple query parameters can be combined: `?session_key=7782&position<=3`
- Response is an array of objects, even for single results
- Useful for analyzing final session standings and driver performance
