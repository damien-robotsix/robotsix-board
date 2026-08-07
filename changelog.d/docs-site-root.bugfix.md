The published docs site now has a landing page. Every page lived under
`docs/robotsix_board/`, so MkDocs produced no `site/index.html` and the site
root returned 404 — the content was only reachable at
`/robotsix-board/robotsix_board/`. The pages move up one level, and
`integrating.md`, which was absent from the nav and therefore unreachable from
the site's navigation, is now listed.
