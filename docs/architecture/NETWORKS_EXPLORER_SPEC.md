# Networks Explorer - Advanced Table Specification

## Overview
The Networks Explorer is a high-performance, feature-rich data table supporting millions of network records with advanced sorting, column management, and infinite scroll capabilities.

## Core Features

### 1. Multi-Column Sorting

#### Single Column Sort
```typescript
// User clicks BSSID column header
sort: {
  column: 'bssid',
  direction: 'asc'
}

// SQL: ORDER BY bssid ASC
```

#### Multi-Column Sort (Sequential)
```typescript
// User shift-clicks multiple column headers in order:
// 1. Click SSID → 2. Shift+Click Type → 3. Shift+Click Signal

sort: [
  { column: 'ssid', direction: 'asc', priority: 1 },
  { column: 'type', direction: 'desc', priority: 2 },
  { column: 'signal_dbm', direction: 'desc', priority: 3 }
]

// SQL: ORDER BY ssid ASC, type DESC, signal_dbm DESC
```

#### Sort Indicator UI
```
┌──────────┬──────────┬──────┬────────────┬─────────────┐
│ BSSID    │ SSID ①↑  │ Type │ Signal ③↓  │ Threat Score│
├──────────┼──────────┼──────┼────────────┼─────────────┤
│ AA:BB:CC │ Airport  │ W    │ -45 dBm    │ 15          │
│ AA:BB:DD │ Airport  │ W    │ -67 dBm    │ 22          │
│ DD:EE:FF │ Airport  │ B    │ -52 dBm    │ 8           │
│ GG:HH:II │ Cafe     │ W    │ -72 dBm    │ 45          │
└──────────┴──────────┴──────┴────────────┴─────────────┘

Legend:
- ①↑ = Primary sort, ascending
- ②↓ = Secondary sort, descending
- ③↓ = Tertiary sort, descending
```

#### Sort Management UI
```
┌─────────────────────────────────────────────────────┐
│ Active Sorts                              [Clear]   │
├─────────────────────────────────────────────────────┤
│ 1. SSID (ascending)                       [Remove]  │
│ 2. Type (descending)                      [Remove]  │
│ 3. Signal (descending)                    [Remove]  │
└─────────────────────────────────────────────────────┘
```

### 2. Column Management

#### Column Visibility Selector
```
┌─────────────────────────────────────────────────────┐
│ Column Visibility                    [Select All]   │
├─────────────────────────────────────────────────────┤
│ Essential Columns (Always Visible)                  │
│ ✓ BSSID                                             │
│ ✓ SSID                                              │
│                                                     │
│ Network Details                                     │
│ ✓ Type (W/B/E/L/N/G)                               │
│ ✓ Signal (dBm)                                     │
│ ☐ Frequency (MHz)                                  │
│ ☐ Encryption                                       │
│ ☐ Capabilities                                     │
│ ☐ Channel                                          │
│                                                     │
│ Temporal Data                                       │
│ ✓ First Seen                                       │
│ ✓ Last Seen                                        │
│ ☐ Observation Count                                │
│ ☐ Time Range (hours)                               │
│                                                     │
│ Geospatial Data                                     │
│ ☐ Latitude                                         │
│ ☐ Longitude                                        │
│ ☐ Altitude                                         │
│ ☐ Accuracy                                         │
│ ☐ Distance from Home                               │
│                                                     │
│ Threat Intelligence                                 │
│ ✓ Threat Score                                     │
│ ✓ Threat Level                                     │
│ ☐ Tags                                             │
│ ☐ Tracking Indicators                              │
│ ☐ Behavioral Flags                                 │
│                                                     │
│ Hardware Details                                    │
│ ☐ Vendor (OUI)                                     │
│ ☐ 5GHz Capable                                     │
│ ☐ 6GHz Capable                                     │
│ ☐ Is Hidden                                        │
│                                                     │
│ Source Metadata                                     │
│ ☐ Device ID                                        │
│ ☐ Source Tag                                       │
│ ☐ External                                         │
│                                                     │
│        [Reset to Default]  [Cancel]  [Apply]       │
└─────────────────────────────────────────────────────┘
```

