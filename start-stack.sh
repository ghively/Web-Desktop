#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

SERVERS=()

cleanup() {
  if [[ ${#SERVERS[@]} -gt 0 ]]; then
    echo ""
    echo "🛑 Stopping development servers..."
    for pid in "${SERVERS[@]}"; do
      kill "$pid" 2>/dev/null || true
    done
  fi
}

trap cleanup EXIT INT TERM

echo "🚀 Launching Web Desktop backend and frontend..."

npm run dev --prefix backend &
SERVERS+=("$!")

npm run dev --prefix frontend &
SERVERS+=("$!")

echo "✅ Backend: http://localhost:3001"
echo "✅ Frontend: http://localhost:5173"
echo "✅ Legacy frontend (served by backend): http://localhost:3001"
echo "Press Ctrl+C to stop both servers."

wait
