#!/bin/bash
# Enable performance tracking and run filter diagnostics
# This will log query plans and execution times to help identify slow filters

echo "🔍 Filter Performance Diagnostic System"
echo ""

# Step 1: Enable performance tracking
echo "1. Enabling query performance tracking..."
export TRACK_QUERY_PERFORMANCE=true

# Step 2: Run comprehensive filter tests
echo "2. Running filter test suite..."
./scripts/test-all-filters.sh "$@" | tee /tmp/filter-test-results.txt

# Step 3: Analyze results
echo ""
echo "3. Analyzing results..."
echo ""

PASSED=$(grep "✅" /tmp/filter-test-results.txt | wc -l)
FAILED=$(grep "❌" /tmp/filter-test-results.txt | wc -l)
WARNINGS=$(grep "⚠️" /tmp/filter-test-results.txt | wc -l)

echo "Results Summary:"
echo "  ✅ Passed: $PASSED"
echo "  ❌ Failed: $FAILED"
echo "  ⚠️  Warnings: $WARNINGS"
echo ""

if [ $FAILED -gt 0 ]; then
    echo "Failed filters:"
    grep "❌" /tmp/filter-test-results.txt
    echo ""
fi

# Step 4: Check server logs for slow queries
echo "4. Checking for slow queries (>1000ms)..."
echo "   (Check Docker logs: docker logs shadowcheck_api --tail 100 | grep 'Query took')"
echo ""

echo "✅ Diagnostic complete. Results saved to /tmp/filter-test-results.txt"
