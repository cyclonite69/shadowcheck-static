# Keyring Integration & Map Visualization

## Keyring Setup

### Install Keyring Library
```bash
# Python (for all repos)
pip install keyring

# Verify installation
python3 -c "import keyring; print(keyring.get_keyring())"
```

### Initialize All API Keys
```bash
# Database credentials
python3 -c "import keyring; keyring.set_password('shadowcheck', 'postgres_password', 'YOUR_ACTUAL_PASSWORD_HERE')"
python3 -c "import keyring; keyring.set_password('shadowcheck', 'pgadmin_password', 'admin')"

# Map services
python3 -c "import keyring; keyring.set_password('shadowcheck', 'mapbox_token', 'YOUR_MAPBOX_TOKEN')"
python3 -c "import keyring; keyring.set_password('shadowcheck', 'google_maps_api_key', 'YOUR_GOOGLE_KEY')"

# WiGLE API
python3 -c "import keyring; keyring.set_password('shadowcheck', 'wigle_api_key', 'YOUR_WIGLE_KEY')"

# Geocoding services
python3 -c "import keyring; keyring.set_password('shadowcheck', 'opencage_api_key', 'YOUR_OPENCAGE_KEY')"
python3 -c "import keyring; keyring.set_password('shadowcheck', 'locationiq_api_key', 'YOUR_LOCATIONIQ_KEY')"
python3 -c "import keyring; keyring.set_password('shadowcheck', 'abstract_api_key', 'YOUR_ABSTRACT_KEY')"
```

### Node.js Keyring Helper
```javascript
// utils/keyring.js
const { execSync } = require('child_process');

class KeyringManager {
    static get(account) {
        try {
            const cmd = `python3 -c "import keyring; print(keyring.get_password('shadowcheck', '${account}'))"`;
            const value = execSync(cmd, { encoding: 'utf-8' }).trim();
            return value === 'None' ? null : value;
        } catch (error) {
            console.error(`Failed to get keyring value for ${account}:`, error.message);
            return null;
        }
    }

    static set(account, value) {
        try {
            const cmd = `python3 -c "import keyring; keyring.set_password('shadowcheck', '${account}', '${value}')"`;
            execSync(cmd);
            return true;
        } catch (error) {
            console.error(`Failed to set keyring value for ${account}:`, error.message);
            return false;
        }
    }

    static delete(account) {
        try {
            const cmd = `python3 -c "import keyring; keyring.delete_password('shadowcheck', '${account}')"`;
            execSync(cmd);
            return true;
        } catch (error) {
            console.error(`Failed to delete keyring value for ${account}:`, error.message);
            return false;
        }
    }
}

module.exports = KeyringManager;
```

### Update server.js Database Connection
```javascript
// server.js
const KeyringManager = require('./utils/keyring');

// Get password from keyring
const dbPassword = KeyringManager.get('postgres_password');

if (!dbPassword) {
    console.error('Database password not found in keyring!');
    console.error('Run: python3 -c "import keyring; keyring.set_password(\'shadowcheck\', \'postgres_password\', \'YOUR_PASSWORD\')"');
    process.exit(1);
}

const pool = new Pool({
    user: process.env.DB_USER || 'shadowcheck_user',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'shadowcheck_db',
    password: dbPassword,
    port: process.env.DB_PORT || 5432,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
```

## Map Integration

### 1. Mapbox GL JS (Primary)

#### Install
```bash
npm install mapbox-gl
```

#### Configuration
```javascript
// public/js/mapbox-config.js
const KeyringManager = require('../../utils/keyring');

const MAPBOX_TOKEN = KeyringManager.get('mapbox_token');

if (!MAPBOX_TOKEN) {
    console.warn('Mapbox token not found in keyring. Maps will not work.');
}

mapboxgl.accessToken = MAPBOX_TOKEN;
```

