#!/bin/bash
cd /Users/brunolima/Projects/2fly-command-center/server
set -a
source .env 2>/dev/null
set +a
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
exec /opt/homebrew/bin/npx tsx src/index.ts
