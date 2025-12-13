# Intervals Endpoint
## Overview
Fetches real-time interval data between drivers and gap to race leader. Available during races only, updates every 4 seconds.
## HTTP Request: GET https://api.openf1.org/v1/intervals
### Attributes
- date: UTC timestamp
- driver_number: Driver number
- gap_to_leader: Gap to leader in seconds (or "+1 LAP")
- interval: Gap to car ahead in seconds (or "+1 LAP")
- meeting_key: Meeting identifier
- session_key: Session identifier
## Example Query
GET https://api.openf1.org/v1/intervals?session_key=9165&interval>0&interval<0.005
## Use Case: Real-time race gaps, overtaking opportunities analysis
