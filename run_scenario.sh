#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "=== defender-lab: suppression-rule scenario ==="
echo "Rule pins on BOTH file_name == scanner.exe AND sha256 == aaaa…aaaa"
echo
python3 defender.py
echo
cat <<'EOF'
--- Takeaway ---
Defender suppression conditions are joined with AND. After the vendor update
the binary's SHA256 changed, so the hash condition no longer matches the
detection event, the whole rule no longer matches, and the alert fires again.

Fixes typically taken:
  * Loosen the rule to a stable indicator (signing cert / publisher, or a
    known install path) instead of a brittle hash.
  * Add the new hash to the rule (or replace the old one) after each update.
  * Better: scope by certificate + path, not file name + hash, because file
    name alone is trivially spoofable (see WKS-03 in the run above).
EOF
