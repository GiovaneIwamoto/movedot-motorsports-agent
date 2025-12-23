# Weather Endpoint

## Overview
Weather conditions over the track, updated approximately every minute during sessions.

## Endpoint
- **Method**: `GET`
- **Base URL**: `https://api.openf1.org/v1/weather`
- **Response Format**: JSON array

## Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `session_key` | integer | Session identifier (use `latest` for current) | `9078` or `latest` |
| `meeting_key` | integer | Meeting identifier (use `latest` for current) | `1208` or `latest` |
| `date` | string | UTC timestamp (ISO 8601, supports `>=`, `<=`, `=`) | `date>=2023-05-07T18:42:25` |
| `air_temperature` | float | Air temperature in °C (supports `>=`, `<=`, `=`) | `air_temperature>=25` |
| `track_temperature` | float | Track temperature in °C (supports `>=`, `<=`, `=`) | `track_temperature>=52` |
| `humidity` | integer | Relative humidity in % (supports `>=`, `<=`, `=`) | `humidity>=50` |
| `pressure` | float | Air pressure in mbar (supports `>=`, `<=`, `=`) | `pressure>=1015` |
| `rainfall` | integer | Rainfall indicator (0 = no rain, 1 = rain) | `rainfall=0` |
| `wind_speed` | float | Wind speed in m/s (supports `>=`, `<=`, `=`) | `wind_speed>=2` |
| `wind_direction` | integer | Wind direction in degrees (0-359, supports `>=`, `<=`, `=`) | `wind_direction>=130` |

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `air_temperature` | float | Air temperature in degrees Celsius |
| `date` | string | UTC timestamp in ISO 8601 format |
| `humidity` | integer | Relative humidity percentage |
| `meeting_key` | integer | Meeting identifier |
| `pressure` | float | Air pressure in millibars (mbar) |
| `rainfall` | integer | Rainfall indicator: `0` = no rain, `1` = rain |
| `session_key` | integer | Session identifier |
| `track_temperature` | float | Track surface temperature in degrees Celsius |
| `wind_direction` | integer | Wind direction in degrees (0-359, where 0° = North) |
| `wind_speed` | float | Wind speed in meters per second (m/s) |

## Example Response

```json
[
  {
    "air_temperature": 27.8,
    "date": "2023-05-07T18:42:25.233000+00:00",
    "humidity": 58,
    "meeting_key": 1208,
    "pressure": 1018.7,
    "rainfall": 0,
    "session_key": 9078,
    "track_temperature": 52.5,
    "wind_direction": 136,
    "wind_speed": 2.4
  }
]
```

## Usage Notes

- Use `session_key=latest` or `meeting_key=latest` to get current/latest session data
- Data is updated approximately every minute during sessions
- `wind_direction` is in degrees: 0° = North, 90° = East, 180° = South, 270° = West
- `rainfall` is a binary indicator: `0` for no rain, `1` for rain
- `track_temperature` is typically higher than `air_temperature` due to track surface heating
- Multiple query parameters can be combined: `?meeting_key=1208&wind_direction>=130&track_temperature>=52`
- Response is an array of objects, even for single results
- Useful for analyzing weather impact on race conditions and tyre performance