#### Column Presets
```typescript
const columnPresets = {
  minimal: ['bssid', 'ssid', 'type', 'signal_dbm'],
  standard: ['bssid', 'ssid', 'type', 'signal_dbm', 'threat_score', 'first_seen', 'last_seen'],
  threat_analysis: ['bssid', 'ssid', 'threat_score', 'threat_level', 'tags', 'tracking_indicators'],
  geospatial: ['bssid', 'ssid', 'lat', 'lon', 'distance_from_home', 'first_seen', 'last_seen'],
  technical: ['bssid', 'ssid', 'type', 'frequency', 'channel', 'encryption', 'capabilities', 'vendor'],
  all: ['*'] // All available columns
};
```

#### Column Configuration State
```typescript
interface ColumnConfig {
  id: string;                    // Column identifier (matches DB field)
  label: string;                 // Display name
  visible: boolean;              // Show/hide
  width?: number;                // Fixed width in px (optional)
  minWidth?: number;             // Minimum width for resizing
  sortable: boolean;             // Can be sorted
  resizable: boolean;            // Can be resized
  pinned?: 'left' | 'right';     // Pin to edge (optional)
  formatter?: (value: any) => string;  // Custom display formatter
}

// Example configuration
const columns: ColumnConfig[] = [
  {
    id: 'bssid',
    label: 'BSSID',
    visible: true,
    width: 150,
    sortable: true,
    resizable: true,
    pinned: 'left',
    formatter: (val) => val.toUpperCase()
  },
  {
    id: 'ssid',
    label: 'SSID',
    visible: true,
    minWidth: 100,
    sortable: true,
    resizable: true,
    formatter: (val) => val || '<hidden>'
  },
  {
    id: 'signal_dbm',
    label: 'Signal',
    visible: true,
    width: 100,
    sortable: true,
    resizable: true,
    formatter: (val) => `${val} dBm`
  },
  // ... etc
];
```

### 3. Infinite Scroll with Lazy Loading

#### Virtual Scrolling Architecture
```
Database: 2.5M networks
              ↓
┌─────────────────────────────────────┐
│ Viewport (visible rows)             │
│ ┌─────────────────────────────────┐ │
│ │ Row 1500: AA:BB:CC ... -45 dBm  │ │ ← Rendered
│ │ Row 1501: DD:EE:FF ... -67 dBm  │ │ ← Rendered
│ │ Row 1502: GG:HH:II ... -52 dBm  │ │ ← Rendered
│ │ Row 1503: JJ:KK:LL ... -71 dBm  │ │ ← Rendered
│ │ Row 1504: MM:NN:OO ... -48 dBm  │ │ ← Rendered
│ │ Row 1505: PP:QQ:RR ... -63 dBm  │ │ ← Rendered
│ │ ...                              │ │
│ └─────────────────────────────────┘ │
│ [▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]  │ ← Scrollbar (0.06% of total)
└─────────────────────────────────────┘

Only ~50 rows rendered at once
Remaining 2,499,950 rows: Virtualized (not in DOM)
```

#### Pagination Strategy
```typescript
interface InfiniteScrollConfig {
  pageSize: number;              // Rows per fetch (e.g., 100)
  overscan: number;              // Extra rows to buffer (e.g., 20)
  prefetchThreshold: number;     // When to fetch next page (e.g., 80%)
  debounceMs: number;            // Scroll event debounce (e.g., 150ms)
}

// Example flow
const config: InfiniteScrollConfig = {
  pageSize: 100,
  overscan: 20,
  prefetchThreshold: 0.8,
  debounceMs: 150
};

// User scrolls down...
// At row 80 of 100: Trigger prefetch of rows 101-200
// Rows 0-120 stay in memory (current + overscan)
// Rows 121+ not yet loaded
```