#### Geospatial Page Integration
```javascript
// public/geospatial.html
<script src="https://api.mapbox.com/mapbox-gl-js/v3.0.0/mapbox-gl.js"></script>
<link href="https://api.mapbox.com/mapbox-gl-js/v3.0.0/mapbox-gl.css" rel="stylesheet" />

<script>
// Initialize map
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [-98.5795, 39.8283], // US center
    zoom: 4
});

// Load networks from PostgreSQL
map.on('load', async () => {
    const response = await fetch('/api/networks/geojson');
    const geojson = await response.json();
    
    map.addSource('networks', {
        type: 'geojson',
        data: geojson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50
    });
    
    // Clusters
    map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'networks',
        filter: ['has', 'point_count'],
        paint: {
            'circle-color': [
                'step',
                ['get', 'point_count'],
                '#51bbd6', 100,
                '#f1f075', 750,
                '#f28cb1'
            ],
            'circle-radius': [
                'step',
                ['get', 'point_count'],
                20, 100,
                30, 750,
                40
            ]
        }
    });
    
    // Individual points
    map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'networks',
        filter: ['!', ['has', 'point_count']],
        paint: {
            'circle-color': [
                'match',
                ['get', 'threat_level'],
                'THREAT', '#ff0000',
                'INVESTIGATE', '#ff9900',
                'LEGIT', '#00ff00',
                '#cccccc'
            ],
            'circle-radius': 8,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff'
        }
    });
    
    // Click handler
    map.on('click', 'unclustered-point', (e) => {
        const coordinates = e.features[0].geometry.coordinates.slice();
        const props = e.features[0].properties;
        
        new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(`
                <h3>${props.ssid}</h3>
                <p><strong>BSSID:</strong> ${props.bssid}</p>
                <p><strong>Signal:</strong> ${props.signal_dbm} dBm</p>
                <p><strong>Encryption:</strong> ${props.encryption}</p>
                <p><strong>Threat:</strong> ${props.threat_level || 'Unknown'}</p>
            `)
            .addTo(map);
    });
});
</script>
```

### 2. Google Maps Integration

```javascript
// public/js/google-maps.js
const KeyringManager = require('../../utils/keyring');
const GOOGLE_MAPS_KEY = KeyringManager.get('google_maps_api_key');

function initGoogleMap() {
    const map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 39.8283, lng: -98.5795 },
        zoom: 4,
        mapTypeId: 'roadmap'
    });
    
    // Load networks
    fetch('/api/networks/geojson')
        .then(res => res.json())
        .then(data => {
            data.features.forEach(feature => {
                const [lng, lat] = feature.geometry.coordinates;
                const props = feature.properties;
                
                const marker = new google.maps.Marker({
                    position: { lat, lng },
                    map: map,
                    title: props.ssid,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 8,
                        fillColor: getThreatColor(props.threat_level),
                        fillOpacity: 0.8,
                        strokeColor: '#fff',
                        strokeWeight: 2
                    }
                });
                
                const infoWindow = new google.maps.InfoWindow({
                    content: `
                        <h3>${props.ssid}</h3>
                        <p><strong>BSSID:</strong> ${props.bssid}</p>
                        <p><strong>Signal:</strong> ${props.signal_dbm} dBm</p>
                    `
                });
                
                marker.addListener('click', () => {
                    infoWindow.open(map, marker);
                });
            });
        });
}

function getThreatColor(level) {
    switch(level) {
        case 'THREAT': return '#ff0000';
        case 'INVESTIGATE': return '#ff9900';
        case 'LEGIT': return '#00ff00';
        default: return '#cccccc';
    }
}
```

### 3. Kepler.gl Integration

```bash
npm install kepler.gl react react-dom react-redux redux
```

```javascript
// public/js/kepler-map.js
import KeplerGl from 'kepler.gl';
import { addDataToMap } from 'kepler.gl/actions';

// Load data from PostgreSQL
fetch('/api/observations/all')
    .then(res => res.json())
    .then(data => {
        const keplerData = {
            fields: [
                { name: 'bssid', type: 'string' },
                { name: 'ssid', type: 'string' },
                { name: 'latitude', type: 'real' },
                { name: 'longitude', type: 'real' },
                { name: 'signal_dbm', type: 'integer' },
                { name: 'timestamp', type: 'timestamp' }
            ],
            rows: data.map(obs => [
                obs.bssid,
                obs.ssid,
                obs.latitude,
                obs.longitude,
                obs.signal_dbm,
                obs.observed_at
            ])
        };
        
        store.dispatch(addDataToMap({
            datasets: {
                info: { label: 'WiFi Observations', id: 'wifi' },
                data: keplerData
            },
            options: {
                centerMap: true,
                readOnly: false
            }
        }));
    });
```

