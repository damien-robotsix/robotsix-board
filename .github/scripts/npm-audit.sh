#!/usr/bin/env sh
# Run `npm audit` at the configured severity level, but do not fail the build
# when the npm registry audit endpoint is unavailable (5xx responses or network
# errors). Real advisories at or above the audit level still fail the build.
#
# npm's audit endpoint is being retired and intermittently returns
# "503 Service Unavailable" / "audit endpoint returned an error", which
# previously broke CI on main even though no dependency was vulnerable.
set -eu

AUDIT_LEVEL="${AUDIT_LEVEL:-high}"
MAX_ATTEMPTS="${AUDIT_MAX_ATTEMPTS:-3}"

# Markers that identify a transient registry/service failure (as opposed to a
# real advisory finding, whose report never contains these strings).
TRANSIENT='audit endpoint returned an error|Service Unavailable|Bad Gateway|Gateway Time-?out|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|network timeout|request to .* failed'

attempt=1
while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
  if output="$(npm audit --audit-level="$AUDIT_LEVEL" 2>&1)"; then
    printf '%s\n' "$output"
    exit 0
  else
    # Capture npm's exit code here: after `fi` the `if` statement itself
    # returns 0 when the condition is false, masking the real status.
    status=$?
  fi
  printf '%s\n' "$output"

  if printf '%s' "$output" | grep -Eiq "$TRANSIENT"; then
    echo "npm audit: transient registry error (attempt ${attempt}/${MAX_ATTEMPTS}, exit ${status})." >&2
    attempt=$((attempt + 1))
    continue
  fi

  # Non-transient failure => real vulnerabilities at/above the audit level.
  exit "$status"
done

echo "npm audit: registry audit endpoint unavailable after ${MAX_ATTEMPTS} attempts; skipping without failing CI." >&2
exit 0
