/**
 * Build the HTML string used for map network tooltips.
 */
export const renderNetworkTooltip = (props: any): string => {
  const formatDate = (date: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (date: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const formatDateTime = (date: string) => {
    if (!date) return 'N/A';
    return `${formatDate(date)} ${formatTime(date)}`;
  };

  const formatCoordinates = (lat: number, lon: number) => {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lonDir = lon >= 0 ? 'E' : 'W';
    return {
      lat: `${Math.abs(lat).toFixed(4)}° ${latDir}`,
      lon: `${Math.abs(lon).toFixed(4)}° ${lonDir}`,
    };
  };

  const coords = formatCoordinates(props.lat || 0, props.lon || 0);
  const threatLevel = props.threat_level || 'NONE';
  const threatColor =
    {
      CRITICAL: '#ef4444',
      HIGH: '#f97316',
      MED: '#eab308',
      LOW: '#22c55e',
      NONE: '#94a3b8',
    }[threatLevel] || '#94a3b8';

  const formatFrequency = (freq: number | null) => {
    if (!freq) return 'N/A';
    if (freq > 5000) return `${freq} MHz (5 GHz)`;
    if (freq > 1000) return `${freq} MHz (2.4 GHz)`;
    return `${freq} MHz`;
  };

  return `
      <div style="background: linear-gradient(135deg, rgba(17, 24, 39, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%); color: #f8fafc; padding: 16px; border-radius: 12px; max-width: 320px; font-size: 11px; border: 1px solid rgba(59, 130, 246, 0.3); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
        
        <!-- HEADER -->
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid rgba(59, 130, 246, 0.2);">
          <div style="flex: 1;">
            <div style="color: #60a5fa; font-weight: bold; font-size: 14px;">${props.ssid || 'Hidden Network'}</div>
            <div style="color: #94a3b8; font-size: 10px; margin-top: 2px;">${(props.type || 'W') === 'W' ? 'WiFi' : props.type} Network</div>
          </div>
          <div style="background: linear-gradient(135deg, ${threatColor}55, ${threatColor}22); border: 2px solid ${threatColor}; border-radius: 8px; padding: 3px 8px; font-weight: 800; letter-spacing: 0.3px; text-transform: uppercase; color: #f8fafc; font-size: 9px;">
            #${props.number || '1'}
          </div>
        </div>

        <!-- NETWORK INFO CARDS -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
          <div style="background: rgba(59, 130, 246, 0.08); padding: 8px; border-radius: 6px; border: 1px solid rgba(59, 130, 246, 0.15);">
            <span style="color: #94a3b8; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px;">BSSID</span>
            <div style="font-family: 'Courier New', monospace; font-size: 10px; margin-top: 3px; color: #e2e8f0;">${props.bssid}</div>
          </div>
          <div style="background: rgba(59, 130, 246, 0.08); padding: 8px; border-radius: 6px; border: 1px solid rgba(59, 130, 246, 0.15);">
            <span style="color: #94a3b8; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px;">Signal</span>
            <div style="margin-top: 3px;">
              <span style="color: #fbbf24; font-weight: bold;">${props.signal ? `${props.signal} dBm` : 'N/A'}</span>
            </div>
          </div>
          <div style="background: rgba(59, 130, 246, 0.08); padding: 8px; border-radius: 6px; border: 1px solid rgba(59, 130, 246, 0.15);">
            <span style="color: #94a3b8; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px;">Security</span>
            <div style="color: #e2e8f0; font-weight: 600; margin-top: 3px; font-size: 10px;">${props.security || 'Open'}</div>
          </div>
          <div style="background: rgba(59, 130, 246, 0.08); padding: 8px; border-radius: 6px; border: 1px solid rgba(59, 130, 246, 0.15);">
            <span style="color: #94a3b8; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px;">Frequency</span>
            <div style="color: #e2e8f0; margin-top: 3px; font-size: 10px;">${formatFrequency(props.frequency)}</div>
          </div>
        </div>

        <!-- MANUFACTURER CARD -->
        ${
          props.manufacturer && props.manufacturer !== 'Unknown'
            ? `
        <div style="background: rgba(59, 130, 246, 0.05); padding: 10px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #3b82f6;">
          <div style="color: #94a3b8; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Manufacturer</div>
          <div style="color: #60a5fa; font-weight: 500;">${props.manufacturer}</div>
        </div>
        `
            : ''
        }

        <!-- THREAT ASSESSMENT CARD -->
        <div style="background: linear-gradient(135deg, ${threatColor}15 0%, ${threatColor}08 100%); padding: 12px; border-radius: 8px; margin-bottom: 10px; border: 1px solid ${threatColor}40; border-left: 4px solid ${threatColor};">
          <div style="color: ${threatColor}; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; font-weight: 700;">🚨 Threat Assessment</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <span style="color: #94a3b8; font-size: 9px;">Level</span>
              <div style="color: ${threatColor}; font-weight: 800; margin-top: 3px; font-size: 12px; text-transform: uppercase;">${threatLevel}</div>
            </div>
            <div>
              <span style="color: #94a3b8; font-size: 9px;">Score</span>
              <div style="color: ${threatColor}; font-weight: 700; margin-top: 3px; font-size: 12px;">${props.threat_score ? props.threat_score.toFixed(2) : 'N/A'}</div>
            </div>
          </div>
        </div>

        <!-- LOCATION CARD -->
        <div style="background: rgba(59, 130, 246, 0.08); padding: 10px; border-radius: 6px; margin-bottom: 10px; border: 1px solid rgba(59, 130, 246, 0.2);">
          <div style="color: #3b82f6; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; font-weight: 600;">📍 Location</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 10px;">
            <div><span style="color: #94a3b8;">Latitude:</span><br><span style="color: #60a5fa; font-weight: 600;">${coords.lat}</span></div>
            <div><span style="color: #94a3b8;">Longitude:</span><br><span style="color: #60a5fa; font-weight: 600;">${coords.lon}</span></div>
            <div><span style="color: #94a3b8;">Altitude:</span><br><span style="color: #60a5fa;">${props.altitude != null ? `${props.altitude.toFixed(1)}m` : 'N/A'}</span></div>
            <div><span style="color: #94a3b8;">Distance:</span><br><span style="color: #60a5fa;">${props.distance_from_home_km ? `${props.distance_from_home_km.toFixed(1)}km` : 'N/A'}</span></div>
          </div>
        </div>

        <!-- TEMPORAL CARD -->
        <div style="background: linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%); padding: 12px; border-radius: 8px; margin-bottom: 10px; border: 1px solid rgba(251, 191, 36, 0.3);">
          <div style="color: #fbbf24; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; font-weight: 600;">⏱️ Observed</div>
          ${
            props.time
              ? `
          <div style="margin-bottom: 4px;">
            <span style="color: #94a3b8; font-size: 9px;">This Observation:</span>
            <div style="color: #fde68a; font-weight: 600; font-size: 11px; margin-top: 2px;">${formatDateTime(props.time)}</div>
          </div>
          `
              : ''
          }
          ${
            props.first_seen
              ? `
          <div style="margin-bottom: 4px;">
            <span style="color: #94a3b8; font-size: 9px;">First:</span>
            <div style="color: #fde68a; font-weight: 600; font-size: 11px; margin-top: 2px;">${formatDateTime(props.first_seen)}</div>
          </div>
          `
              : ''
          }
          ${
            props.last_seen && props.last_seen !== props.first_seen
              ? `
          <div style="margin-bottom: 4px;">
            <span style="color: #94a3b8; font-size: 9px;">Last:</span>
            <div style="color: #fde68a; font-weight: 600; font-size: 11px; margin-top: 2px;">${formatDateTime(props.last_seen)}</div>
          </div>
          <div style="display: flex; gap: 12px; margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(251, 191, 36, 0.2);">
            ${props.timespan_days ? `<div><span style="color: #94a3b8; font-size: 9px;">Span:</span> <span style="color: #fbbf24; font-weight: 600; font-size: 10px;">${props.timespan_days}d</span></div>` : ''}
            ${props.observation_count || props.observations ? `<div><span style="color: #94a3b8; font-size: 9px;">Count:</span> <span style="color: #fbbf24; font-weight: 600; font-size: 10px;">${props.observation_count || props.observations}</span></div>` : ''}
          </div>
          `
              : ''
          }
        </div>

        <!-- GPS ACCURACY -->
        ${
          props.accuracy
            ? `
        <div style="background: rgba(59, 130, 246, 0.08); padding: 8px; border-radius: 6px; border: 1px solid rgba(59, 130, 246, 0.15);">
          <span style="color: #94a3b8; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px;">GPS Accuracy</span>
          <div style="color: #e2e8f0; font-weight: 600; margin-top: 3px; font-size: 10px;">±${props.accuracy.toFixed(1)}m</div>
        </div>
        `
            : ''
        }
      </div>
    `;
};
