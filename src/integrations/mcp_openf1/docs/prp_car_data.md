# Car Data Endpoint

## Overview
Telemetry data for each car at approximately 3.7 Hz sample rate. Includes speed, throttle, brake, gear, RPM, and DRS status.

**Note**: Live data is unavailable during sessions. Data is provided shortly after each session completes.

## Endpoint
- **Method**: `GET`
- **Base URL**: `https://api.openf1.org/v1/car_data`
- **Response Format**: JSON array

## Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `driver_number` | integer | Unique F1 driver number | `55` |
| `session_key` | integer | Session identifier (use `latest` for current) | `9159` or `latest` |
| `meeting_key` | integer | Meeting identifier (use `latest` for current) | `1219` or `latest` |
| `date` | string | UTC timestamp (ISO 8601) | `2023-09-15T13:08:19.923000+00:00` |
| `speed` | integer | Filter by speed in km/h (supports `>=`, `<=`, `=`) | `speed>=315` |
| `throttle` | integer | Filter by throttle percentage (0-100) | `throttle>=90` |
| `brake` | integer | Filter by brake status (0 or 100) | `brake=100` |
| `drs` | integer | Filter by DRS status value | `drs=12` |
| `n_gear` | integer | Filter by gear (0-8, 0=neutral) | `n_gear=8` |
| `rpm` | integer | Filter by engine RPM | `rpm>=10000` |

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `brake` | integer | Brake pedal status: `0` = not pressed, `100` = pressed |
| `date` | string | UTC timestamp in ISO 8601 format |
| `driver_number` | integer | Unique F1 driver number |
| `drs` | integer | DRS status (see DRS mapping below) |
| `meeting_key` | integer | Meeting identifier |
| `n_gear` | integer | Current gear (1-8) or `0` for neutral |
| `rpm` | integer | Engine revolutions per minute |
| `session_key` | integer | Session identifier |
| `speed` | integer | Car velocity in km/h |
| `throttle` | integer | Throttle percentage (0-100) |

## DRS Status Values

DRS (Drag Reduction System) status codes:

- **0, 1**: DRS off
- **2, 3, 9**: Unknown/undefined
- **8**: Detected, eligible once in activation zone
- **10, 12, 14**: DRS on

## Example Response

```json
[
  {
    "brake": 0,
    "date": "2023-09-15T13:08:19.923000+00:00",
    "driver_number": 55,
    "drs": 12,
    "meeting_key": 1219,
    "n_gear": 8,
    "rpm": 11141,
    "session_key": 9159,
    "speed": 315,
    "throttle": 99
  }
]
```

## Usage Notes

- Use `session_key=latest` or `meeting_key=latest` to get current/latest session data
- Multiple query parameters can be combined: `?driver_number=55&session_key=9159&speed>=315`
- Response is an array of objects, even for single results
- Data sampling rate is approximately 3.7 Hz (one measurement every ~270ms)
