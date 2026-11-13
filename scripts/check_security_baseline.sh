#!/usr/bin/env bash
set -euo pipefail

tracked_files="$(git ls-files)"

if grep -E '(^|/)(\.env($|\.)|.*\.(key|pem|p12|pfx)$)' <<<"${tracked_files}" \
  | grep -vE '(^|/)\.env\.example$'; then
  echo "Tracked secret or credential file detected." >&2
  exit 1
fi

if git grep -nE \
  '(BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|AKIA[0-9A-Z]{16})' \
  -- ':!docs/references/**' ':!scripts/check_security_baseline.sh'; then
  echo "High-confidence credential pattern detected." >&2
  exit 1
fi

echo "Security baseline passed: no forbidden credential files or high-confidence key patterns."
