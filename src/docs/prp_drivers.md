# Drivers Endpoint

## Overview
Provides information about drivers for each session, including personal details, team assignments, and identification information.

## Endpoint Details
- **HTTP Request**: `GET https://api.openf1.org/v1/drivers`
- **Purpose**: Driver identification and team information
- **Use Case**: Get driver metadata, identify driver numbers, find team assignments

## Attributes

| Name | Type | Description |
|------|------|-------------|
| broadcast_name | string | The driver's name, as displayed on TV |
| country_code | string | A code that uniquely identifies the country |
| driver_number | integer | The unique number assigned to an F1 driver |
| first_name | string | The driver's first name |
| full_name | string | The driver's full name |
| headshot_url | string | URL of the driver's face photo |
| last_name | string | The driver's last name |
| meeting_key | integer | The unique identifier for the meeting |
| name_acronym | string | Three-letter acronym of the driver's name |
| session_key | integer | The unique identifier for the session |
| team_colour | string | The hexadecimal color value (RRGGBB) of the driver's team |
| team_name | string | Name of the driver's team |

## Example Queries

### Get All Drivers in a Session
```
GET https://api.openf1.org/v1/drivers?session_key=9158
```

### Get Specific Driver by Number
```
GET https://api.openf1.org/v1/drivers?driver_number=1&session_key=9158
```

### Example Response
```json
[
  {
    "broadcast_name": "M VERSTAPPEN",
    "country_code": "NED",
    "driver_number": 1,
    "first_name": "Max",
    "full_name": "Max VERSTAPPEN",
    "headshot_url": "https://www.formula1.com/content/dam/fom-website/drivers/...",
    "last_name": "Verstappen",
    "meeting_key": 1219,
    "name_acronym": "VER",
    "session_key": 9158,
    "team_colour": "3671C6",
    "team_name": "Red Bull Racing"
  }
]
```

## Common Use Cases

### 1. Driver Identification
Get all driver numbers for a session to use in other queries:
```
session_key=9158
```

### 2. Team Lookup
Find all drivers from a specific team using team_name in post-processing.

### 3. Driver Metadata
Retrieve driver details for visualization or reporting:
```
driver_number=1&session_key=9158
```

## Integration Tips
- Use driver_number across all other endpoints for consistency
- Store driver information locally after first query to avoid repeated calls
- Use name_acronym for compact identification in visualizations
- Combine with other endpoints using shared driver_number

## Important Notes
- driver_number is consistent across sessions and seasons
- session_key is required to get drivers for a specific session
- Use meeting_key as an alternative to session_key if needed
