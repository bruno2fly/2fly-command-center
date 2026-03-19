#!/bin/bash
cd /Users/brunolima/Projects/2fly-command-center/client
set -a
source ../.env 2>/dev/null
source .env.local 2>/dev/null
set +a
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
exec /opt/homebrew/bin/npx next dev -p 3001
