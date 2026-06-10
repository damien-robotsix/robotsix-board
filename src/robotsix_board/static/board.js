/*
 * robotsix-board — shared Kanban board behaviour.
 *
 * Reads its configuration from a <script id="board-config"
 * type="application/json"> element rendered by the Python-side
 * render_config_script().  When render_mode is "json_hydration" the
 * JS bootstraps the full client-side board: refresh/polling loop,
 * move-control via fetch, detail-panel (#drawer) hydration, gate
 * caching, merge detection, closed-ticket toggle, agent-colour
 * hashing, and an HTML-escape helper.
 *
 * Mill-specific chrome (agents menu, cost dashboard, repo selector,
 * and other consumer-only panels) stays in robotsix-mill and is
 * deliberately absent from this file.
 */

(function () {
  "use strict";

  /* ==================================================================
   * 0.  Helpers
   * ================================================================ */

  /**
   * Map of characters to their HTML entity equivalents.
   * Used by esc() below.  Keys are the literal characters "&", "<",
   * ">", "\"", "'".
   */
  var ENTITY_MAP = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  /**
   * HTML-escape the string *s* so it is safe for interpolation into
   * HTML text content or attribute values.  Mirrors the Python
   * ``esc()`` in ``_render.py``.
   *
   * Escapes "&", "<", ">", "\"", "'" to their named or numeric
   * entity references.
   */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return ENTITY_MAP[ch];
    });
  }

  /**
   * Simple deterministic hash: sum of character codes modulo *m*.
   * Used for agent-colour hue assignment.
   */
  function hashStr(s, m) {
    var h = 0;
    for (var i = 0; i < s.length; i++) {
      h = (h + s.charCodeAt(i)) % m;
    }
    return h;
  }

  /**
   * Return a HSL background colour string for an agent name.
   */
  function agentColor(name) {
    var hue = hashStr(name, 360);
    return "hsl(" + hue + ", 50%, 30%)";
  }

  /* ==================================================================
   * 1.  Configuration
   * ================================================================ */

  /** @type {object|null} Parsed board-config JSON. */
  var CFG = null;

  /** @type {object|null}  { status_key: label } lookup. */
  var COLUMN_MAP = null;

  /** @type {string|null}  status_key of the terminal / closed column. */
  var CLOSED_KEY = null;

  /**
   * Boot: locate #board-config, parse, validate, and store globally.
   * Returns true on success, false when the page is not in
   * json_hydration mode (bail out).
   */
  function bootConfig() {
    var el = document.getElementById("board-config");
    if (!el) {
      return false;
    }
    try {
      CFG = JSON.parse(el.textContent || "{}");
    } catch (_err) {
      console.warn("board.js: failed to parse #board-config JSON", _err);
      return false;
    }
    if (!CFG || CFG.render_mode !== "json_hydration") {
      return false;
    }

    // Build column lookup
    COLUMN_MAP = {};
    var cols = CFG.columns || [];
    for (var i = 0; i < cols.length; i++) {
      COLUMN_MAP[cols[i][0]] = cols[i][1];
    }

    // Identify closed column: last column in config, or key matching
    // "closed" / "done" (case-insensitive).
    if (cols.length > 0) {
      var last = cols[cols.length - 1][0];
      if (last.toLowerCase() === "closed" || last.toLowerCase() === "done") {
        CLOSED_KEY = last;
      } else {
        // Accept the last column as the terminal/closed column by convention
        CLOSED_KEY = last;
      }
    }

    return true;
  }

  /* ==================================================================
   * 2.  Card rendering (JSON → DOM)
   * ================================================================ */

  /**
   * Build a .board-card element from a card data object.
   *
   * Expected card shape (from refresh endpoint):
   *   {
   *     id: string,
   *     title: string,
   *     status: string,          // must match a column status_key
   *     badges: string[],        // optional – generic badge strings
   *     timestamps: object,      // optional – { label: value, ... }
   *     merged: boolean,         // optional – merge indicator
   *     agent_badges: string[],  // optional – rendered with agent colour
   *     source_badge: string,    // optional – gets .src-badge class
   *   }
   *
   * @param {object} card
   * @returns {HTMLElement}
   */
  function buildCardElement(card) {
    var div = document.createElement("div");
    div.className = "board-card";
    div.id = "card-" + esc(String(card.id));
    div.setAttribute("data-card-id", String(card.id));

    if (card.merged) {
      div.classList.add("board-card--merged");
    }

    // ── Title ──
    var titleEl = document.createElement("div");
    titleEl.className = "board-card-title";
    titleEl.textContent = card.title || "";
    div.appendChild(titleEl);

    // ── Badges (generic, agent, source) ──
    var hasGeneric = Array.isArray(card.badges) && card.badges.length > 0;
    var hasAgent = Array.isArray(card.agent_badges) && card.agent_badges.length > 0;
    var hasSource = typeof card.source_badge === "string" && card.source_badge !== "";

    if (hasGeneric || hasAgent || hasSource) {
      var badgeRow = document.createElement("div");
      badgeRow.className = "board-card-badges";

      // Generic badges
      if (hasGeneric) {
        for (var b = 0; b < card.badges.length; b++) {
          var span = document.createElement("span");
          span.className = "board-badge";
          span.textContent = card.badges[b];
          badgeRow.appendChild(span);
        }
      }

      // Agent badges (with deterministic colour)
      if (hasAgent) {
        for (var a = 0; a < card.agent_badges.length; a++) {
          var agentSpan = document.createElement("span");
          agentSpan.className = "board-badge";
          agentSpan.setAttribute("data-agent", card.agent_badges[a]);
          agentSpan.style.setProperty(
            "--badge-color",
            agentColor(card.agent_badges[a])
          );
          agentSpan.textContent = card.agent_badges[a];
          badgeRow.appendChild(agentSpan);
        }
      }

      // Source badge (uses .src-badge variant)
      if (hasSource) {
        var srcSpan = document.createElement("span");
        srcSpan.className = "board-badge src-badge";
        srcSpan.textContent = card.source_badge;
        badgeRow.appendChild(srcSpan);
      }

      div.appendChild(badgeRow);
    }

    // ── Timestamps ──
    var ts = card.timestamps;
    if (ts && typeof ts === "object" && Object.keys(ts).length > 0) {
      var tsRow = document.createElement("div");
      tsRow.className = "board-card-timestamps";
      var keys = Object.keys(ts);
      for (var k = 0; k < keys.length; k++) {
        var tsSpan = document.createElement("span");
        tsSpan.className = "board-timestamp";
        tsSpan.textContent = esc(keys[k]) + ": " + esc(String(ts[keys[k]]));
        tsRow.appendChild(tsSpan);
      }
      div.appendChild(tsRow);
    }

    // ── Move form ──
    var moveForm = buildMoveForm(card);
    div.appendChild(moveForm);

    return div;
  }

  /**
   * Populate a <select> element with column options for moving a card.
   *
   * @param {HTMLSelectElement} select  — the select to populate
   * @param {string} currentStatus      — status to skip (the card's current column)
   * @param {Array<string>} gateBlocked — columns blocked by gate checks
   * @returns {HTMLSelectElement}       — the same select element (for chaining)
   */
  function buildSelectOptions(select, currentStatus, gateBlocked) {
    var defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "Move to\u2026";
    select.appendChild(defaultOpt);

    var cols = CFG.columns || [];
    for (var i = 0; i < cols.length; i++) {
      var key = cols[i][0];
      if (key === currentStatus) continue;
      var opt = document.createElement("option");
      opt.value = key;
      opt.textContent = cols[i][1];
      if (gateBlocked.indexOf(key) !== -1) {
        opt.disabled = true;
      }
      select.appendChild(opt);
    }
    return select;
  }

  /**
   * Build the .board-card-move <form> for a card.
   *
   * @param {object} card
   * @returns {HTMLElement}
   */
  function buildMoveForm(card) {
    var form = document.createElement("form");
    form.className = "board-card-move";
    form.setAttribute("method", CFG.move_method || "POST");

    // Build the action URL from the template
    var actionUrl = (CFG.move_endpoint_template || "/move/{card_id}/{target_status}")
      .replace("{card_id}", encodeURIComponent(card.id))
      .replace("{target_status}", "");
    form.setAttribute("action", actionUrl);

    // ── Select ──
    var select = document.createElement("select");
    select.name = "target_status";
    select.className = "board-move-select";
    buildSelectOptions(select, card.status, getGateBlockedColumns());
    form.appendChild(select);

    // ── Submit button ──
    var btn = document.createElement("button");
    btn.type = "submit";
    btn.className = "board-move-submit";
    btn.textContent = "Move";
    form.appendChild(btn);

    // ── Inline error placeholder ──
    var errEl = document.createElement("span");
    errEl.className = "board-move-error";
    form.appendChild(errEl);

    return form;
  }

  /**
   * Rebuild the move <select> inside *form* for *card* to reflect the
   * card's new current status (used after an optimistic move).
   *
   * @param {HTMLFormElement} form
   * @param {object} card  — requires at minimum { id, status }
   */
  function rebuildMoveSelect(form, card) {
    var oldSelect = form.querySelector("select[name='target_status']");
    if (!oldSelect) return;

    var select = document.createElement("select");
    select.name = "target_status";
    select.className = "board-move-select";
    buildSelectOptions(select, card.status, getGateBlockedColumns());
    oldSelect.replaceWith(select);
  }

  /* ==================================================================
   * 3.  Column count update
   * ================================================================ */

  /**
   * Update the .board-column-count in every column header to reflect
   * the current number of visible .board-card children.
   */
  function updateColumnCounts() {
    var board = document.getElementById("board");
    if (!board) return;

    var columns = board.querySelectorAll(".board-column");
    for (var i = 0; i < columns.length; i++) {
      var col = columns[i];
      var countEl = col.querySelector(".board-column-count");
      if (!countEl) continue;

      // Count visible (non-.hidden) cards
      var cards = col.querySelectorAll(
        ".board-column-cards > .board-card:not(.hidden)"
      );
      countEl.textContent = String(cards.length);
    }
  }

  /* ==================================================================
   * 4.  Refresh loop
   * ================================================================ */

  /** @type {number|null} */
  var _refreshTimer = null;

  /**
   * Start the periodic refresh poll.
   *
   * If ``refresh_url`` is absent / null in the config, the refresh
   * loop is disabled entirely (the board is static until a manual
   * ``robotsixBoardRefresh()`` call).
   */
  function startRefreshLoop() {
    if (!CFG.refresh_url) {
      return;
    }
    var interval = Number(CFG.refresh_interval_ms) || 30000;

    // Fetch immediately on boot, then poll
    doRefresh();

    _refreshTimer = setInterval(doRefresh, interval);
  }

  /**
   * Fetch fresh card data from ``refresh_url`` and diff against the
   * current DOM state.
   */
  function doRefresh() {
    if (!CFG.refresh_url) return;

    fetch(CFG.refresh_url)
      .then(function (resp) {
        if (!resp.ok) {
          throw new Error("refresh fetch returned " + resp.status);
        }
        return resp.json();
      })
      .then(function (cards) {
        applyCardDiff(cards);
        updateColumnCounts();
      })
      .catch(function (err) {
        console.warn("board.js: refresh fetch failed:", err);
        // Retry on next interval — do not break the loop.
      });
  }

  /**
   * Diff *cards* (array of card objects from the server) against the
   * current DOM and add / move / remove card elements as needed.
   *
   * @param {object[]} cards
   */
  function applyCardDiff(cards) {
    var board = document.getElementById("board");
    if (!board) return;
    if (!Array.isArray(cards)) return;

    // Index incoming cards by id
    var incoming = {};
    for (var i = 0; i < cards.length; i++) {
      incoming[cards[i].id] = cards[i];
    }

    // Index current DOM cards by data-card-id
    var currentEls = board.querySelectorAll(".board-card");
    var currentMap = {}; // cardId → { el, columnStatus }
    for (var j = 0; j < currentEls.length; j++) {
      var el = currentEls[j];
      var cid = el.getAttribute("data-card-id");
      if (cid) {
        var col = el.closest(".board-column");
        currentMap[cid] = {
          el: el,
          columnStatus: col ? col.getAttribute("data-status") : null,
        };
      }
    }

    // Walk incoming cards: add new, move changed-status, skip unchanged
    var seen = {};
    for (var k = 0; k < cards.length; k++) {
      var card = cards[k];
      seen[card.id] = true;

      var existing = currentMap[card.id];
      if (!existing) {
        // New card — render into the correct column
        var targetCol = findColumnByStatus(board, card.status);
        if (targetCol) {
          var cardList = targetCol.querySelector(".board-column-cards");
          if (cardList) {
            cardList.appendChild(buildCardElement(card));
          }
        }
      } else if (existing.columnStatus !== card.status) {
        // Moved card — remove from old column, render into new
        existing.el.remove();
        var newCol = findColumnByStatus(board, card.status);
        if (newCol) {
          var newCardList = newCol.querySelector(".board-column-cards");
          if (newCardList) {
            newCardList.appendChild(buildCardElement(card));
          }
        }
      }
      // else: unchanged — leave the existing DOM element alone to
      // avoid flicker and preserve user interaction state.
    }

    // Remove cards no longer present in the response
    var currentIds = Object.keys(currentMap);
    for (var m = 0; m < currentIds.length; m++) {
      if (!seen[currentIds[m]]) {
        currentMap[currentIds[m]].el.remove();
      }
    }
  }

  /**
   * Find a .board-column element by its data-status attribute.
   *
   * @param {HTMLElement} board  — the #board container
   * @param {string} status
   * @returns {HTMLElement|null}
   */
  function findColumnByStatus(board, status) {
    if (!board || !status) return null;
    return board.querySelector(
      '.board-column[data-status="' + CSS.escape(status) + '"]'
    );
  }

  /* ==================================================================
   * 5.  Move control
   * ================================================================ */

  /**
   * Attach delegated submit handler on #board for .board-card-move
   * forms.  Uses event delegation — no per-card listeners — so it
   * scales to large boards.
   */
  function attachMoveDelegation() {
    var board = document.getElementById("board");
    if (!board) return;

    board.addEventListener("submit", function (evt) {
      var form = evt.target.closest(".board-card-move");
      if (!form) return; // not our form — let it bubble

      evt.preventDefault();

      var select = form.querySelector("select[name='target_status']");
      if (!select) return;

      var targetStatus = select.value;
      if (!targetStatus) return; // placeholder "Move to…" selected

      var cardEl = form.closest(".board-card");
      if (!cardEl) return;

      var cardId = cardEl.getAttribute("data-card-id");
      if (!cardId) return;

      var oldValue = select.value;
      var errorEl = form.querySelector(".board-move-error");

      // Build the move URL from the configured template
      var url = (
        CFG.move_endpoint_template || "/move/{card_id}/{target_status}"
      )
        .replace("{card_id}", encodeURIComponent(cardId))
        .replace("{target_status}", encodeURIComponent(targetStatus));

      fetch(url, { method: CFG.move_method || "POST" })
        .then(function (resp) {
          if (!resp.ok) {
            throw new Error("move returned " + resp.status);
          }
          return resp;
        })
        .then(function () {
          // Success — clear any previous error
          if (errorEl) {
            errorEl.style.display = "none";
            errorEl.textContent = "";
          }

          // Optimistically move the card DOM element to the target column
          var targetCol = findColumnByStatus(
            document.getElementById("board"),
            targetStatus
          );
          if (targetCol) {
            var cardList = targetCol.querySelector(".board-column-cards");
            if (cardList) {
              cardList.appendChild(cardEl);
            }
          }

          // Rebuild the move select so the old column becomes an
          // option and the new column is removed from the list.
          rebuildMoveSelect(form, { id: cardId, status: targetStatus });
          updateColumnCounts();
        })
        .catch(function (err) {
          console.warn("board.js: move fetch failed:", err);

          // Revert the select to its original value
          select.value = oldValue;

          // Display an inline error message
          if (errorEl) {
            errorEl.textContent = "Move failed: " + err.message;
            errorEl.style.display = "inline";
          }
        });
    });
  }

  /* ==================================================================
   * 6.  Detail panel (#drawer)
   * ================================================================ */

  /**
   * Attach click handler on #board to open #drawer when a .board-card
   * is clicked.  Clicks on or inside the .board-card-move form are
   * ignored (they should not open the drawer).
   */
  function attachDrawerDelegation() {
    var board = document.getElementById("board");
    if (!board) return;

    board.addEventListener("click", function (evt) {
      // Ignore clicks on or inside the move form
      if (evt.target.closest(".board-card-move")) {
        return;
      }

      var cardEl = evt.target.closest(".board-card");
      if (!cardEl) return;

      openDrawer(cardEl);
    });

    // Close button delegation on #drawer
    var drawer = document.getElementById("drawer");
    if (!drawer) return;

    drawer.addEventListener("click", function (evt) {
      if (evt.target.closest(".drawer-close")) {
        closeDrawer();
      }
    });
  }

  /**
   * Populate and open the detail drawer for *cardEl*.
   *
   * @param {HTMLElement} cardEl  — the .board-card DOM element
   */
  function openDrawer(cardEl) {
    var drawer = document.getElementById("drawer");
    if (!drawer) return;

    var content = drawer.querySelector(".drawer-content");
    if (!content) return;

    // Gather data from the card's DOM structure
    var cardId = cardEl.getAttribute("data-card-id") || "";

    var titleEl = cardEl.querySelector(".board-card-title");
    var title = titleEl ? titleEl.textContent : "";

    var badgeEls = cardEl.querySelectorAll(
      ".board-card-badges .board-badge"
    );
    var badges = [];
    for (var i = 0; i < badgeEls.length; i++) {
      badges.push(badgeEls[i].textContent || "");
    }

    var tsEls = cardEl.querySelectorAll(
      ".board-card-timestamps .board-timestamp"
    );
    var timestamps = [];
    for (var j = 0; j < tsEls.length; j++) {
      timestamps.push(tsEls[j].textContent || "");
    }

    // ── Build drawer HTML ──
    var html = '<h2 class="drawer-card-title">' + esc(title) + "</h2>";
    html += '<p class="drawer-card-id">ID: ' + esc(cardId) + "</p>";

    if (badges.length > 0) {
      html += '<div class="drawer-section"><h3>Badges</h3><ul>';
      for (var b = 0; b < badges.length; b++) {
        html += "<li>" + esc(badges[b]) + "</li>";
      }
      html += "</ul></div>";
    }

    if (timestamps.length > 0) {
      html += '<div class="drawer-section"><h3>Timestamps</h3><ul>';
      for (var t = 0; t < timestamps.length; t++) {
        html += "<li>" + esc(timestamps[t]) + "</li>";
      }
      html += "</ul></div>";
    }

    html +=
      '<button class="drawer-close" type="button">Close</button>';

    content.innerHTML = html;
    drawer.classList.remove("hidden");

    // Backdrop click: clicking the drawer itself (outside
    // .drawer-content) closes it.  We attach a one-shot handler
    // that is removed on close.
    drawer._closeOnBackdrop = function (evt) {
      if (!evt.target.closest(".drawer-content")) {
        closeDrawer();
      }
    };
    drawer.addEventListener("click", drawer._closeOnBackdrop);
  }

  /**
   * Close the detail drawer and re-apply the hidden class.
   */
  function closeDrawer() {
    var drawer = document.getElementById("drawer");
    if (!drawer) return;

    drawer.classList.add("hidden");

    if (drawer._closeOnBackdrop) {
      drawer.removeEventListener("click", drawer._closeOnBackdrop);
      drawer._closeOnBackdrop = null;
    }
  }

  /* ==================================================================
   * 7.  Gate caching
   * ================================================================ */

  /** @type {string} sessionStorage key for gate cache. */
  var GATE_CACHE_KEY = "robotsix-board-gate";

  /** @type {number} Bump to invalidate all cached gate data. */
  var GATE_CACHE_VERSION = 1;

  /** @type {number} Gate cache TTL in milliseconds (default 15 min). */
  var GATE_CACHE_TTL_MS = 15 * 60 * 1000;

  /** @type {string|null} Optional endpoint URL for fetching gate state. */
  var _gateEndpoint = null;

  /**
   * Return the list of column status_keys that are currently blocked
   * (moves into them should be prevented or warned).
   *
   * @returns {string[]}
   */
  function getGateBlockedColumns() {
    var data = getGateData();
    if (!data || !Array.isArray(data.blocked_columns)) {
      return [];
    }
    return data.blocked_columns;
  }

  /**
   * Retrieve gate data from sessionStorage, with TTL-based staleness
   * check.  If no valid cache exists and a gate endpoint is
   * configured, an async fetch is triggered (results available on the
   * next call).  Returns the current best-known data (possibly empty).
   *
   * @returns {object}  { blocked_columns: string[], ... }
   */
  function getGateData() {
    // Try to read from cache
    try {
      var raw = sessionStorage.getItem(GATE_CACHE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (
          parsed &&
          parsed.version === GATE_CACHE_VERSION &&
          parsed.fetched_at
        ) {
          var age = Date.now() - parsed.fetched_at;
          if (age < GATE_CACHE_TTL_MS) {
            return parsed;
          }
          // Stale — trigger a re-fetch in the background
          fetchGateDataAsync();
          return parsed; // Return stale data rather than nothing
        }
      }
    } catch (_e) {
      // Corrupt cache — ignore and fetch fresh
    }

    // No cache at all — trigger fetch if endpoint configured
    fetchGateDataAsync();

    return {
      blocked_columns: [],
      version: GATE_CACHE_VERSION,
      fetched_at: 0,
    };
  }

  /**
   * Fetch gate state from the configured endpoint asynchronously.
   * On success the result is written to sessionStorage and will be
   * picked up by the next ``getGateData()`` call.
   */
  function fetchGateDataAsync() {
    if (!_gateEndpoint) return;

    fetch(_gateEndpoint)
      .then(function (resp) {
        if (!resp.ok) {
          throw new Error("gate fetch returned " + resp.status);
        }
        return resp.json();
      })
      .then(function (data) {
        robotsixBoardSetGate(data);
      })
      .catch(function (err) {
        console.warn("board.js: gate fetch failed:", err);
      });
  }

  /**
   * Store gate data in sessionStorage.  Callable externally via
   * ``window.robotsixBoardSetGate()`` so server-rendered pages can
   * prime the gate cache without an extra round-trip.
   *
   * @param {object} data  — { blocked_columns: string[], ... }
   */
  function robotsixBoardSetGate(data) {
    try {
      data.version = GATE_CACHE_VERSION;
      data.fetched_at = Date.now();
      sessionStorage.setItem(GATE_CACHE_KEY, JSON.stringify(data));
    } catch (_e) {
      // sessionStorage may be full or unavailable — degrade gracefully
    }
  }

  /**
   * Configure the gate data endpoint URL.  When set, the board will
   * fetch gate state from this URL (with TTL-based caching in
   * sessionStorage).  Callable externally via
   * ``window.robotsixBoardSetGateEndpoint()``.
   *
   * @param {string} url
   */
  function robotsixBoardSetGateEndpoint(url) {
    _gateEndpoint = url;
    // Prime the cache immediately
    fetchGateDataAsync();
  }

  /* ==================================================================
   * 8.  Closed-ticket toggle
   * ================================================================ */

  /** @type {string} localStorage key for the toggle preference. */
  var CLOSED_TOGGLE_KEY = "robotsix-board-show-closed";

  /**
   * Create a checkbox toggle before #board that shows / hides the
   * terminal "closed" column.  State is persisted in localStorage.
   */
  function attachClosedToggle() {
    var board = document.getElementById("board");
    if (!board) return;
    if (!CLOSED_KEY) return;

    // Idempotent — don't create duplicate toggles
    if (document.getElementById("board-closed-toggle")) return;

    var container = document.createElement("div");
    container.id = "board-closed-toggle";
    container.style.cssText =
      "padding: 8px 16px; display: flex; align-items: center; gap: 8px;";

    var label = document.createElement("label");
    label.style.cssText =
      "color: #c0c0e0; font-size: 0.85rem; cursor: pointer; user-select: none;";

    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = "board-closed-checkbox";
    checkbox.checked = getClosedToggleState();

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(" Show closed"));

    container.appendChild(label);
    board.parentNode.insertBefore(container, board);

    // Apply initial visibility
    applyClosedToggle(checkbox.checked);

    checkbox.addEventListener("change", function () {
      applyClosedToggle(checkbox.checked);
      setClosedToggleState(checkbox.checked);
    });
  }

  /**
   * @returns {boolean}
   */
  function getClosedToggleState() {
    try {
      return localStorage.getItem(CLOSED_TOGGLE_KEY) === "true";
    } catch (_e) {
      return true; // default: show closed
    }
  }

  /**
   * @param {boolean} show
   */
  function setClosedToggleState(show) {
    try {
      localStorage.setItem(CLOSED_TOGGLE_KEY, String(show));
    } catch (_e) {
      // localStorage may be unavailable
    }
  }

  /**
   * Apply the closed-column visibility based on the toggle state.
   *
   * @param {boolean} show
   */
  function applyClosedToggle(show) {
    if (!CLOSED_KEY) return;
    var col = findColumnByStatus(
      document.getElementById("board"),
      CLOSED_KEY
    );
    if (!col) return;

    if (show) {
      col.classList.remove("hidden");
    } else {
      col.classList.add("hidden");
    }
  }

  /* ==================================================================
   * 9.  Public API
   * ================================================================ */

  /**
   * Trigger an immediate refresh.  Safe to call at any time; is a
   * no-op if the board is not in json_hydration mode.  Exposed as
   * ``window.robotsixBoardRefresh()``.
   */
  function robotsixBoardRefresh() {
    if (!CFG || CFG.render_mode !== "json_hydration") return;
    doRefresh();
  }

  /**
   * Change, at runtime, the URL the board polls for card data.  Sets
   * ``CFG.refresh_url`` — replacing the refresh source used by both
   * ``doRefresh()`` and the polling loop — then triggers an immediate
   * refresh so the change takes effect without waiting for the next
   * poll tick.  No-op if the board is not initialised (no config).
   * Exposed as ``window.robotsixBoardSetRefreshUrl()``.
   *
   * @param {string} url
   */
  function robotsixBoardSetRefreshUrl(url) {
    if (!CFG) return;
    CFG.refresh_url = url;
    doRefresh();
  }

  /* ==================================================================
   * 10.  Bootstrap
   * ================================================================ */

  /**
   * Initialise the board: parse config, attach event handlers, start
   * the refresh loop, and mount UI controls.
   */
  function init() {
    if (!bootConfig()) {
      return; // not json_hydration mode or missing config
    }

    attachMoveDelegation();
    attachDrawerDelegation();
    attachClosedToggle();
    startRefreshLoop();
  }

  // ── Wire up on DOM ready ─────────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // ── Expose public API on window ──────────────────────────────────
  window.robotsixBoardRefresh = robotsixBoardRefresh;
  window.robotsixBoardSetGate = robotsixBoardSetGate;
  window.robotsixBoardSetGateEndpoint = robotsixBoardSetGateEndpoint;
  window.robotsixBoardSetRefreshUrl = robotsixBoardSetRefreshUrl;
})();
