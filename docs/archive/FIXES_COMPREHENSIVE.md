# Comprehensive Fixes for ShadowCheck

## Summary
All critical configuration issues resolved. Port standardized to 3001. Security and code quality improvements documented below.

---

## 1. Configuration & Environment Issues ✅

### ✅ High: Port Standardization (COMPLETED)
**Status:** Fixed - All files now use port 3001

**Changes Made:**
- `.env`: PORT=3001
- `server.js`: Default port changed from 3000 to 3001
- `README.md`: Updated references from 3000 to 3001
- Test files already use dynamic port detection

**Files Changed:**
- `.env`
- `server.js` (line 14)
- `README.md` (lines 59, 83)

### ✅ Medium: Mapbox Token (NO ACTION NEEDED)
**Status:** Already configured with valid token
- Token present in `geospatial.html` line 1729
- TODO comment exists for future API-based token delivery

### 🔧 Low: Hardcoded Timestamp Filter
**Current:** MIN_VALID_TIMESTAMP = 946684800000 (Jan 1, 2000)
**Recommendation:** Move to .env if needed, but current value is reasonable for filtering invalid data

---

## 2. Security & Privacy Issues 🔒

### 🔴 High: No Authentication on API Endpoints
**Issue:** All API endpoints are publicly accessible

**Minimal Fix (Add to server.js after line 30):**

```javascript
// Simple API key middleware
const API_KEY = process.env.API_KEY || 'dev-key-change-in-production';

function requireAuth(req, res, next) {
  const key = req.headers['x-api-key'];
  if (key !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Apply to sensitive endpoints
app.post('/api/tag-network', requireAuth, async (req, res, next) => {
  // existing handler
});

app.post('/api/ml/train', requireAuth, async (req, res, next) => {
  // existing handler
});
```

**Add to .env:**
```
API_KEY=your-secure-random-key-here
```

### 🟡 Medium: No HTTPS
**Recommendation:** Deploy behind nginx/Caddy with SSL
**Quick Fix:** Use Caddy reverse proxy:
```
caddy reverse-proxy --from shadowcheck.local --to localhost:3001
```

### 🟡 Medium: BSSID Validation
**Current:** Basic MAC address format check exists
**Enhancement:** Add to server.js validation functions:

```javascript
function sanitizeBSSID(bssid) {
  if (!bssid || typeof bssid !== 'string') return null;
  // Only allow valid MAC format
  const cleaned = bssid.trim().toUpperCase();
  if (!/^[0-9A-F]{2}(:[0-9A-F]{2}){5}$/.test(cleaned)) return null;
  return cleaned;
}
```

### 🟢 Low: Debug Logging
**Current:** errorHandler.js includes stack traces
**Fix:** Already conditional on NODE_ENV

---

## 3. Bugs & Functional Issues 🐛

### 🔴 High: Unused Scripts in index.html
**Issue:** Mapbox/Chart.js loaded but not used on dashboard

**Fix (index.html):**
Remove unused script tags or add comment:
```html
<!-- Mapbox/Chart.js loaded for future dashboard enhancements -->
```

### 🟡 Medium: Error Handling in Fetches
**Pattern to add to all fetch calls:**

```javascript
async function fetchWithFeedback(url, options = {}) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    showError(`Failed to load data: ${err.message}`);
    throw err;
  }
}

function showError(msg) {
  const el = document.getElementById('error-banner');
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
  }
}
```

### 🟢 Low: Nav Highlighting
**Recommendation:** Extract to shared.js:

```javascript
// shared.js
function highlightCurrentNav() {
  const path = window.location.pathname;
  document.querySelectorAll('nav a').forEach(a => {
    if (a.getAttribute('href') === path) {
      a.classList.add('active');
    }
  });
}
```

### 🟢 Low: Infinite Scroll Debounce
**Add to networks.html scroll handler:**

```javascript
let scrollTimeout;
window.addEventListener('scroll', () => {
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
      loadMore();
    }
  }, 100);
});
```

---

## 4. Performance & Scalability Issues ⚡

### 🟡 Medium: Client-Side Filtering
**Current:** Works for <5000 records
**Future:** Implement virtual scrolling if dataset grows
**Library Recommendation:** `virtual-scroller` or `react-window`

### 🟡 Medium: Duplicated CSS
**Recommendation:** Extract common styles to `/public/styles.css`

**Common styles to extract:**
```css
/* Base theme colors */
:root {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --text-primary: #f8fafc;
  --accent: #8b5cf6;
}
```

### 🟢 Low: Caching Headers
**Add to server.js static file serving:**

```javascript
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1h',
  etag: true
}));
```

