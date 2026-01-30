# KEPLER.GL RENDERING RULES - NEVER VIOLATE THESE

## CRITICAL RULE: NO ARTIFICIAL LIMITS

- Kepler.gl can handle MILLIONS of data points efficiently
- NEVER add default limits to Kepler endpoints unless explicitly requested by user
- NEVER cap data for "performance reasons" - let Kepler handle the rendering
- Only apply limits when passed as query parameters by the user

## Affected Endpoints:

- `/api/kepler/data` - Network data points
- `/api/kepler/observations` - All observation points
- `/api/kepler/networks` - Trilaterated network locations

## Implementation Rules:

1. Use `limit` parameter ONLY when provided in query string
2. Set `limit = null` by default (no limit)
3. Let database and Kepler.gl handle large datasets
4. Use appropriate timeouts (120s) for large queries
5. Filter by user criteria, not arbitrary row counts

## Why This Matters:

- Kepler.gl is designed for big data visualization
- Artificial limits break the user experience
- Users need to see complete datasets for analysis
- Performance optimization should be done at database level, not data limiting

## Enforcement:

- Any PR that adds default limits to Kepler endpoints will be rejected
- Code reviews must check for artificial limiting
- This rule applies to ALL LLM assistants working on this codebase
