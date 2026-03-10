#!/bin/bash
# One-command reseed — run after any DB wipe
# Usage: cd server && bash prisma/seed-all.sh

set -e
echo "🔄 Reseeding entire database..."

cd "$(dirname "$0")/.."

node prisma/seed-real.js
node prisma/update-clients.js
node prisma/enrich-clients.js
node prisma/seed-content.js
node prisma/seed-invoices.js
node prisma/seed-team.js
node prisma/fix-health.js

echo ""
echo "✅ Full reseed complete!"
echo "   Clear browser localStorage: localStorage.removeItem('2fly-clients')"
