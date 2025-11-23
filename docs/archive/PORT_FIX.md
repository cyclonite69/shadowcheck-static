# Port Configuration Fix

## Issue
No data was populating because the frontend was accessing the wrong port.

## Root Cause
- Server is running on **PORT 3002** (configured in `.env`)
- Frontend/browser was trying to access **PORT 3000**
- Port 3000 is already in use by another service

## Solution
Access the application on the correct port:

**http://localhost:3002**

## Verification
The server is working correctly with data:
- Total Networks: 166,086
- Threats: 6,045
- WiFi Networks: 44,949
- BLE Networks: 103,878

## API Endpoints (Port 3002)
- Dashboard: http://localhost:3002/
- Networks: http://localhost:3002/networks.html
- Geospatial: http://localhost:3002/geospatial.html
- Analytics: http://localhost:3002/analytics.html
- Surveillance: http://localhost:3002/surveillance.html

## Test API
```bash
curl http://localhost:3002/api/dashboard-metrics
curl "http://localhost:3002/api/networks?page=1&limit=10"
```

## Change Port (Optional)
To use a different port, edit `.env`:
```
PORT=3001
```
Then restart: `pkill -f "node server.js" && npm start`
