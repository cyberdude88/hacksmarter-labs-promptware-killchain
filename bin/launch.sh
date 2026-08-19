#!/usr/bin/env bash
# Launch the range from the dash icon: start the server, then open it.
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
URL="http://127.0.0.1:8777/"

"$ROOT/bin/dev.sh" start >>"$ROOT/.launch.log" 2>&1

xdg-open "$URL" >/dev/null 2>&1 || firefox "$URL" >/dev/null 2>&1 &
