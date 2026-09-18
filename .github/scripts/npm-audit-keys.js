#!/usr/bin/env node
// Read `npm audit --json` output from stdin and print one normalized advisory
// key line ("package GHSA-... (severity)") per advisory at or above the
// configured audit level (argv[2]), sorted and de-duplicated. The npm audit
// gate (npm-audit.sh) diffs these key sets between the current branch and
// origin/main to fail only on NEW advisories.
const levels = { low: 0, moderate: 1, high: 2, critical: 3 };
const auditLevel = process.argv[2];
const minLevel = levels[auditLevel];
if (minLevel === undefined) {
  console.error(`npm-audit: unknown audit level '${auditLevel}'`);
  process.exit(2);
}
let data = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (data += c));
process.stdin.on("end", () => {
  let report;
  try {
    report = JSON.parse(data);
  } catch {
    console.error("npm-audit: audit output was not valid JSON");
    process.exit(2);
  }
  const keys = new Set();
  for (const [name, vuln] of Object.entries(report.vulnerabilities || {})) {
    for (const via of vuln.via || []) {
      if (typeof via !== "object" || !via.url || !via.severity) {
        continue;
      }
      if (levels[via.severity] < minLevel) {
        continue;
      }
      const match = /GHSA-[0-9A-Za-z-]+/.exec(via.url);
      if (match) {
        keys.add(`${name} ${match[0]} (${via.severity})`);
      }
    }
  }
  console.log([...keys].sort().join("\n"));
});
