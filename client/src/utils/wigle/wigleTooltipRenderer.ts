import { formatShortDate } from '../formatDate';
import type { NormalizedWigleTooltip } from './wigleTooltipNormalizer';
import { getDisplayRadioType, getRadioTypeIcon } from '../../utils/icons/radioTypeIcons';
import { resolveRadioTech, macColor } from '../../utils/mapHelpers';
import { formatCoord, formatAccuracy, formatDateTime } from '../geospatial/fieldFormatting';

/**
 * WiGLE High-Fidelity Tooltip Renderer
 * Restores original "platinum card" design with WiGLE-specific provenance.
 */

const EM_DASH = '&mdash;';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const normalizeDisplay = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return EM_DASH;
  const text = String(value).trim();
  return text.length > 0 ? escapeHtml(text) : EM_DASH;
};

const coordSourceLabel = (source: string | null): string => {
  if (source === 'wigle-v2-trilat') return 'v2 trilaterated';
  if (source === 'wigle-v3-centroid') return 'v3 centroid';
  if (source === 'wigle-v3-summary') return 'v3 summary';
  return '';
};

const formatDate = (value: string | null): string => {
  if (!value) return EM_DASH;
  const formatted = formatShortDate(value);
  return formatted === '—' ? escapeHtml(value) : escapeHtml(formatted);
};

const fieldRow = (label: string, value: string, allowWrap = false): string => {
  const valueStyle = allowWrap
    ? 'font-size:11px;color:rgba(255,255,255,0.85);text-align:right;white-space:normal;word-break:break-word;line-height:1.3;'
    : 'font-size:11px;color:rgba(255,255,255,0.85);text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';

  return `<div style="display:grid;grid-template-columns:130px 1fr;align-items:${allowWrap ? 'flex-start' : 'center'};min-height:26px;padding:3px 12px;border-bottom:1px solid rgba(255,255,255,0.05);">
    <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.07em;color:rgba(255,255,255,0.38);white-space:nowrap;padding-top:${allowWrap ? '3px' : '0px'};">${escapeHtml(label)}</div>
    <div style="${valueStyle}">${value}</div>
  </div>`;
};

function statsCell(label: string, valueText: string, fillPct: number, color: string, borders = '') {
  return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:8px 6px 6px;min-width:0;flex:1;${borders}">
    <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.4);margin-bottom:3px;white-space:nowrap;">${label}</div>
    <div style="font-size:15px;font-weight:600;color:#fff;line-height:1;margin-bottom:4px;white-space:nowrap;">${valueText}</div>
    <div style="width:100%;height:3px;border-radius:2px;background:rgba(255,255,255,0.1);overflow:hidden;"><div style="height:100%;width:${Math.max(0, Math.min(100, fillPct))}%;border-radius:2px;background:${color};"></div></div>
  </div>`;
}

export const renderWigleTooltip = (data: NormalizedWigleTooltip): string => {
  const bssidRaw = data.bssid;
  const bc = macColor(bssidRaw);

  const rawCaps = data.capabilities || '';
  const freq = data.frequency || 0;
  // Reconcile tech for icon
  const tech = resolveRadioTech('wifi', rawCaps, freq);
  const displayRadioType = getDisplayRadioType(tech, false, false, false);

  const sourceBadge = `<div style="flex-shrink:0;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;background:rgba(96,165,250,0.12);border:1px solid rgba(96,165,250,0.24);color:#93c5fd;white-space:nowrap;">${escapeHtml(data.source.toUpperCase())}</div>`;

  const coordLabel = (() => {
    const src = coordSourceLabel(data.displayCoordinateSource);
    return src ? `Coords (${escapeHtml(src)})` : 'Coordinates';
  })();

  const locationDisplay = [data.city, data.region].filter(Boolean).map(escapeHtml).join(', ');

  const precisionWarning = data.wiglePrecisionWarning
    ? `<div style="display:flex;align-items:center;gap:6px;padding:4px 12px;border-bottom:1px solid rgba(255,255,255,0.05);background:rgba(251,191,36,0.05);">
           <span style="font-size:10px;color:#fbbf24;">&#9888;</span>
           <span style="font-size:10px;color:#fbbf24;font-weight:500;">Low-confidence location (&lt;3 WiGLE observations)</span>
         </div>`
    : '';

  const activeChips: string[] = [];
  if (data.publicNonstationaryFlag) {
    activeChips.push(
      `<div style="padding:2px 7px;border-radius:999px;background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.25);color:#fbbf24;font-size:10px;font-weight:500;">Non-stationary</div>`
    );
  }
  if (data.publicSsidVariantFlag) {
    activeChips.push(
      `<div style="padding:2px 7px;border-radius:999px;background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.25);color:#fbbf24;font-size:10px;font-weight:500;">SSID variants</div>`
    );
  }
  const patternChips =
    activeChips.length > 0
      ? `<div style="display:flex;flex-wrap:wrap;gap:4px;padding:8px 12px;border-top:1px solid rgba(255,255,255,0.08);">
           <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.07em;color:rgba(255,255,255,0.38);width:100%;margin-bottom:4px;">Public WiGLE Patterns</div>
           ${activeChips.join('')}
         </div>`
      : '';

  const wigleObs = data.wigleObservationCount || 0;
  const localObs = data.localObservationCount || 0;
  const totalObs = wigleObs + localObs;

  const fieldRows = [
    data.capabilities ? fieldRow('Capabilities', escapeHtml(data.capabilities), true) : '',
    fieldRow(
      'Frequency',
      data.frequency !== null ? `${escapeHtml(String(data.frequency))} MHz` : EM_DASH
    ),
    fieldRow('Channel', normalizeDisplay(data.channel)),
    data.manufacturer ? fieldRow('Manufacturer', normalizeDisplay(data.manufacturer)) : '',
    locationDisplay ? fieldRow('Location', locationDisplay) : '',
    data.trilateratedLat !== null || data.trilateratedLon !== null
      ? fieldRow(
          coordLabel,
          `${formatCoord(data.trilateratedLat, 5)}, ${formatCoord(data.trilateratedLon, 5)}`
        )
      : '',
  ]
    .filter(Boolean)
    .join('');

  const temporalPresent =
    data.firstSeen || data.lastSeen || data.localFirstSeen || data.localLastSeen;

  return `
