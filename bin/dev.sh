#!/usr/bin/env bash
# One command to bring the Hack Smarter Labs range up locally.
#
# The range is a single static app: ui/ served on 8777. There is no portal,
# no login, no curriculum — you land directly in the security workspace.
# Port 8777 is deliberately clear of the SC-200 lab (8765) and the academy
# portal/simulator pair (8768/8767) so all three can run side by side.
#
#   bin/dev.sh          start, print the URL
#   bin/dev.sh stop     stop
#   bin/dev.sh status   report what is listening
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RANGE_PORT=8777

is_up() {
  (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null && { exec 3>&-; return 0; } || return 1
}

serve() {
  local port="$1" dir="$2" name="$3"
  if is_up "$port"; then
    echo "  $name already up on $port"
    return
  fi
  # bin/serve.py rather than `python3 -m http.server`: same server, but with
  # caching disabled, so an edited views.js is never served stale alongside a
  # freshly added file. setsid+nohup so the server outlives this script and the
  # terminal that ran it.
  setsid nohup python3 "$ROOT/bin/serve.py" "$port" --bind 127.0.0.1 --directory "$dir" \
    >"$ROOT/.$name.log" 2>&1 </dev/null &
  echo $! >"$ROOT/.$name.pid"
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    is_up "$port" && break
    sleep 0.2
  done
  is_up "$port" && echo "  $name up on $port" || { echo "  $name FAILED to start" >&2; return 1; }
}

stop_one() {
  local name="$1" pidfile="$ROOT/.$1.pid"
  [ -f "$pidfile" ] || return 0
  local pid
  pid="$(cat "$pidfile")"
  # Only kill it if it is still the server we started — a recycled PID
  # belonging to something else must not be touched.
  if ps -o args= -p "$pid" 2>/dev/null | grep -qE 'bin/serve\.py|http\.server'; then
    kill "$pid" && echo "  stopped $name (pid $pid)"
  fi
  rm -f "$pidfile"
}

case "${1:-start}" in
  start)
    echo "Starting the Hack Smarter Labs range:"
    serve "$RANGE_PORT" "$ROOT/ui" range
    cat <<EOF2

  Range   http://127.0.0.1:$RANGE_PORT/

  No sign-in. The full environment is open from the first click:
  incidents, alerts, device timelines, hunting, email, vuln management.
EOF2
    ;;
  stop)
    echo "Stopping:"
    stop_one range
    ;;
  status)
    is_up "$RANGE_PORT" && echo "  range  UP    ($RANGE_PORT)" || echo "  range  down  ($RANGE_PORT)"
    ;;
  *)
    echo "usage: bin/dev.sh [start|stop|status]" >&2
    exit 64
    ;;
esac
