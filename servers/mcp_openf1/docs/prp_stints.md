# Stints Endpoint

## Overview
Information about individual stints (periods of continuous driving by a driver during a session). Includes tyre compound, lap ranges, and tyre age.

## Endpoint
- **Method**: `GET`
- **Base URL**: `https://api.openf1.org/v1/stints`
- **Response Format**: JSON array

## Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `session_key` | integer | Session identifier (use `latest` for current) | `9165` or `latest` |
| `meeting_key` | integer | Meeting identifier (use `latest` for current) | `1219` or `latest` |
| `driver_number` | integer | Unique F1 driver number | `16` |
| `stint_number` | integer | Sequential stint number within session (starts at 1) | `1` |
| `compound` | string | Tyre compound (exact match) | `SOFT`, `MEDIUM`, `HARD` |
| `lap_start` | integer | Starting lap number (starts at 1) | `1` |
| `lap_end` | integer | Ending lap number | `20` |
| `tyre_age_at_start` | integer | Tyre age in laps at stint start (supports `>=`, `<=`, `=`) | `tyre_age_at_start>=3` |

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `compound` | string | Tyre compound used during stint (e.g., `SOFT`, `MEDIUM`, `HARD`, `INTERMEDIATE`, `WET`) |
| `driver_number` | integer | Unique F1 driver number |
| `lap_end` | integer | Number of the last completed lap in this stint |
| `lap_start` | integer | Number of the initial lap in this stint (starts at 1) |
| `meeting_key` | integer | Meeting identifier |
| `session_key` | integer | Session identifier |
| `stint_number` | integer | Sequential stint number within session (starts at 1) |
| `tyre_age_at_start` | integer | Age of tyres at start of stint, in laps completed |

## Example Response

```json
[
  {
    "compound": "SOFT",
    "driver_number": 16,
    "lap_end": 20,
    "lap_start": 1,
    "meeting_key": 1219,
    "session_key": 9165,
    "stint_number": 1,
    "tyre_age_at_start": 3
  }
]
```

## Usage Notes

- Use `session_key=latest` or `meeting_key=latest` to get current/latest session data
- A stint represents a period of continuous driving (from pit exit to pit entry)
- `stint_number` starts at 1 for the first stint of the session
- `lap_start` and `lap_end` define the lap range covered by the stint
- `tyre_age_at_start` indicates how many laps the tyres had been used before this stint
- Common tyre compounds: `SOFT`, `MEDIUM`, `HARD`, `INTERMEDIATE`, `WET`
- `compound` parameter requires exact match (case-sensitive)
- Multiple query parameters can be combined: `?session_key=9165&tyre_age_at_start>=3`
- Response is an array of objects, even for single results
- Useful for analyzing tyre strategies and stint lengths
