# Drivers Endpoint

## Overview
Provides information about drivers for each session, including names, team details, and driver numbers.

## Endpoint
- **Method**: `GET`
- **Base URL**: `https://api.openf1.org/v1/drivers`
- **Response Format**: JSON array

## Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `driver_number` | integer | Unique F1 driver number | `1` |
| `session_key` | integer | Session identifier (use `latest` for current) | `9158` or `latest` |
| `meeting_key` | integer | Meeting identifier (use `latest` for current) | `1219` or `latest` |
| `name_acronym` | string | Three-letter driver acronym | `VER` |
| `country_code` | string | ISO country code | `NED` |
| `team_name` | string | Team name | `Red Bull Racing` |

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `broadcast_name` | string | Driver's name as displayed on TV broadcasts |
| `country_code` | string | ISO country code (3 letters) |
| `driver_number` | integer | Unique F1 driver number (permanent per driver) |
| `first_name` | string | Driver's first name |
| `full_name` | string | Driver's full name |
| `headshot_url` | string | URL to driver's official headshot photo |
| `last_name` | string | Driver's last name |
| `meeting_key` | integer | Meeting identifier |
| `name_acronym` | string | Three-letter acronym (e.g., "VER" for Verstappen) |
| `session_key` | integer | Session identifier |
| `team_colour` | string | Hexadecimal color code (RRGGBB) of driver's team |
| `team_name` | string | Name of driver's team |

## Example Response

```json
[
  {
    "broadcast_name": "M VERSTAPPEN",
    "country_code": "NED",
    "driver_number": 1,
    "first_name": "Max",
    "full_name": "Max VERSTAPPEN",
    "headshot_url": "https://www.formula1.com/content/dam/fom-website/drivers/M/MAXVER01_Max_Verstappen/maxver01.png.transform/1col/image.png",
    "last_name": "Verstappen",
    "meeting_key": 1219,
    "name_acronym": "VER",
    "session_key": 9158,
    "team_colour": "3671C6",
    "team_name": "Red Bull Racing"
  }
]
```

## Usage Notes

- Use `session_key=latest` or `meeting_key=latest` to get current/latest session data
- `driver_number` is permanent per driver across seasons
- Multiple query parameters can be combined: `?driver_number=1&session_key=9158`
- Response is an array of objects, even for single results
- `team_colour` is in hexadecimal format without the `#` prefix (e.g., "3671C6")
