# Overtakes Endpoint (Beta)

## Overview
Information about overtakes (position exchanges between drivers). An overtake includes both on-track passes and position changes resulting from pit stops or post-race penalties.

**Note**: This endpoint is in beta status. Data is only available during races and may be incomplete.

## Endpoint
- **Method**: `GET`
- **Base URL**: `https://api.openf1.org/v1/overtakes`
- **Response Format**: JSON array

## Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `session_key` | integer | Session identifier (use `latest` for current) | `9636` or `latest` |
| `meeting_key` | integer | Meeting identifier (use `latest` for current) | `1249` or `latest` |
| `overtaking_driver_number` | integer | Unique F1 driver number of the driver who overtook | `63` |
| `overtaken_driver_number` | integer | Unique F1 driver number of the driver who was overtaken | `4` |
| `position` | integer | Position after overtake (supports `>=`, `<=`, `=`) | `position=1` |
| `date` | string | UTC timestamp (ISO 8601, supports `>=`, `<=`, `=`) | `date>=2024-11-03T15:50:07` |

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `date` | string | UTC timestamp in ISO 8601 format |
| `meeting_key` | integer | Meeting identifier |
| `overtaken_driver_number` | integer | Unique F1 driver number of the driver who was overtaken |
| `overtaking_driver_number` | integer | Unique F1 driver number of the driver who performed the overtake |
| `position` | integer | Position of the overtaking driver after the overtake was completed (starts at 1) |
| `session_key` | integer | Session identifier |

## Example Response

```json
[
  {
    "date": "2024-11-03T15:50:07.565000+00:00",
    "meeting_key": 1249,
    "overtaken_driver_number": 4,
    "overtaking_driver_number": 63,
    "position": 1,
    "session_key": 9636
  }
]
```

## Usage Notes

- Use `session_key=latest` or `meeting_key=latest` to get current/latest session data
- **Beta endpoint**: Data structure and availability may change
- **Race only**: Data is only available during races (not practice or qualifying)
- **May be incomplete**: Not all overtakes may be recorded
- Overtakes include:
  - On-track passes
  - Position changes from pit stops
  - Position changes from post-race penalties
- `position` is the position of the overtaking driver after the overtake (starts at 1)
- Multiple query parameters can be combined: `?session_key=9636&overtaking_driver_number=63&overtaken_driver_number=4&position=1`
- Response is an array of objects, even for single results
- Useful for analyzing race battles and position changes