#### Cursor-Based Pagination (For Sorted Data)
```typescript
// Request 1: Initial load
GET /api/explorer/networks?limit=100&sort=ssid:asc,signal_dbm:desc

// Response
{
  data: [ /* 100 rows */ ],
  nextCursor: "eyJzc2lkIjoiWGZpbml0eSIsInNpZ25hbCI6LTY3fQ==",
  hasMore: true,
  totalEstimate: 2500000
}

// Request 2: User scrolls, load next page
GET /api/explorer/networks?limit=100&sort=ssid:asc,signal_dbm:desc&cursor=eyJ...

// Backend decodes cursor:
// { ssid: "Xfinity", signal: -67 }
// SQL: WHERE (ssid, signal_dbm) > ('Xfinity', -67)
//      ORDER BY ssid ASC, signal_dbm DESC
//      LIMIT 100
```

#### Debounced Scroll Handler
```typescript
function useInfiniteScroll(
  containerRef: React.RefObject<HTMLDivElement>,
  onLoadMore: () => void,
  config: InfiniteScrollConfig
) {
  const scrollHandler = useMemo(
    () =>
      debounce(() => {
        const container = containerRef.current;
        if (!container) return;

        const { scrollTop, scrollHeight, clientHeight } = container;
        const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

        if (scrollPercentage >= config.prefetchThreshold) {
          onLoadMore();
        }
      }, config.debounceMs),
    [containerRef, onLoadMore, config]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', scrollHandler);
    return () => container.removeEventListener('scroll', scrollHandler);
  }, [containerRef, scrollHandler]);
}
```

### 4. Performance Optimizations

#### Row Virtualization (react-window or react-virtual)
```typescript
import { VariableSizeList } from 'react-window';

function NetworksTable({ data, columns }: Props) {
  const rowHeights = useRef<Record<number, number>>({});

  const getRowHeight = (index: number) => {
    return rowHeights.current[index] || 40; // Default 40px
  };

  return (
    <VariableSizeList
      height={600}
      itemCount={data.length}
      itemSize={getRowHeight}
      width="100%"
      overscanCount={20}
    >
      {({ index, style }) => (
        <NetworkRow
          key={data[index].bssid}
          network={data[index]}
          columns={columns}
          style={style}
        />
      )}
    </VariableSizeList>
  );
}
```

#### Memoized Row Components
```typescript
const NetworkRow = React.memo(
  ({ network, columns, style }: NetworkRowProps) => {
    return (
      <div style={style} className="network-row">
        {columns.map(col =>
          col.visible ? (
            <div key={col.id} className="cell" style={{ width: col.width }}>
              {col.formatter ? col.formatter(network[col.id]) : network[col.id]}
            </div>
          ) : null
        )}
      </div>
    );
  },
  // Only re-render if network data or visible columns change
  (prevProps, nextProps) =>
    prevProps.network.bssid === nextProps.network.bssid &&
    prevProps.columns === nextProps.columns
);
```

#### Backend Query Optimization
```sql
-- Index for multi-column sort
CREATE INDEX idx_networks_multi_sort
ON app.networks (ssid ASC, type DESC, signal_dbm DESC)
WHERE ssid IS NOT NULL;

-- Covering index for common column selections
CREATE INDEX idx_networks_covering
ON app.networks (bssid, ssid, type, signal_dbm, threat_score, first_seen, last_seen);

-- Partial index for high-threat networks (frequently filtered)
CREATE INDEX idx_networks_threats
ON app.networks (threat_score DESC, ssid)
WHERE threat_score >= 40;
```

