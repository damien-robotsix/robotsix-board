Fixed the docs build, which failed as soon as the Docs workflow could run at
all. `docs/robotsix_board/api.md` addressed the package as
`robotsix_board.__init__`, an identifier griffe cannot resolve — the package is
simply `robotsix_board`. A second page linked to a test file outside the docs
directory with a relative path, which is dead for anyone reading the published
site.
