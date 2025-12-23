# Starting Grid Endpoint (Beta)

## Overview
Provides the starting grid positions for the upcoming race based on qualifying results.

**Note**: This endpoint is in beta status.

## Endpoint
- **Method**: `GET`
- **Base URL**: `https://api.openf1.org/v1/starting_grid`
- **Response Format**: JSON array

## Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `session_key` | integer | Session identifier (use `latest` for current) | `7783` or `latest` |
| `meeting_key` | integer | Meeting identifier (use `latest` for current) | `1143` or `latest` |
| `driver_number` | integer | Unique F1 driver number | `1` |
| `position` | integer | Grid position (supports `>=`, `<=`, `=`) | `position<=3` |
| `lap_duration` | float | Qualifying lap duration in seconds (supports `>=`, `<=`, `=`) | `lap_duration<=77` |

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `driver_number` | integer | Unique F1 driver number |
| `lap_duration` | float | Duration in seconds of the qualifying lap used for grid position |
| `meeting_key` | integer | Meeting identifier |
| `position` | integer | Starting grid position (1 = pole position) |
| `session_key` | integer | Session identifier |

## Example Response

```json
[
  {
    "position": 1,
    "driver_number": 1,
    "lap_duration": 76.732,
    "meeting_key": 1143,
    "session_key": 7783
  }
]
```

## Usage Notes

- Use `session_key=latest` or `meeting_key=latest` to get current/latest session data
- **Beta endpoint**: Data structure and availability may change
- `position` starts at 1 (pole position)
- `lap_duration` is the qualifying lap time that determined the grid position
- Grid positions are determined by qualifying results (fastest lap = pole position)
- Multiple query parameters can be combined: `?session_key=7783&position<=3`
- Response is an array of objects, even for single results
- Useful for analyzing qualifying performance and starting grid composition
