Unbroke main CI, which was red on two independent counts: a high-severity
`js-yaml` advisory failing `npm audit --audit-level=high`, and a test suite that
had stopped loading entirely because fast-check v4 removed `char16bits()` and
`stringOf()`. The second was the quieter one — the suite reported as a failed
file rather than failed assertions, so its ten tests had simply not been running.
