# Laps Endpoint

## Overview
Provides detailed information about individual laps, including sector times, speeds, and lap numbers.

## Endpoint Details
- **HTTP Request**: `GET https://api.openf1.org/v1/laps`
- **Purpose**: Lap-by-lap performance data
- **Use Case**: Analyze lap times, sector performance, speed traps, identify best laps

## Attributes

| Name | Type | Description |
|------|------|-------------|
| date_start | string | The UTC starting date and time (ISO 8601 format, approximate) |
| driver_number | integer | The unique number assigned to an F1 driver |
| duration_sector_1 | float | Time taken (seconds) to complete the first sector |
| duration_sector_2 | float | Time taken (seconds) to complete the second sector |
| duration_sector_3 | float | Time taken (seconds) to complete the third sector |
| i1_speed | integer | Speed (km/h) at the first intermediate point on the track |
| i2_speed | integer | Speed (km/h) at the second intermediate point on the track |
| is_pit_out_lap | boolean | Whether the lap is an "out lap" from the pit |
| lap_duration | float | Total time taken (seconds) to complete the entire lap |
| lap_number | integer | Sequential number of the lap within the session (starts at 1) |
| meeting_key | integer | The unique identifier for the meeting |
| segments_sector_1 | array | Values representing "mini-sectors" within the first sector |
| segments_sector_2 | array | Values representing "mini-sectors" within the second sector |
| segments_sector_3 | array | Values representing "mini-sectors" within the third sector |
| session_key | integer | The unique identifier for the session |
| st_speed | integer | Speed (km/h) at the speed trap |

## Segment Value Mapping
Correlation between segment values and their meaning:

| Value | Color/Symbol | Meaning |
|-------|--------------|---------|
| 0 | - | not available |
| 2048 | 🟡 yellow | yellow sector |
| 2049 | 🟢 green | green sector |
| 2050 | ? | ? |
| 2051 | 🟣 purple | purple sector |
| 2052 | ? | ? |
| 2064 | - | pitlane |
| 2068 | ? | ? |

**Note**: Segments are not available during races. Segment values may not always align perfectly with TV colors.

## Example Queries

### Get Lap by Number
```
GET https://api.openf1.org/v1/laps?session_key=9161&driver_number=63&lap_number=8
```

### Get All Laps for Driver
```
GET https://api.openf1.org/v1/laps?session_key=9161&driver_number=63
```

### Example Response
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

## Common Use Cases

### 1. Find Fastest Lap
Query all laps for a driver and find minimum lap_duration.

### 2. Sector Analysis
Compare duration_sector_1, duration_sector_2, duration_sector_3 to identify weak sectors.

### 3. Speed Trap Analysis
Use st_speed, i1_speed, i2_speed to analyze track speeds.

### 4. Pit Out Laps
Filter is_pit_out_lap=true to exclude pit exit laps from analysis.

## Filtering Strategies
- Filter by lap_number for specific lap analysis
- Use session_key to limit to a specific session
- Combine with driver_number for driver-specific analysis
- Use is_pit_out_lap=false to exclude pit laps

## Integration Tips
- Use lap_duration for time analysis and comparisons
- Combine with car_data for detailed telemetry
- Cross-reference with positions for position-based lap analysis
- Use sector times for detailed performance breakdown
