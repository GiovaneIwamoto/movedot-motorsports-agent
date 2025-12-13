# Meetings Endpoint

## Overview
Provides information about meetings (Grand Prix or testing weekends). A meeting usually includes multiple sessions (practice, qualifying, race).

## Endpoint Details
- **HTTP Request**: `GET https://api.openf1.org/v1/meetings`
- **Purpose**: Event identification and location information
- **Use Case**: Find Grand Prix events, get meeting keys for downstream queries

## Attributes

| Name | Type | Description |
|------|------|-------------|
| circuit_key | integer | The unique identifier for the circuit |
| circuit_short_name | string | The short or common name of the circuit |
| country_code | string | A code that uniquely identifies the country |
| country_key | integer | The unique identifier for the country |
| country_name | string | The full name of the country where the event takes place |
| date_start | string | The UTC starting date and time (ISO 8601 format) |
| gmt_offset | string | Difference in hours and minutes between local time and GMT |
| location | string | The city or geographical location where the event takes place |
| meeting_key | integer | The unique identifier for the meeting. Use `latest` for most recent |
| meeting_name | string | The name of the meeting |
| meeting_official_name | string | The official name of the meeting |
| year | integer | The year the event takes place |

## Example Queries

### Find Meeting by Country and Year
```
GET https://api.openf1.org/v1/meetings?year=2023&country_name=Singapore
```

### Get All Meetings for a Year
```
GET https://api.openf1.org/v1/meetings?year=2023
```

### Example Response
```json
[
  {
    "circuit_key": 61,
    "circuit_short_name": "Singapore",
    "country_code": "SGP",
    "country_key": 157,
    "country_name": "Singapore",
    "date_start": "2023-09-15T09:30:00+00:00",
    "gmt_offset": "08:00:00",
    "location": "Marina Bay",
    "meeting_key": 1219,
    "meeting_name": "Singapore Grand Prix",
    "meeting_official_name": "FORMULA 1 SINGAPORE AIRLINES SINGAPORE GRAND PRIX 2023",
    "year": 2023
  }
]
```

## Common Use Cases

### 1. Get meeting_key for Session Queries
Use meeting_key from this endpoint in sessions endpoint.

### 2. Find Event by Location
Filter by country_name or location to find specific events.

### 3. Get All Events in a Year
Use year parameter to list all events in a season.

### 4. Filter by Date Range
Use date_start with comparison operators for temporal filtering.

## Integration Tips
- Use meeting_key as input to sessions endpoint
- Store meeting information locally to avoid repeated queries
- Use meeting_official_name for formal reporting
- Combine with sessions to get detailed session information