### 4. Google Earth KML Export

```javascript
// server.js - Add KML export endpoint
app.get('/api/networks/kml', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                bssid,
                ssid,
                ST_AsKML(location) as kml_point,
                max_signal_dbm,
                encryption_summary,
                nt.tag_type as threat_level
            FROM app.networks n
            LEFT JOIN app.network_tags nt ON n.bssid = nt.bssid
            WHERE location IS NOT NULL
        `);
        
        let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>ShadowCheck Networks</name>
    <description>WiFi Networks from ShadowCheck</description>
`;
        
        result.rows.forEach(row => {
            const color = getThreatColorKML(row.threat_level);
            kml += `
    <Placemark>
      <name>${escapeXml(row.ssid)}</name>
      <description>
        BSSID: ${row.bssid}
        Signal: ${row.max_signal_dbm} dBm
        Encryption: ${row.encryption_summary || 'Unknown'}
        Threat: ${row.threat_level || 'Unknown'}
      </description>
      <Style>
        <IconStyle>
          <color>${color}</color>
          <Icon>
            <href>http://maps.google.com/mapfiles/kml/shapes/wifi.png</href>
          </Icon>
        </IconStyle>
      </Style>
      ${row.kml_point}
    </Placemark>`;
        });
        
        kml += `
  </Document>
</kml>`;
        
        res.header('Content-Type', 'application/vnd.google-earth.kml+xml');
        res.header('Content-Disposition', 'attachment; filename="shadowcheck_networks.kml"');
        res.send(kml);
    } catch (error) {
        console.error('KML export error:', error);
        res.status(500).json({ error: 'Failed to generate KML' });
    }
});

function getThreatColorKML(level) {
    switch(level) {
        case 'THREAT': return 'ff0000ff'; // Red
        case 'INVESTIGATE': return 'ff0099ff'; // Orange
        case 'LEGIT': return 'ff00ff00'; // Green
        default: return 'ffcccccc'; // Gray
    }
}

function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}
```

## GeoJSON API Endpoint

```javascript
// server.js
app.get('/api/networks/geojson', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                n.bssid,
                n.ssid,
                ST_X(n.location::geometry) as longitude,
                ST_Y(n.location::geometry) as latitude,
                n.max_signal_dbm as signal_dbm,
                n.encryption_summary as encryption,
                n.manufacturer,
                n.device_type,
                nt.tag_type as threat_level,
                nt.threat_score
            FROM app.networks n
            LEFT JOIN app.network_tags nt ON n.bssid = nt.bssid
            WHERE n.location IS NOT NULL
        `);
        
        const geojson = {
            type: 'FeatureCollection',
            features: result.rows.map(row => ({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [row.longitude, row.latitude]
                },
                properties: {
                    bssid: row.bssid,
                    ssid: row.ssid,
                    signal_dbm: row.signal_dbm,
                    encryption: row.encryption,
                    manufacturer: row.manufacturer,
                    device_type: row.device_type,
                    threat_level: row.threat_level,
                    threat_score: row.threat_score
                }
            }))
        };
        
        res.json(geojson);
    } catch (error) {
        console.error('GeoJSON error:', error);
        res.status(500).json({ error: 'Failed to generate GeoJSON' });
    }
});
```

## Security Checklist

- [ ] All API keys in keyring (never in code)
- [ ] .env file in .gitignore
- [ ] Database password from keyring
- [ ] Map tokens from keyring
- [ ] WiGLE API key from keyring
- [ ] Geocoding API keys from keyring
- [ ] No secrets in git history
- [ ] Environment-specific configs
- [ ] TLS for database connections
- [ ] API rate limiting enabled
