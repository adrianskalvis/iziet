#!/bin/sh
# Relay for sources whose Cloudflare refuses GitHub's servers (see pipeline/relay.ts).
#   1. Fetches them from this computer as IzietBot into data/relay.
#   2. Uploads the files to the "relay" release of the GitHub repo.
#   3. Starts a site run that refreshes only those sources, so the live site
#      has them within about 5 minutes.
# Needs the gh CLI signed in with write access to the repo.
set -eu
cd "$(dirname "$0")/.."

TAG=relay
echo "Relay run $(date '+%Y-%m-%d %H:%M')"
npx tsx pipeline/relay-run.ts
if ! gh release view "$TAG" >/dev/null 2>&1; then
	gh release create "$TAG" --prerelease --title "Relay data" \
		--notes "Event data for sources that refuse GitHub's servers, fetched from the owner's computer by scripts/relay.sh. The Site workflow reads it."
fi
gh release upload "$TAG" data/relay/*.json --clobber
gh workflow run site.yml --ref main -f only="$(npx tsx pipeline/relay-run.ts --ids)"
echo "Relay uploaded, site run started."
