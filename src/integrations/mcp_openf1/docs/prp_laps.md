# Laps Endpoint

## Overview
Detailed information about individual laps, including sector times, speeds, lap numbers, and segment data.

## Endpoint
- **Method**: `GET`
- **Base URL**: `https://api.openf1.org/v1/laps`
- **Response Format**: JSON array

## Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `session_key` | integer | Session identifier (use `latest` for current) | `9161` or `latest` |
| `meeting_key` | integer | Meeting identifier (use `latest` for current) | `1219` or `latest` |
| `driver_number` | integer | Unique F1 driver number | `63` |
| `lap_number` | integer | Sequential lap number within session (starts at 1) | `8` |
| `date_start` | string | UTC timestamp (ISO 8601, approximate) | `2023-09-16T13:59:07.606000+00:00` |
| `is_pit_out_lap` | boolean | Filter pit out laps | `false` |
| `lap_duration` | float | Filter by lap duration in seconds (supports `>=`, `<=`, `=`) | `lap_duration<=90` |
| `st_speed` | integer | Filter by speed trap speed in km/h | `st_speed>=300` |

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `date_start` | string | UTC starting timestamp in ISO 8601 format (approximate) |
| `driver_number` | integer | Unique F1 driver number |
| `duration_sector_1` | float | Time in seconds to complete first sector |
| `duration_sector_2` | float | Time in seconds to complete second sector |
| `duration_sector_3` | float | Time in seconds to complete third sector |
| `i1_speed` | integer | Speed in km/h at first intermediate point |
| `i2_speed` | integer | Speed in km/h at second intermediate point |
| `is_pit_out_lap` | boolean | `true` if lap is an "out lap" from pit, `false` otherwise |
| `lap_duration` | float | Total time in seconds to complete entire lap |
| `lap_number` | integer | Sequential lap number within session (starts at 1) |
| `meeting_key` | integer | Meeting identifier |
| `segments_sector_1` | array | List of mini-sector values for first sector (see mapping below) |
| `segments_sector_2` | array | List of mini-sector values for second sector (see mapping below) |
| `segments_sector_3` | array | List of mini-sector values for third sector (see mapping below) |
| `session_key` | integer | Session identifier |
| `st_speed` | integer | Speed in km/h at speed trap (highest speed point on track) |

## Segment Value Mapping

Segment values represent mini-sectors within each sector:

- **0**: Not available
- **2048**: Yellow sector
- **2049**: Green sector
- **2050**: Unknown
- **2051**: Purple sector (fastest)
- **2052**: Unknown
- **2064**: Pitlane
- **2068**: Unknown

**Note**: Segments are not available during races. Segment values may not always align perfectly with TV colors.

## Example Response

```json
[
  {
    "date_start": "2023-09-16T13:59:07.606000+00:00",
    "driver_number": 63,
    "duration_sector_1": 26.966,
    "duration_sector_2": 38.657,
    "duration_sector_3": 26.12,
    "i1_speed": 307,
    "i2_speed": 277,
    "is_pit_out_lap": false,
    "lap_duration": 91.743,
    "lap_number": 8,
    "meeting_key": 1219,
    "segments_sector_1": [2049, 2049, 2049, 2051, 2049, 2051, 2049, 2049],
    "segments_sector_2": [2049, 2049, 2049, 2049, 2049, 2049, 2049, 2049],
    "segments_sector_3": [2048, 2048, 2048, 2048, 2048, 2064, 2064, 2064],
    "session_key": 9161,
    "st_speed": 298
  }
]
```

## Usage Notes

- Use `session_key=latest` or `meeting_key=latest` to get current/latest session data
- `lap_number` starts at 1 for the first lap of the session
- `date_start` is approximate, not exact
- `segments_sector_1/2/3` are arrays of mini-sector values (see mapping above)
- Segments are **not available during races** (only practice/qualifying)
- Multiple query parameters can be combined: `?session_key=9161&driver_number=63&lap_number=8`
- Response is an array of objects, even for single results
- `st_speed` is measured at the speed trap (usually the highest speed point)
