# Car Data Endpoint

## Overview
Provides telemetry data about each car at a sample rate of about 3.7 Hz. Includes speed, throttle, brake, DRS status, gear, and RPM information.

<aside class="notice">
Live data for this endpoint is currently unavailable during sessions.  
The data will be provided shortly after each session instead.
</aside>

## Endpoint Details
- **HTTP Request**: `GET https://api.openf1.org/v1/car_data`
- **Purpose**: Real-time telemetry and car performance data
- **Use Case**: Analyze driver performance, track speed patterns, analyze braking zones, study DRS effectiveness

## Attributes

| Name | Type | Description |
|------|------|-------------|
| brake | integer | Whether the brake pedal is pressed (`100`) or not (`0`) |
| date | string | The UTC date and time, in ISO 8601 format |
| driver_number | integer | The unique number assigned to an F1 driver |
| drs | integer | The Drag Reduction System (DRS) status (see mapping table below) |
| meeting_key | integer | The unique identifier for the meeting. Use `latest` for most recent |
| n_gear | integer | Current gear selection (1-8). `0` indicates neutral or no gear engaged |
| rpm | integer | Revolutions per minute of the engine |
| session_key | integer | The unique identifier for the session. Use `latest` for most recent |
| speed | integer | Velocity of the car in km/h |
| throttle | integer | Percentage of maximum engine power being used |

## DRS Status Values
Mapping of DRS values to interpretation:

| DRS Value | Meaning |
|-----------|---------|
| 0 | DRS off |
| 1 | DRS off |
| 2 | ? (unknown) |
| 3 | ? (unknown) |
| 8 | Detected, eligible once in activation zone |
| 9 | ? (unknown) |
| 10 | DRS on |
| 12 | DRS on |
| 14 | DRS on |

## Example Queries

### Basic Query
```
GET https://api.openf1.org/v1/car_data?session_key=9159&driver_number=55
```
Returns all car data for driver 55 in session 9159.

### Filtered by Speed
```
GET https://api.openf1.org/v1/car_data?driver_number=55&session_key=9159&speed>=315
```
Returns only data points where speed exceeds 315 km/h.

### Complete Example Response
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

## Common Use Cases

### 1. Speed Analysis
Find maximum speeds or speed distribution:
```
speed>=300  # Find all high-speed sections
```

### 2. Braking Analysis
Identify heavy braking zones:
```
brake>=50  # Find hard braking moments
```

### 3. DRS Effectiveness
Study DRS usage patterns:
```
drs>=10  # Find DRS active periods
```

### 4. Gear Analysis
Analyze gear selection patterns:
```
n_gear>=8  # Find top gear usage
```

## Filtering Strategies
- Combine filters with AND logic: `driver_number=55&speed>=300&brake=0`
- Use comparison operators: `>=`, `<=`, `>`, `<` on numeric fields
- Filter by date ranges for temporal analysis
- Combine with other endpoints (laps, positions) for comprehensive analysis

## Integration Tips
- Use with `session_key` to correlate with session context
- Cross-reference with `laps` endpoint for lap-by-lap analysis
- Use with `positions` for position-based telemetry
- Combine with weather data for environmental analysis
