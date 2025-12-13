# Sessions Endpoint

## Overview
Provides information about sessions. A session refers to a distinct period of track activity during a Grand Prix or testing weekend (practice, qualifying, sprint, race).

## Endpoint Details
- **HTTP Request**: `GET https://api.openf1.org/v1/sessions`
- **Purpose**: Session identification and timing information
- **Use Case**: Find specific sessions, get session keys for data queries

## Attributes

| Name | Type | Description |
|------|------|-------------|
| circuit_key | integer | The unique identifier for the circuit |
| circuit_short_name | string | The short or common name of the circuit |
| country_code | string | A code that uniquely identifies the country |
| country_key | integer | The unique identifier for the country |
| country_name | string | The full name of the country where the event takes place |
| date_end | string | The UTC ending date and time (ISO 8601 format) |
| date_start | string | The UTC starting date and time (ISO 8601 format) |
| gmt_offset | string | Difference in hours and minutes between local time and GMT |
| location | string | The city or geographical location where the event takes place |
| meeting_key | integer | The unique identifier for the meeting. Use `latest` for most recent |
| session_key | integer | The unique identifier for the session. Use `latest` for most recent |
| session_name | string | The name of the session (Practice 1, Qualifying, Race, Sprint, etc.) |
| session_type | string | The type of the session (Practice, Qualifying, Race, etc.) |
| year | integer | The year the event takes place |

## Common Session Names
- Practice 1, Practice 2, Practice 3
- Qualifying
- Sprint Shootout
- Sprint
- Race

## Example Queries

### Find Session by Type
```
GET https://api.openf1.org/v1/sessions?country_name=Belgium&session_name=Sprint&year=2023
```

### Get All Sessions for a Meeting
```
GET https://api.openf1.org/v1/sessions?meeting_key=1216
```

### Example Response
```json
[
  {
    "circuit_key": 7,
    "circuit_short_name": "Spa-Francorchamps",
    "country_code": "BEL",
    "country_key": 16,
    "country_name": "Belgium",
    "date_end": "2023-07-29T15:35:00+00:00",
    "date_start": "2023-07-29T15:05:00+00:00",
    "gmt_offset": "02:00:00",
    "location": "Spa-Francorchamps",
    "meeting_key": 1216,
    "session_key": 9140,
    "session_name": "Sprint",
    "session_type": "Race",
    "year": 2023
  }
]
```

## Common Use Cases

### 1. Get session_key for Data Queries
Use session_key from this endpoint in all data endpoints.

### 2. Find Race Session
Filter by session_type="Race" or session_name="Race".

### 3. Get Practice Sessions
Filter by session_name containing "Practice".

### 4. Filter by Date Range
Use date_start and date_end for temporal filtering.

## Integration Tips
- Use session_key as input to all data endpoints (car_data, laps, drivers, etc.)
- Store session information locally to avoid repeated queries
- Use date_start and date_end for timing analysis
- Combine with meetings endpoint for complete event context
