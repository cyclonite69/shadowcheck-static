# Bug Report - ShadowCheck Project

**Scan Date:** 2025-11-23  
**Severity Levels:** 🔴 Critical | 🟡 Medium | 🟢 Low

---

## 🔴 CRITICAL BUGS

### 1. Missing Error Handler Parameter (`next`) in Multiple Routes
**File:** `server.js`  
**Lines:** 93, 208, 243, 276, 302, 375, 952, 1152, 1374, 1666

**Issue:** Several route handlers are missing the `next` parameter but call `next(err)` in their catch blocks, which will cause runtime errors.

**Affected Routes:**
- `/api/dashboard-metrics` (line 93)
- `/api/analytics/network-types` (line 208)
- `/api/analytics/signal-strength` (line 243)
- `/api/analytics/temporal-activity` (line 276)
- `/api/analytics/radio-type-over-time` (line 302)
- `/api/analytics/security` (line 375)
- `/api/threats/detect` (line 952)
- `/api/networks/observations/:bssid` (line 1152)
- `/api/manufacturer/:bssid` (line 1374)
- `/api/networks/search/:ssid` (line 1666)

**Example:**
```javascript
// WRONG - missing 'next' parameter
app.get('/api/dashboard-metrics', async (req, res) => {
  try {
    // ...
  } catch (err) {
    next(err); // ❌ ReferenceError: next is not defined
  }
});

// CORRECT
app.get('/api/dashboard-metrics', async (req, res, next) => {
  try {
    // ...
  } catch (err) {
    next(err); // ✅ Works correctly
  }
});
```

**Impact:** When errors occur in these routes, the application will crash with `ReferenceError: next is not defined` instead of gracefully handling the error.

---

## 🟡 MEDIUM BUGS

### 2. ML Model Coefficient Extraction Issue
**File:** `ml-trainer.js`  
**Lines:** 67-72

**Issue:** The code attempts to extract coefficients from `classifier.weights` but doesn't handle cases where the structure might be different or undefined.

```javascript
this.coefficients = classifier.weights ? Array.from(classifier.weights.to1DArray()) : [];
this.intercept = 0;
```

**Problems:**
- `intercept` is hardcoded to 0, which is incorrect for logistic regression
- No validation that `weights.to1DArray()` exists
- Silent failure with empty array if weights are missing

**Impact:** ML predictions will be inaccurate or fail silently.

---

### 3. SQL Injection Risk in Dynamic Query Building
**File:** `server.js`  
**Lines:** 302-370 (radio-type-over-time endpoint)

**Issue:** The `interval` variable is constructed using string interpolation from user input without proper validation:

```javascript
let interval = '30 days';
switch(range) {
  case '24h':
    interval = '24 hours';
    break;
  // ...
}

const whereClause = range === 'all'
  ? 'WHERE last_seen IS NOT NULL AND EXTRACT(EPOCH FROM last_seen) * 1000 >= $1'
  : `WHERE last_seen >= NOW() - INTERVAL '${interval}' AND ...`; // ⚠️ String interpolation
```

**Impact:** While the switch statement limits values, this pattern is risky and could lead to SQL injection if the switch cases are modified incorrectly.

---

### 4. Inconsistent Timestamp Validation
**File:** `server.js`  
**Lines:** Multiple locations

**Issue:** The `MIN_VALID_TIMESTAMP` constant (946684800000 = Jan 1, 2000) is used inconsistently:
- Some queries use it: `WHERE l.time >= $1` with `MIN_VALID_TIMESTAMP`
- Other queries don't validate timestamps at all
- No validation for future timestamps

**Impact:** Invalid or corrupted timestamp data could cause incorrect results or performance issues.

---

### 5. Missing Input Validation for BSSID Format
**File:** `server.js`  
**Lines:** 1224, 1344, 1374

**Issue:** BSSID validation regex doesn't account for lowercase hex digits consistently:

```javascript
if (!bssid || !/^[0-9A-F]{2}(:[0-9A-F]{2}){5}$/i.test(bssid)) {
```

The regex uses case-insensitive flag `/i` but the character class is uppercase only `[0-9A-F]`. While this works, it's inconsistent.

**Better approach:**
```javascript
if (!bssid || !/^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){5}$/.test(bssid)) {
```

---

## 🟢 LOW PRIORITY BUGS

### 6. Potential Memory Leak in Database Connection Pool
**File:** `server.js`  
**Lines:** 38-44

**Issue:** The database pool is created but never explicitly closed. While Node.js will clean this up on exit, it's better practice to handle graceful shutdown.

**Recommendation:** Add process signal handlers:
```javascript
process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});
```

---

### 7. Race Condition in ML Model Training
**File:** `server.js`  
**Lines:** 843-920

**Issue:** Multiple concurrent requests to `/api/ml/train` could cause race conditions when updating the `ml_model_config` table.

**Impact:** Low - training is typically done manually and infrequently.

---

### 8. Hardcoded Port Fallback
**File:** `server.js`  
**Line:** 13

```javascript
const port = process.env.PORT || 3001;
```

**Issue:** The README says the app runs on port 3000, but the code defaults to 3001.

**Impact:** Documentation inconsistency.

---

### 9. Missing Error Handling for Mapbox Token
**File:** `public/geospatial.html` (not scanned in detail)

**Issue:** If Mapbox token is invalid or missing, the map will fail to load with no user-friendly error message.

---

### 10. Unhandled Promise Rejection in Query Wrapper
**File:** `server.js`  
**Lines:** 50-66

**Issue:** The `query()` wrapper function retries transient errors but doesn't log the final failure before throwing.

**Recommendation:**
```javascript
} catch (error) {
  // ... retry logic ...
  if (isTransient && tries > 1) {
    // ... retry ...
  }
  console.error('Database query failed:', error.message); // Add this
  throw error;
}
```

---

## 🔧 RECOMMENDATIONS

### High Priority Fixes:
1. ✅ Add `next` parameter to all route handlers that use `next(err)`
2. ✅ Fix ML model coefficient extraction with proper error handling
3. ✅ Add comprehensive input validation for all user inputs

### Medium Priority:
4. Add graceful shutdown handlers for database pool
5. Add request ID logging for better debugging
6. Implement query timeout protection
7. Add rate limiting per user (not just per IP)

### Low Priority:
8. Update documentation to match actual port
9. Add comprehensive error messages for frontend
10. Add database connection health checks

---

## 📊 SUMMARY

- **Critical Bugs:** 1 (affecting 10 routes)
- **Medium Bugs:** 5
- **Low Priority:** 4
- **Total Issues:** 10

**Estimated Fix Time:** 2-4 hours for critical and medium issues

---

## 🔍 TESTING RECOMMENDATIONS

1. Add unit tests for error handling paths
2. Add integration tests for all API endpoints
3. Test with invalid/malicious inputs (fuzzing)
4. Load testing for concurrent ML training requests
5. Test database connection failure scenarios
