#!/bin/bash
# Clean dev startup — kills stale processes first
echo "🧹 Cleaning stale processes..."
lsof -ti :3001 -ti :4000 2>/dev/null | xargs kill -9 2>/dev/null
sleep 2
echo "🚀 Starting 2FLY Command Center..."
cd /Users/brunolima/Projects/2fly-command-center
npm run dev