#### Data Caching Strategy
```typescript
// Cache configuration
const queryCache = new Map<string, CachedResult>();

interface CachedResult {
  data: NetworkRow[];
  cursor: string | null;
  timestamp: number;
  ttl: number; // Time to live in ms
}

function getCacheKey(params: QueryParams): string {
  return JSON.stringify({
    sort: params.sort,
    filter: params.filter,
    columns: params.columns,
    cursor: params.cursor
  });
}

// Usage
async function fetchNetworks(params: QueryParams): Promise<NetworksResponse> {
  const cacheKey = getCacheKey(params);
  const cached = queryCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return { data: cached.data, cursor: cached.cursor, fromCache: true };
  }

  const response = await api.get('/api/explorer/networks', { params });

  queryCache.set(cacheKey, {
    data: response.data,
    cursor: response.nextCursor,
    timestamp: Date.now(),
    ttl: 5 * 60 * 1000 // 5 minutes
  });

  return response;
}
```

### 5. User Interaction Patterns

#### Keyboard Shortcuts
```
Sorting:
- Click header: Sort by column (toggle asc/desc)
- Shift+Click: Add to multi-sort
- Alt+Click: Remove from multi-sort

Column Management:
- Ctrl+Shift+C: Open column selector
- Ctrl+Shift+R: Reset to default columns

Navigation:
- ↑/↓: Navigate rows
- Page Up/Down: Jump page
- Home/End: Jump to top/bottom
- Space: Select/deselect row
- Ctrl+A: Select all (current page)

Other:
- Ctrl+F: Focus search (if filters enabled)
- Escape: Clear selection
```

#### Context Menu (Right-Click)
```
┌─────────────────────────────────────┐
│ Copy BSSID                          │
│ Copy Row as JSON                    │
│ ─────────────────────────────       │
│ Show on Map                         │
│ View Details                        │
│ View Timeline                       │
│ ─────────────────────────────       │
│ Tag as Threat                       │
│ Tag as Legitimate                   │
│ Tag as False Positive               │
│ ─────────────────────────────       │
│ Export Selected (CSV)               │
│ Export Visible Columns (JSON)       │
└─────────────────────────────────────┘
```

### 6. Export Functionality

#### Export Options
```typescript
interface ExportConfig {
  format: 'csv' | 'json' | 'xlsx';
  scope: 'visible' | 'selected' | 'all' | 'filtered';
  columns: 'visible' | 'all';
  maxRows?: number;               // Limit for safety
}

// Examples
const exportConfigs = [
  {
    format: 'csv',
    scope: 'visible',              // Current viewport rows
    columns: 'visible',            // Only visible columns
  },
  {
    format: 'json',
    scope: 'selected',             // User-selected rows
    columns: 'all',                // All available columns
  },
  {
    format: 'xlsx',
    scope: 'filtered',             // All rows matching current filter
    columns: 'visible',
    maxRows: 100000,               // Safety limit
  }
];
```

#### Streaming Export (Large Datasets)
```typescript
async function streamExport(config: ExportConfig): Promise<void> {
  const stream = await api.getStream('/api/explorer/export', { params: config });

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const blob = new Blob(chunks, {
    type: config.format === 'csv' ? 'text/csv' : 'application/json'
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `networks_export_${Date.now()}.${config.format}`;
  a.click();
  URL.revokeObjectURL(url);
}
```

## API Contract

### GET /api/explorer/networks

#### Request Parameters
```typescript
interface NetworksQueryParams {
  // Pagination
  limit?: number;                // Rows per page (default: 100, max: 1000)
  cursor?: string;               // Cursor for next page (base64)

  // Sorting (multi-column)
  sort?: string[];               // ['ssid:asc', 'signal_dbm:desc']

  // Column selection
  columns?: string[];            // ['bssid', 'ssid', 'type', 'signal_dbm']
                                 // Default: standard preset

  // Filtering (from global filter system)
  filter?: string;               // Base64-encoded filter object

  // Export mode
  export?: 'csv' | 'json';       // If present, return full export
}
```

