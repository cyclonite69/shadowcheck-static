#!/bin/sh
# Fold CHANGELOG + LOC metrics into the commit just created (post-commit).
# Amending in pre-push does not work — git push has already resolved refs by then.
set -e

npm run changelog
git add CHANGELOG.md
npm run metrics
git add docs/metrics/lines-of-code.md

if git diff --cached --quiet; then
  exit 0
fi

# Avoid recursive hook invocation when the amend runs.
HUSKY=0 git commit --amend --no-edit --no-verify
