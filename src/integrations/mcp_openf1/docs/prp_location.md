# Location Endpoint

## Overview
Approximate 3D location of cars on the circuit at approximately 3.7 Hz sample rate. Useful for tracking progress along the track, but lacks lateral placement details (left/right side of track). The origin point (0, 0, 0) is arbitrary and not tied to any specific track location.

**Note**: Live data is currently unavailable during sessions. Data is provided shortly after each session completes.

## Endpoint
- **Method**: `GET`
- **Base URL**: `https://api.openf1.org/v1/location`
- **Response Format**: JSON array

## Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `session_key` | integer | Session identifier (use `latest` for current) | `9161` or `latest` |
| `meeting_key` | integer | Meeting identifier (use `latest` for current) | `1219` or `latest` |
| `driver_number` | integer | Unique F1 driver number | `81` |
| `date` | string | UTC timestamp (ISO 8601, supports `>=`, `<=`, `=`) | `date>2023-09-16T13:03:35.200&date<2023-09-16T13:03:35.800` |
| `x` | float | Filter by X coordinate (supports `>=`, `<=`, `=`) | `x>=500` |
| `y` | float | Filter by Y coordinate (supports `>=`, `<=`, `=`) | `y>=3000` |
| `z` | float | Filter by Z coordinate (supports `>=`, `<=`, `=`) | `z>=180` |

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `date` | string | UTC timestamp in ISO 8601 format |
| `driver_number` | integer | Unique F1 driver number |
| `meeting_key` | integer | Meeting identifier |
| `session_key` | integer | Session identifier |
| `x` | float | X coordinate in 3D Cartesian system (approximate car location) |
| `y` | float | Y coordinate in 3D Cartesian system (approximate car location) |
| `z` | float | Z coordinate in 3D Cartesian system (approximate car location) |

## Example Response

```json
[
  {
    "date": "2023-09-16T13:03:35.292000+00:00",
    "driver_number": 81,
    "meeting_key": 1219,
    "session_key": 9161,
    "x": 567,
    "y": 3195,
    "z": 187
  }
]
```

## Usage Notes

- Use `session_key=latest` or `meeting_key=latest` to get current/latest session data
- Data sampling rate is approximately 3.7 Hz (one measurement every ~270ms)
- Coordinates are in a 3D Cartesian system with arbitrary origin (0, 0, 0)
- **Limitations**:
  - No lateral placement information (cannot determine left/right side of track)
  - Origin point is arbitrary, not tied to specific track location
  - Coordinates are approximate, not precise GPS positions
- Multiple query parameters can be combined: `?session_key=9161&driver_number=81&date>2023-09-16T13:03:35.200&date<2023-09-16T13:03:35.800`
- Response is an array of objects, even for single results
- Useful for tracking car progress along track, but not for precise positioning