#### Response Format
```typescript
interface NetworksResponse {
  data: NetworkRow[];            // Requested rows
  meta: {
    cursor?: string;             // Next page cursor
    hasMore: boolean;            // More data available
    totalEstimate?: number;      // Approximate total (expensive to compute)
    queryTime: number;           // Query execution time (ms)
    columns: string[];           // Actual columns returned
  };
}

// Example response
{
  "data": [
    {
      "bssid": "AA:BB:CC:DD:EE:FF",
      "ssid": "Airport WiFi",
      "type": "W",
      "signal_dbm": -45,
      "threat_score": 15,
      "first_seen": "2025-12-01T10:00:00Z",
      "last_seen": "2025-12-11T14:30:00Z"
    },
    // ... 99 more rows
  ],
  "meta": {
    "cursor": "eyJzc2lkIjoiWGZpbml0eSIsInNpZ25hbCI6LTY3fQ==",
    "hasMore": true,
    "totalEstimate": 2500000,
    "queryTime": 45,
    "columns": ["bssid", "ssid", "type", "signal_dbm", "threat_score", "first_seen", "last_seen"]
  }
}
```

### Backend SQL Generation

```typescript
function buildNetworksQuery(params: NetworksQueryParams): { sql: string; values: any[] } {
  let sql = 'SELECT';

  // Column selection
  const columns = params.columns?.join(', ') || 'bssid, ssid, type, signal_dbm, threat_score, first_seen, last_seen';
  sql += ` ${columns} FROM app.networks`;

  // WHERE clause (from filters)
  const { whereClause, values } = buildWhereClause(params.filter);
  if (whereClause) {
    sql += ` WHERE ${whereClause}`;
  }

  // Cursor pagination
  if (params.cursor) {
    const cursorData = decodeCursor(params.cursor);
    const cursorConditions = buildCursorConditions(cursorData, params.sort);
    sql += whereClause ? ` AND ${cursorConditions}` : ` WHERE ${cursorConditions}`;
  }

  // ORDER BY (multi-column sort)
  if (params.sort && params.sort.length > 0) {
    const orderClauses = params.sort.map(s => {
      const [col, dir] = s.split(':');
      return `${col} ${dir.toUpperCase()}`;
    });
    sql += ` ORDER BY ${orderClauses.join(', ')}`;
  }

  // LIMIT
  sql += ` LIMIT ${Math.min(params.limit || 100, 1000)}`;

  return { sql, values };
}
```

## Implementation Checklist

### Phase 1: Core Table
- [ ] Implement virtual scrolling (react-window)
- [ ] Row rendering with memoization
- [ ] Basic column configuration
- [ ] Single-column sort

### Phase 2: Advanced Sorting
- [ ] Multi-column sort UI
- [ ] Sort indicators in headers
- [ ] Shift+Click to add sorts
- [ ] Active sorts panel
- [ ] Backend multi-column ORDER BY

### Phase 3: Column Management
- [ ] Column visibility selector
- [ ] Column presets (minimal, standard, all, etc.)
- [ ] Resizable columns
- [ ] Pinned columns (left/right)
- [ ] Save column preferences to localStorage

### Phase 4: Infinite Scroll
- [ ] Debounced scroll handler
- [ ] Cursor-based pagination
- [ ] Prefetching next page
- [ ] Loading indicators
- [ ] Error handling and retry

### Phase 5: Performance
- [ ] Query result caching
- [ ] Database index optimization
- [ ] Row virtualization tuning
- [ ] Lazy column rendering
- [ ] Request deduplication

### Phase 6: Export
- [ ] CSV export
- [ ] JSON export
- [ ] Streaming for large datasets
- [ ] Export visible vs all columns
- [ ] Export selected rows

---

**Status**: Specification Complete
**Priority**: High (Core Feature)
**Complexity**: High
**Dependencies**: Global filter system, Backend API
**Estimated Effort**: 1-2 weeks
