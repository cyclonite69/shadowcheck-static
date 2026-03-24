#!/bin/bash

# Load thresholds from JSON
THRESHOLDS_FILE="scripts/doc-line-count-thresholds.json"
FAILED=0

echo "=== Documentation Line Count Drift Check ==="
echo "------------------------------------------------------------"
printf "%-50s | %-10s | %-10s\n" "File" "Current" "Threshold"
echo "------------------------------------------------------------"

# Iterate over keys in JSON
for file in $(jq -r 'keys[]' "$THRESHOLDS_FILE"); do
  threshold=$(jq -r ".\"$file\"" "$THRESHOLDS_FILE")
  
  if [ ! -f "$file" ]; then
    echo "ERROR: File $file not found!"
    FAILED=1
    continue
  fi

  # wc -l includes the filename if you pass it as an argument, so use redirection
  current=$(wc -l < "$file" | tr -d ' ')
  
  if [ "$current" -gt "$threshold" ]; then
    printf "%-50s | \e[31m%-10s\e[0m | %-10s (FAIL)\n" "$file" "$current" "$threshold"
    FAILED=1
  else
    printf "%-50s | \e[32m%-10s\e[0m | %-10s (OK)\n" "$file" "$current" "$threshold"
  fi
done

echo "------------------------------------------------------------"

if [ $FAILED -ne 0 ]; then
  echo "FAILURE: One or more files exceed their modularity line-count threshold."
  echo "Please refactor monolithic files into smaller hooks or sub-components."
  exit 1
else
  echo "SUCCESS: All files within modularity bounds."
  exit 0
fi
