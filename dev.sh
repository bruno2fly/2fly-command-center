#!/bin/bash
# Clean dev startup — kills ALL stale processes on our ports first
echo "🧹 Cleaning stale processes..."

# Kill anything on our ports specifically
lsof -ti :3001 2>/dev/null | xargs kill -9 2>/dev/null
lsof -ti :4000 2>/dev/null | xargs kill -9 2>/dev/null

# Also kill any leftover node processes from this project
pkill -9 -f "next-server" 2>/dev/null
pkill -9 -f "tsx.*server" 2>/dev/null

sleep 2

# Verify ports are free
if lsof -i :3001 -i :4000 2>/dev/null | grep -q LISTEN; then
  echo "❌ Ports still in use! Run: kill -9 \$(lsof -ti :3001 :4000)"
  exit 1
fi

echo "✅ Ports free"
echo "🚀 Starting 2FLY Command Center..."
cd /Users/brunolima/Projects/2fly-command-center
exec npm run dev
