Fixed the Docs workflow, which had never run. The caller granted `pages: write`
and `id-token: write` but omitted `contents: read`, so the shared docs spine's
build job could not check out the repo and every run died at startup — producing
no logs, no checks and nothing on the PR.