### 🟢 Low: Inline Scripts
**Status:** Acceptable for current project size
**Future:** Split when files exceed 1000 lines

---

## 5. Code Quality & Maintainability Issues 📝

### 🟡 Medium: Monolithic server.js
**Recommendation:** Refactor when adding new features

**Suggested structure:**
```
/routes
  - networks.js
  - threats.js
  - analytics.js
  - ml.js
/middleware
  - auth.js
  - errorHandler.js
/utils
  - db.js
  - validation.js
```

### 🟡 Medium: Undocumented ML Endpoints
**Fix:** Add to CLAUDE.md API section:

```markdown
### ML Endpoints
- `POST /api/ml/train` - Train model on tagged networks (requires 10+ tagged)
- `GET /api/ml/status` - Get model training status and tagged network counts
- `GET /api/ml/predict/:bssid` - Get ML prediction for specific network
```

### 🟢 Low: Magic Numbers
**Extract to config object in server.js:**

```javascript
const CONFIG = {
  THREAT_THRESHOLD: 40,
  MIN_VALID_TIMESTAMP: 946684800000,
  MAX_PAGE_SIZE: 5000,
  DEFAULT_PAGE_SIZE: 50,
  RATE_LIMIT_WINDOW: 15 * 60 * 1000,
  RATE_LIMIT_MAX: 1000
};
```

### 🟢 Low: JSDoc Type Checking
**Add to key functions:**

```javascript
/**
 * Calculate threat score for a network
 * @param {Object} network - Network data
 * @param {number} network.distance_range_km - Distance range
 * @param {number} network.unique_days - Days observed
 * @returns {number} Threat score 0-100
 */
function calculateThreatScore(network) {
  // implementation
}
```

---

## 6. Documentation & Testing Issues 📚

### 🟡 Medium: Outdated Line References
**Fix:** Use git-style references in CLAUDE.md:

```markdown
Instead of: "See server.js:1733"
Use: "See server.js `app.listen()` section"
```

### 🟢 Low: No Automated Tests
**Minimal test setup:**

```bash
npm install --save-dev jest supertest
```

**Create `tests/threat-scoring.test.js`:**

```javascript
const { calculateThreatScore } = require('../server');

describe('Threat Scoring', () => {
  test('high distance range increases score', () => {
    const network = {
      distance_range_km: 50,
      unique_days: 5,
      observation_count: 10,
      max_signal: -60,
      unique_locations: 3,
      seen_at_home: true,
      seen_away_from_home: true
    };
    const score = calculateThreatScore(network);
    expect(score).toBeGreaterThan(30);
  });
});
```

### 🟢 Low: Copyright Year
**Fix in all HTML files:**

```javascript
// Add to footer
document.querySelector('footer').innerHTML = 
  `© ${new Date().getFullYear()} ShadowCheck`;
```

---

## Deployment Steps

### Immediate (Already Done):
1. ✅ Port standardized to 3001
2. ✅ Server.js syntax validated
3. ✅ .env configured

### Recommended Next Steps:
1. Add API key authentication (5 min)
2. Extract common CSS (15 min)
3. Add error feedback UI (10 min)
4. Update CLAUDE.md with ML endpoints (5 min)
5. Add caching headers (2 min)

### Future Enhancements:
1. Refactor server.js into modules
2. Add Jest tests
3. Implement HTTPS via reverse proxy
4. Virtual scrolling for large datasets

---

## Testing Commands

```bash
# Test server starts
node server.js

# Test API endpoints
curl http://localhost:3001/api/dashboard-metrics
curl http://localhost:3001/api/networks?page=1&limit=10
curl http://localhost:3001/api/threats/quick?page=1&limit=10

# Test ML training
curl -X POST http://localhost:3001/api/ml/train

# Test with API key (after implementing auth)
curl -H "x-api-key: your-key" -X POST http://localhost:3001/api/ml/train
```

---

## Summary of Changes

**Completed:**
- ✅ Port configuration standardized to 3001
- ✅ All config files updated
- ✅ No syntax errors

**Documented for Implementation:**
- 🔒 Security: API key auth pattern
- 🐛 Bug fixes: Error handling patterns
- ⚡ Performance: Caching and CSS extraction
- 📝 Code quality: Refactoring recommendations
- 📚 Documentation: ML endpoints, testing setup

**Priority Order:**
1. High: API authentication (security)
2. Medium: Error feedback UI (UX)
3. Medium: Update documentation (maintainability)
4. Low: Extract CSS, add tests (code quality)

All fixes maintain backward compatibility and require no new dependencies except optional Jest for testing.
