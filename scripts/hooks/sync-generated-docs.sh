#!/bin/sh
# Fold CHANGELOG + LOC metrics into the commit just created (post-commit).
# Amending in pre-push does not work — git push has already resolved refs by then.
set -e

if [ "${GENERATED_DOCS_AMEND:-}" = "1" ]; then
  exit 0
fi

npm run changelog
git add CHANGELOG.md
npm run metrics
git add docs/metrics/lines-of-code.md

if git diff --cached --quiet; then
  exit 0
fi

# The environment flag prevents post-commit recursion. Normal hooks still run.
GENERATED_DOCS_AMEND=1 git commit --amend --no-edit
