#!/bin/bash
# Whole-lab mechanical QA: syntax, no-404 invariant, render every view,
# vendor-terminology leak check.
# Usage: bin/qa-sweep.sh   — appends a dated entry to docs/QA_LOG.md
set -u
LAB="$(cd "$(dirname "$0")/.." && pwd)"
FAILED=0
for f in data.js helpdesk-data.js lab-widgets.js views.js app.js helpdesk.js neutral-terminology.js; do
  node --check "$LAB/ui/$f" || { echo "SYNTAX FAIL: $f"; FAILED=1; }
done
OUT=$(node "$LAB/bin/render_all.js") || FAILED=1
echo "$OUT"
NEUTRAL_OUT=$(node "$LAB/bin/neutral-check.js") || FAILED=1
echo "$NEUTRAL_OUT"
{
  echo "## qa-sweep — $(date -Is)"
  echo '```'
  echo "$OUT"
  echo
  echo "$NEUTRAL_OUT"
  echo '```'
  echo "- Result: $([ $FAILED -eq 0 ] && echo '**CLEAN**' || echo '**FAILURES — see above**')"
  echo
} >> "$LAB/docs/QA_LOG.md"
exit $FAILED
