#!/bin/bash
# Vercel Ignored Build Step Script
# DEV_MODE: Set to true during active development to unblock all builds.
# Set to false when ready for final release to conserve build minutes.

DEV_MODE=true

if [ "$DEV_MODE" = true ]; then
  echo "Development stage active: bypassing all build checks and deploying unconditionally."
  exit 1
fi

echo "Release stage active: evaluating build necessity for Vercel Free Tier..."

if ! git rev-parse HEAD^ >/dev/null 2>&1; then
  echo "Initial commit or shallow clone without parent detected. Proceeding with build."
  exit 1
fi

git diff --quiet HEAD^ HEAD -- index.html service-worker.js js/ css/ assets/
DIFF_STATUS=$?

if [ $DIFF_STATUS -eq 0 ]; then
  echo "No changes detected in deployable runtime assets."
  echo "Cancelling build to conserve Vercel Free Tier build minutes."
  exit 0
else
  echo "Deployable runtime code changes detected. Proceeding with build."
  exit 1
fi