<div style="width:288px;max-width:min(340px, 90vw);max-height:min(650px, 90vh);background:#1a1d23;border:2px solid ${bc};border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,0.6);font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;color:#fff;box-sizing:border-box;overflow:hidden;">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px 6px;">
    <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0;">
      <div style="font-size:13px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;display:flex;align-items:center;gap:6px;">
        <div style="flex-shrink:0;">${getRadioTypeIcon(displayRadioType, bc)}</div>
        <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${normalizeDisplay(data.ssid)}</div>
      </div>
    </div>
    ${sourceBadge}
  </div>
  <div style="display:flex;align-items:center;justify-content:space-between;padding:0 12px 8px;">
    <div style="font-size:11px;font-family:monospace;color:${bc};letter-spacing:0.05em;word-break:break-all;">${normalizeDisplay(data.bssid)}</div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:8px;">
    ${statsCell('WiGLE Obs', normalizeDisplay(wigleObs), (wigleObs / 100) * 100, '#60a5fa')}
    ${statsCell('Local Obs', normalizeDisplay(localObs), (localObs / 50) * 100, '#22c55e', 'border-left:1px solid rgba(255,255,255,0.08);')}
  </div>

  ${fieldRows}
  ${precisionWarning}

  ${
    temporalPresent
      ? `
  <details style="border-top:1px solid rgba(255,255,255,0.08);">
    <summary style="cursor:pointer;list-style:none;padding:5px 12px;font-size:9px;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.3);user-select:none;">&#x25BC; Timestamps</summary>
    <div style="padding:6px 12px 8px;background:rgba(255,255,255,0.02);">
      ${
        wigleObs > 0
          ? `
      <div style="margin-bottom:8px;">
        <div style="font-size:9px;color:rgba(96,165,250,0.6);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">WiGLE Public Records</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
          <div>
            <div style="font-size:8px;text-transform:uppercase;color:rgba(255,255,255,0.3);margin-bottom:2px;">First Seen</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.85);font-family:monospace;">${formatDate(data.firstSeen)}</div>
          </div>
          <div>
            <div style="font-size:8px;text-transform:uppercase;color:rgba(255,255,255,0.3);margin-bottom:2px;">Last Seen</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.85);font-family:monospace;">${formatDate(data.lastSeen)}</div>
          </div>
        </div>
      </div>`
          : ''
      }
      ${
        localObs > 0
          ? `
      <div>
        <div style="font-size:9px;color:rgba(34,197,94,0.6);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Your Local Captures</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
          <div>
            <div style="font-size:8px;text-transform:uppercase;color:rgba(255,255,255,0.3);margin-bottom:2px;">First Seen</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.85);font-family:monospace;">${formatDate(data.localFirstSeen)}</div>
          </div>
          <div>
            <div style="font-size:8px;text-transform:uppercase;color:rgba(255,255,255,0.3);margin-bottom:2px;">Last Seen</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.85);font-family:monospace;">${formatDate(data.localLastSeen)}</div>
          </div>
        </div>
      </div>`
          : ''
      }
    </div>
  </details>`
      : ''
  }

  ${patternChips}
</div>`;
};
