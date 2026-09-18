#!/usr/bin/env sh
# Run `npm audit` at the configured severity level, but fail the build only for
# advisories NEW on this branch relative to origin/main. Advisories that are
# already present on origin/main never fail the build (they are tracked by
# dependency-override tickets, not by every PR's diff), and doc-only/config
# PRs that leave package-lock.json untouched bypass the severity gate entirely.
#
# npm's audit endpoint is being retired and intermittently returns
# "503 Service Unavailable" / "audit endpoint returned an error", which
# previously broke CI on main even though no dependency was vulnerable.
# Transient registry/service errors are retried and, after MAX_ATTEMPTS,
# skipped without failing CI.
set -eu

AUDIT_LEVEL="${AUDIT_LEVEL:-high}"
MAX_ATTEMPTS="${AUDIT_MAX_ATTEMPTS:-3}"

# Markers that identify a transient registry/service failure (as opposed to a
# real advisory finding, whose report never contains these strings).
TRANSIENT='audit endpoint returned an error|Service Unavailable|Bad Gateway|Gateway Time-?out|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|network timeout|request to .* failed'

# Emit the normalized advisory key set for `npm audit --json` output read from
# stdin: one "package GHSA-... (severity)" line per advisory at or above
# AUDIT_LEVEL, sorted and de-duplicated. See npm-audit-keys.js.
advisory_keys() {
  node "$(dirname "$0")/npm-audit-keys.js" "$AUDIT_LEVEL"
}

# actions/checkout clones with --depth=1 (single branch) by default, so
# origin/main is usually absent in CI; fetch it. When it genuinely cannot be
# resolved, fall back to the legacy gate (fail on any advisory at/above the
# configured level).
if ! git rev-parse --verify -q refs/remotes/origin/main >/dev/null 2>&1; then
  if ! git fetch --depth=1 origin main:refs/remotes/origin/main >/dev/null 2>&1; then
    echo "npm audit: cannot resolve origin/main; falling back to legacy severity gate." >&2
    LEGACY_GATE=1
  fi
fi

# A PR whose diff leaves package-lock.json untouched cannot have changed the
# dependency tree (npm ci is lockfile-driven), so the severity gate has nothing
# to decide: skip the audit entirely for these doc/config PRs.
if [ -z "${LEGACY_GATE:-}" ] && git diff --quiet origin/main -- package-lock.json; then
  echo "npm audit: package-lock.json unchanged vs origin/main; skipping severity gate."
  exit 0
fi

# Audit origin/main's lockfile in a scratch dir to obtain the baseline advisory
# set; the current working tree is left untouched.
BASELINE_KEYS=""
if [ -z "${LEGACY_GATE:-}" ]; then
  tmpdir="$(mktemp -d)"
  trap 'rm -rf "$tmpdir"' EXIT HUP INT TERM
  if ! git show origin/main:package.json >"$tmpdir/package.json" 2>/dev/null \
     || ! git show origin/main:package-lock.json >"$tmpdir/package-lock.json" 2>/dev/null; then
    echo "npm audit: origin/main lockfile unavailable; falling back to legacy severity gate." >&2
    LEGACY_GATE=1
  fi

  attempt=1
  while [ -z "${LEGACY_GATE:-}" ] && [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
    status=0
    output="$(cd "$tmpdir" && npm audit --audit-level="$AUDIT_LEVEL" --json 2>&1)" || status=$?
    if [ "$status" -eq 0 ] || ! printf '%s\n' "$output" | grep -Eiq "$TRANSIENT"; then
      BASELINE_KEYS="$(printf '%s\n' "$output" | advisory_keys)" || BASELINE_KEYS=""
      break
    fi
    echo "npm audit: baseline (origin/main, attempt ${attempt}/${MAX_ATTEMPTS}) transient registry error." >&2
    attempt=$((attempt + 1))
  done
  if [ "$attempt" -gt "$MAX_ATTEMPTS" ]; then
    echo "npm audit: cannot audit origin/main after ${MAX_ATTEMPTS} attempts; falling back to legacy severity gate." >&2
    LEGACY_GATE=1
  fi
fi

# Audit the current tree with the same transient-retry policy as before; npm's
# exit code distinguishes "no vulnerabilities at/above level" from "found".
attempt=1
status=0
while :; do
  status=0
  output="$(npm audit --audit-level="$AUDIT_LEVEL" --json 2>&1)" || status=$?
  if [ "$status" -eq 0 ] || ! printf '%s\n' "$output" | grep -Eiq "$TRANSIENT"; then
    break
  fi
  echo "npm audit: transient registry error (attempt ${attempt}/${MAX_ATTEMPTS}, exit ${status})." >&2
  attempt=$((attempt + 1))
  if [ "$attempt" -gt "$MAX_ATTEMPTS" ]; then
    echo "npm audit: registry audit endpoint unavailable after ${MAX_ATTEMPTS} attempts; skipping without failing CI." >&2
    exit 0
  fi
done

printf '%s\n' "$output"

CURRENT_KEYS="$(printf '%s\n' "$output" | advisory_keys)" || {
  echo "npm audit: could not parse audit report (exit ${status}); failing." >&2
  exit "${status:-1}"
}

# Legacy mode (no origin/main baseline): keep the original behavior of failing
# the build on any advisory at/above the configured level.
if [ -n "${LEGACY_GATE:-}" ]; then
  [ "$status" -eq 0 ] || exit "${status:-1}"
  exit 0
fi

# Fail only on advisories present now but absent from origin/main.
if [ -n "$CURRENT_KEYS" ]; then
  printf '%s\n' "$CURRENT_KEYS" >"$tmpdir/current.keys"
else
  : >"$tmpdir/current.keys"
fi
if [ -n "$BASELINE_KEYS" ]; then
  printf '%s\n' "$BASELINE_KEYS" >"$tmpdir/baseline.keys"
else
  : >"$tmpdir/baseline.keys"
fi
if comm -23 "$tmpdir/current.keys" "$tmpdir/baseline.keys" | grep -q .; then
  echo "npm audit: NEW advisories on this branch, not present on origin/main:" >&2
  comm -23 "$tmpdir/current.keys" "$tmpdir/baseline.keys" >&2
  exit 1
fi

echo "npm audit: no new advisories vs origin/main."
exit 0
