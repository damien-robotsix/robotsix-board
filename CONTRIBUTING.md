# Contributing to robotsix-board

## Changelog fragments

Every user-facing pull request must include a changelog fragment — a short
Markdown file describing the change — placed in the `changes/` directory.
The file naming convention is:

```
changes/<PR_NUMBER>.<type>.md
```

Where `<type>` is one of:

- `feature` — a new feature
- `bugfix` — a bug fix
- `doc` — documentation improvement
- `removal` — a deprecation or removal
- `misc` — minor changes (tooling, CI, refactors)

A CI gate (`changelog.yml`) enforces that a fragment is present on every
PR, using `towncrier check --compare-with origin/main`.

**Skipping the check:** Trivial, non-user-facing PRs (e.g. CI tweaks,
dev-dependency bumps) can skip the gate by adding the `skip-changelog`
label to the pull request. Dependabot PRs are also excluded automatically.
