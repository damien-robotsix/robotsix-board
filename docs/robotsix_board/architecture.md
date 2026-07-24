# JS Frontend Architecture

The kanban-board client is a single ~1 273‑line IIFE at
`src/robotsix_board/static/board.js`.  This page documents its
structure so contributors can navigate the file without
reverse-engineering the full source.

## 1. IIFE structure

All board logic lives inside an Immediately-Invoked Function
Expression:

```js
(function () {
  "use strict";
  // … all internals …
})();
```

**Why?**

- **No global leaks** — every function and variable is scoped to the
  IIFE closure, so the board code cannot accidentally collide with
  other scripts on the page.
- **Explicit export surface** — the only way consumer code (or tests)
  can call into the board is through the handful of symbols the IIFE
  copies onto `window`.

### What gets exported

| Export | Purpose |
|---|---|
| `window.robotsixBoardRefresh()` | Public API — 7 functions |
| `window.robotsixBoardSetGate()` | that consumer pages can call |
| `window.robotsixBoardInternals` | Test-only — exposes pure functions for vitest |

The exports are assigned at the bottom of the file (lines
≈1 235–1 273).

## 2. Subsystem map

Every subsystem is delimited by a section-header comment of the form
`/* ==== N. Name ==== */`.

| # | Subsystem | Lines (approx.) | Key functions |
|---|---|---|---|
| 0 | Helpers | 53–111 | `esc()`, `hashStr()`, `agentColor()` |
| 1 | Configuration | 112–163 | `bootConfig()`, `CFG`, `CLOSED_KEY` |
| 2 | Card rendering | 164–371 | `buildCardElement()`, `_buildAgentBadgeElements()`, `buildSelectOptions()`, `buildMoveForm()`, `rebuildMoveSelect()` |
| 3 | Column count update | 372–397 | `updateColumnCounts()` |
| 4 | Refresh loop | 398–544 | `startRefreshLoop()`, `doRefresh()`, `applyCardDiff()`, `findColumnByStatus()`, `appendCardToColumn()` |
| 5 | Move control | 545–650 | `performMove()`, `attachMoveDelegation()` |
| 6 | Drawer / detail panel | 651–900 | `attachDrawerDelegation()`, `_buildDrawerHtml()`, `_setupDrawerA11y()`, `_trapFocus()`, `_attachDrawerHandlers()`, `openDrawer()`, `closeDrawer()` |
| 7 | Gate caching | 901–1 023 | `getGateBlockedColumns()`, `getGateData()`, `fetchGateDataAsync()`, `robotsixBoardSetGate()`, `robotsixBoardSetGateEndpoint()` |
| 8 | Closed-ticket toggle | 1 024–1 110 | `attachClosedToggle()`, `getClosedToggleState()`, `setClosedToggleState()`, `applyClosedToggle()` |
| 9 | Public API | 1 111–1 199 | `robotsixBoardRefresh()`, `robotsixBoardStopRefresh()`, `robotsixBoardSetRefreshUrl()`, `robotsixBoardSetRefreshInterval()`, `applyColumnA11y()` |
| 10 | Bootstrap | 1 200–1 273 | `init()`, DOM-ready wiring, public API + internals export |

> Line ranges are approximate and reflect the file at the time of
> writing.  Subsystems 7–8 (gate cache and closed toggle) intentionally
> sit after the drawer subsystem in the source — they were added later
> and live at the bottom so the refresh/public-API logic can reference
> them by hoisting.

## 3. Key IIFE-scoped globals

These `var` declarations are private to the IIFE closure:

| Variable | Type | Purpose |
|---|---|---|
| `CFG` | `BoardConfig\|null` | Parsed configuration from `<script id="board-config">`. Set by `bootConfig()`. |
| `CLOSED_KEY` | `string\|null` | The `status_key` of the terminal/closed column. Used by the closed-ticket toggle. |
| `_refreshTimer` | `number\|null` | `setInterval` handle for the periodic refresh poll. Null when refresh is disabled or not started. |

## 4. Public API reference

Seven functions are copied onto `window` so consumer pages (and the
test harness) can interact with a running board.  All seven are
defined inside the IIFE and need no arguments in typical usage.

### `robotsixBoardRefresh()`

Manually trigger a single refresh cycle.  Fetches fresh card data
from `CFG.refresh_url` and diffs the DOM.

### `robotsixBoardStopRefresh()`

Clear the periodic refresh timer.  The board becomes static until
`robotsixBoardRefresh()` or `robotsixBoardSetRefreshInterval()` is
called.

### `robotsixBoardSetGate(data)`

Preload gate data (an object with a `blocked_columns` array) from
a server-rendered page.  This avoids a duplicate network call when
the server already has the gate information.

### `robotsixBoardSetGateEndpoint(url)`

Set (or change) the gate-data endpoint URL.  The next move-select
build will fetch from this URL.

### `robotsixBoardSetRefreshUrl(url)`

Change the refresh URL at runtime and restart the polling loop.

### `robotsixBoardSetRefreshInterval(ms)`

Change the polling interval.  Clears the old timer and starts a new
one at the new interval.

## 5. Testing

The JS test suite lives in `tests/robotsix_board/` and uses
**vitest** with a **happy-dom** environment.

### Bootstrapping the IIFE

`tests/robotsix_board/static/setup.js`:

```js
import "../../src/robotsix_board/static/board.js";
import { setupBoardTest } from "./board_shared.js";
setupBoardTest();
```

The `import` side-effect runs the IIFE in the test environment,
populating `window.robotsixBoardInternals`.  `setupBoardTest()`
(from `board_shared.js`) inserts the required DOM scaffolding
(`#board`, columns, cards, `#drawer`) before each test so that
functions like `buildCardElement()` and `openDrawer()` have a
real DOM to operate on.

### Accessing internals

Every pure function and most stateful helpers are reachable via
`window.robotsixBoardInternals`.  Example test pattern:

```js
const { esc, buildCardElement, applyCardDiff } = window.robotsixBoardInternals;
expect(esc("<script>")).toBe("&lt;script&gt;");
```

The `board.integrity.test.js` enforces that **every** module-level
function is registered in `robotsixBoardInternals` — an addition
that forgets to add its entry will fail CI.

### Test files

| File | Covers |
|---|---|
| `board.helpers.test.js` | `esc()`, `hashStr()`, `agentColor()` |
| `board.config.test.js` | `bootConfig()` configuration parsing |
| `board.render.test.js` | `buildCardElement()`, `buildMoveForm()` |
| `board.move.test.js` | `performMove()`, `attachMoveDelegation()` |
| `board.drawer.test.js` | `openDrawer()`, `closeDrawer()`, focus trap |
| `board.gate.test.js` | `fetchGateDataAsync()`, gate cache |
| `board.toggle.test.js` | `attachClosedToggle()`, `applyClosedToggle()` |
| `board.refresh.test.js` | `doRefresh()`, `applyCardDiff()` |
| `board.init.test.js` | `init()` wiring |
| `board.public_api.test.js` | All `window.robotsixBoard*` functions |
| `board.integrity.test.js` | All internals are registered |
| `setup.js` | Test environment bootstrap |
| `board_shared.js` | Shared DOM-scaffolding helpers |
