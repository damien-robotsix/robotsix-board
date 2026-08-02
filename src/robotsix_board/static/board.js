/*
 * robotsix-board — shared Kanban board behaviour.
 *
 * Reads its configuration from a <script id="board-config"
 * type="application/json"> element rendered by the Python-side
 * render_config_script().  When render_mode is "json_hydration" the
 * JS bootstraps the full client-side board: refresh/polling loop,
 * detail-panel (#drawer) hydration, gate
 * caching, merge detection, closed-ticket toggle, agent-colour
 * hashing, and an HTML-escape helper.
 *
 * The board is read-only chrome: it renders no move-between-columns
 * control.  Changing a card's state is the owning service's business,
 * done through that service's own API.
 *
 * Mill-specific chrome (agents menu, cost dashboard, repo selector,
 * and other consumer-only panels) stays in robotsix-mill and is
 * deliberately absent from this file.
 */

(function () {
  "use strict";

  /**
   * @typedef {{
   *   render_mode: string,
   *   columns: Array<[string, string]>,
   *   gate_endpoint?: string,
   *   refresh_url?: string|null,
   *   refresh_interval_ms?: number,
   *   onError?: string
   * }} BoardConfig
   */

  /**
   * @typedef {{
   *   id: string,
   *   title: string,
   *   status: string,
   *   badges?: string[],
   *   timestamps?: Record<string, unknown>,
   *   merged?: boolean,
   *   agent_badges?: string[],
   *   source_badge?: string
   * }} BoardCard
   */

  /**
   * @typedef {{
   *   blocked_columns: string[],
   *   version?: number,
   *   fetched_at?: number
   * }} GateData
   */

  /* ==================================================================
   * 0.  Helpers
   * ================================================================ */

  /**
   * Map of characters to their HTML entity equivalents.
   * Used by esc() below.  Keys are the literal characters "&", "<",
   * ">", "\"", "'".
   */
  /** @type {Record<string, string>} */
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
   * @param {string} s - The string to escape.
   * @returns {string} The escaped string.
   */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return ENTITY_MAP[ch];
    });
  }

  /**
   * Simple deterministic hash: sum of character codes modulo *m*.
   * Used for agent-colour hue assignment.
   * @param {string} s - The string to hash.
   * @param {number} m - The modulus.
   * @returns {number} The hash value.
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
   * @param {string} name - The agent name.
   * @returns {string} HSL color string.
   */
  function agentColor(name) {
    var hue = hashStr(name, 360);
    return "hsl(" + hue + ", 50%, 30%)";
  }

  /* ==================================================================
   * 1.  Configuration
   * ================================================================ */

  /** @type {BoardConfig|null} Parsed board-config JSON. */
  var CFG = null;

  /** @type {string|null}  status_key of the terminal / closed column. */
  var CLOSED_KEY = null;

  /** @type {Function|null} Consumer-supplied error callback. */
  var _onErrorCallback = null;

  /**
   * Notify the consumer of a board error through all available channels:
   * the onError callback (if set), console.warn, and a namespaced
   * CustomEvent on the board container.
   * @param {string} code - Machine-readable error code.
   * @param {string} message - Human-readable error message.
   * @param {*} cause - The originating error or value.
   * @param {string} phase - Lifecycle phase (init, render, move, refresh, gate).
   */
  function _notifyError(code, message, cause, phase) {
    var errorObj = { code: code, message: message, cause: cause, phase: phase };
    if (typeof _onErrorCallback === "function") {
      try { _onErrorCallback(errorObj); } catch (_) { /* consumer callback must not break the board */ }
    }
    console.warn("board.js: " + message, cause);
    var board = document.getElementById("board");
    if (board) {
      board.dispatchEvent(new CustomEvent("board:error", { detail: errorObj }));
    }
  }

  /**
   * Render a visible error stub inside the board container so the widget
   * never silently vanishes.
   * @param {string} message - Human-readable error message.
   */
  function _renderErrorStub(message) {
    var board = document.getElementById("board");
    if (!board) { return; }
    var stub = document.createElement("div");
    stub.className = "board-error";
    stub.setAttribute("role", "alert");
    stub.textContent = message;
    board.appendChild(stub);
  }

  /**
   * Boot: locate #board-config, parse, validate, and store globally.
   * Returns true on success, false when the page is not in
   * json_hydration mode (bail out).
   * @returns {boolean} True if config parsed successfully.
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

    var cols = CFG.columns || [];

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

    if (CFG.gate_endpoint) {
      robotsixBoardSetGateEndpoint(CFG.gate_endpoint);
    }

    if (typeof CFG.onError === "string") {
      var fn = /** @type {Function|undefined} */ (/** @type {any} */ (window)[CFG.onError]);
      if (typeof fn === "function") {
        _onErrorCallback = fn;
      }
    }

    return true;
  }

  /* ==================================================================
   * 2.  Card rendering (JSON → DOM)
   * ================================================================ */

  /**
   * Build agent badge span elements with deterministic colour.
   * @param {Array<string>=} agentBadges - Agent names (optional).
   * @returns {DocumentFragment} The badge elements in a fragment.
   */
  function _buildAgentBadgeElements(agentBadges) {
    var frag = document.createDocumentFragment();
    if (Array.isArray(agentBadges) && agentBadges.length > 0) {
      for (var a = 0; a < agentBadges.length; a++) {
        var span = document.createElement("span");
        span.className = "board-badge";
        span.setAttribute("data-agent", agentBadges[a]);
        span.style.setProperty("--badge-color", agentColor(agentBadges[a]));
        span.textContent = agentBadges[a];
        frag.appendChild(span);
      }
    }
    return frag;
  }

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
   * @param {BoardCard} card - The card data object.
   * @returns {HTMLElement} The built card element.
   */
  function buildCardElement(card) {
    var div = document.createElement("div");
    div.className = "board-card";
    div.id = "card-" + esc(String(card.id));
    div.setAttribute("data-card-id", String(card.id));
    div.setAttribute("role", "listitem");
    div.setAttribute("tabindex", "0");
    div.setAttribute("aria-haspopup", "dialog");
    div.setAttribute("aria-expanded", "false");

    if (card.merged) {
      div.classList.add("board-card--merged");
    }

    // ── Title ──
    var titleEl = document.createElement("div");
    titleEl.className = "board-card-title";
    titleEl.textContent = card.title || "";
    div.appendChild(titleEl);

    // ── Badges (generic, agent, source) ──
    var badges = card.badges;
    var hasGeneric = Array.isArray(badges) && badges.length > 0;
    var agentBadges = card.agent_badges;
    var hasAgent = Array.isArray(agentBadges) && agentBadges.length > 0;
    var hasSource = typeof card.source_badge === "string" && card.source_badge !== "";

    if (hasGeneric || hasAgent || hasSource) {
      var badgeRow = document.createElement("div");
      badgeRow.className = "board-card-badges";

      // Generic badges
      if (Array.isArray(badges) && badges.length > 0) {
        for (var b = 0; b < badges.length; b++) {
          var span = document.createElement("span");
          span.className = "board-badge";
          span.textContent = badges[b];
          badgeRow.appendChild(span);
        }
      }

      // Agent badges (with deterministic colour)
      badgeRow.appendChild(_buildAgentBadgeElements(agentBadges));

      // Source badge (uses .src-badge variant)
      if (hasSource) {
        var srcSpan = document.createElement("span");
        srcSpan.className = "board-badge src-badge";
        srcSpan.textContent = card.source_badge || null;
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

    return div;
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
    if (!board) { return; }

    var columns = board.querySelectorAll(".board-column");
    for (var i = 0; i < columns.length; i++) {
      var col = columns[i];
      var countEl = col.querySelector(".board-column-count");
      if (!countEl) { continue; }

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

  /** @type {ReturnType<typeof setInterval>|null} */
  var _refreshTimer = null;

  /**
   * Start the periodic refresh poll.
   *
   * If ``refresh_url`` is absent / null in the config, the refresh
   * loop is disabled entirely (the board is static until a manual
   * ``robotsixBoardRefresh()`` call).
   */
  function startRefreshLoop() {
    // Clear any previously-started timer to prevent leaks on re-init.
    if (_refreshTimer !== null) {
      clearInterval(_refreshTimer);
      _refreshTimer = null;
    }

    if (!CFG || !CFG.refresh_url) {
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
    if (!CFG || !CFG.refresh_url) { return; }

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
        _notifyError("REFRESH_FAILED", "Refresh fetch failed", err, "refresh");
        console.warn("board.js: refresh fetch failed:", err);
        // Retry on next interval — do not break the loop.
      });
  }

  /**
   * Diff *cards* (array of card objects from the server) against the
   * current DOM and add / move / remove card elements as needed.
   * @param {BoardCard[]} cards - Array of card objects from the server.
   */
  function applyCardDiff(cards) {
    var board = document.getElementById("board");
    if (!board) { return; }
    if (!Array.isArray(cards)) { return; }

    try {
    // Index incoming cards by id
    /** @type {Record<string, BoardCard>} */
    var incoming = {};
    for (var i = 0; i < cards.length; i++) {
      incoming[cards[i].id] = cards[i];
    }

    // Index current DOM cards by data-card-id
    var currentEls = board.querySelectorAll(".board-card");
    /** @type {Record<string, {el: HTMLElement, columnStatus: string|null}>} */
    var currentMap = {}; // cardId → { el, columnStatus }
    for (var j = 0; j < currentEls.length; j++) {
      var el = currentEls[j];
      var cid = el.getAttribute("data-card-id");
      if (cid) {
        var col = /** @type {HTMLElement} */ (el).closest(".board-column");
        currentMap[cid] = {
          el: /** @type {HTMLElement} */ (el),
          columnStatus: col ? col.getAttribute("data-status") : null,
        };
      }
    }

    // Walk incoming cards: add new, move changed-status, skip unchanged
    /** @type {Record<string, boolean>} */
    var seen = {};
    for (var k = 0; k < cards.length; k++) {
      var card = cards[k];
      seen[card.id] = true;

      var existing = currentMap[card.id];
      if (!existing) {
        // New card — render into the correct column
        appendCardToColumn(card, board, card.status);
      } else if (existing.columnStatus !== card.status) {
        // Moved card — remove from old column, render into new
        existing.el.remove();
        appendCardToColumn(card, board, card.status);
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
    } catch (err) {
      _notifyError("RENDER_FAILED", "Card diff rendering failed", err, "render");
    }
  }

  /**
   * Find a .board-column element by its data-status attribute.
   * @param {HTMLElement} board  — the #board container
   * @param {string} status      — the status key to find
   * @returns {HTMLElement|null} The matching column element, or null.
   */
  function findColumnByStatus(board, status) {
    if (!board || !status) { return null; }
    return board.querySelector(
      '.board-column[data-status="' + CSS.escape(status) + '"]'
    );
  }

  /**
   * Append a newly-built card element to the column matching *status*.
   * @param {BoardCard} card — card data object passed to buildCardElement
   * @param {HTMLElement} board — the #board container
   * @param {string} status — the target column's status key
   * @returns {boolean} true if the card was appended, false if the column or card-list was not found
   */
  function appendCardToColumn(card, board, status) {
    var col = findColumnByStatus(board, status);
    if (!col) { return false; }
    var list = col.querySelector(".board-column-cards");
    if (!list) { return false; }
    list.appendChild(buildCardElement(card));
    return true;
  }

  /* ==================================================================
   * 5.  Detail panel (#drawer)
   * ================================================================ */

  /**
   * Attach click handler on #board to open #drawer when a .board-card
   * is clicked.
   */
  function attachDrawerDelegation() {
    var board = document.getElementById("board");
    if (!board) { return; }

    board.addEventListener("click", function (evt) {
      var target = /** @type {HTMLElement} */ (evt.target);
      var cardEl = /** @type {HTMLElement} */ (target.closest(".board-card"));
      if (!cardEl) { return; }

      openDrawer(cardEl);
    });

    // Keyboard activation: Enter / Space on a .board-card opens the drawer
    board.addEventListener("keydown", function (evt) {
      if (evt.key !== "Enter" && evt.key !== " ") { return; }

      var target = /** @type {HTMLElement} */ (evt.target);
      var cardEl = /** @type {HTMLElement} */ (target.closest(".board-card"));
      if (!cardEl) { return; }

      evt.preventDefault();
      openDrawer(cardEl);
    });

    // Close button delegation on #drawer
    var drawer = document.getElementById("drawer");
    if (!drawer) { return; }

    drawer.addEventListener("click", function (evt) {
      if (/** @type {HTMLElement} */ (evt.target).closest(".drawer-close")) {
        closeDrawer();
      }
    });
  }

  /**
   * Build the drawer content HTML string.
   * Pure function — no DOM side effects.
   * @param {string} title - Card title
   * @param {string} cardId - Card ID
   * @param {string[]} badges - Badge strings
   * @param {string[]} timestamps - Timestamp strings
   * @returns {string} HTML for the drawer content.
   */
  function _buildDrawerHtml(title, cardId, badges, timestamps) {
    var html = '<h2 class="drawer-card-title" id="drawer-title">' + esc(title) + "</h2>";
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

    return html;
  }

  /**
   * Set ARIA attributes and manage focus for the drawer dialog.
   * @param {HTMLElement} drawer - The drawer element.
   * @param {HTMLElement} cardEl - The triggering card element.
   * @param {HTMLElement|null} closeBtn - The close button inside the drawer.
   */
  function _setupDrawerA11y(drawer, cardEl, closeBtn) {
    // Store triggering card for focus restoration on close
    /** @type {HTMLElement & {_triggeringCard: HTMLElement | null}} */ (drawer)._triggeringCard = cardEl;

    // Set dialog ARIA attributes
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-modal", "true");
    drawer.setAttribute("aria-labelledby", "drawer-title");

    cardEl.setAttribute("aria-expanded", "true");

    // Move focus to the close button inside the drawer
    if (closeBtn) {
      closeBtn.focus();
    }
  }

  /**
   * Focus trap for the drawer: wraps Tab / Shift+Tab within focusable
   * elements inside *drawer* so focus never leaves the dialog.
   * @param {HTMLElement} drawer - The drawer element.
   * @param {KeyboardEvent} evt  - The keydown event (assumed key === "Tab").
   */
  function _trapFocus(drawer, evt) {
    var focusable = drawer.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), '
      + 'select:not([disabled]), textarea:not([disabled]), '
      + '[tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) { return; }
    var first = /** @type {HTMLElement} */ (focusable[0]);
    var last = /** @type {HTMLElement} */ (focusable[focusable.length - 1]);
    if (evt.shiftKey) {
      if (document.activeElement === first) {
        evt.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        evt.preventDefault();
        first.focus();
      }
    }
  }

  /**
   * Attach backdrop click and keydown handlers to the drawer.
   * Stores cleanup references on the drawer element.
   * @param {HTMLElement} drawer - The drawer element.
   */
  function _attachDrawerHandlers(drawer) {
    // Backdrop click: clicking the drawer itself (outside
    // .drawer-content) closes it.  We attach a one-shot handler
    // that is removed on close.
    /**
     * @param {MouseEvent} evt - The click event on the drawer backdrop.
     */
    var onBackdrop = function (evt) {
      if (!(/** @type {HTMLElement} */ (evt.target).closest(".drawer-content"))) {
        closeDrawer();
      }
    };
    /** @type {HTMLElement & {_closeOnBackdrop: ((evt: MouseEvent) => void) | null}} */ (drawer)._closeOnBackdrop = onBackdrop;
    drawer.addEventListener("click", onBackdrop);

    // Escape key to close the drawer
    /**
     * @param {KeyboardEvent} evt - The keydown event.
     */
    var onKeyDown = function (evt) {
      if (evt.key === "Escape") {
        evt.preventDefault();
        closeDrawer();
      }
      // Focus trap: keep Tab within the drawer
      if (evt.key === "Tab") {
        _trapFocus(drawer, evt);
      }
    };
    /** @type {HTMLElement & {_onKeyDown: ((evt: KeyboardEvent) => void) | null}} */ (drawer)._onKeyDown = onKeyDown;
    document.addEventListener("keydown", onKeyDown);
  }

  /**
   * Populate and open the detail drawer for *cardEl*.
   * @param {HTMLElement} cardEl  — the .board-card DOM element
   */
  function openDrawer(cardEl) {
    var drawer = document.getElementById("drawer");
    if (!drawer) { return; }

    var content = drawer.querySelector(".drawer-content");
    if (!content) { return; }

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

    try {
      content.innerHTML = _buildDrawerHtml(title, cardId, badges, timestamps);
    } catch (err) {
      _notifyError("HYDRATE_FAILED", "Drawer hydration failed", err, "hydrate");
      return;
    }
    drawer.classList.remove("hidden");

    _setupDrawerA11y(drawer, cardEl, content.querySelector(".drawer-close"));
    _attachDrawerHandlers(drawer);
  }

  /**
   * Close the detail drawer and re-apply the hidden class.
   */
  function closeDrawer() {
    var drawer = document.getElementById("drawer");
    if (!drawer) { return; }

    drawer.classList.add("hidden");

    // Remove backdrop click handler
    var onBackdrop = /** @type {HTMLElement & {_closeOnBackdrop: ((evt: MouseEvent) => void) | null}} */ (drawer)._closeOnBackdrop;
    if (onBackdrop) {
      drawer.removeEventListener("click", onBackdrop);
      /** @type {HTMLElement & {_closeOnBackdrop: ((evt: MouseEvent) => void) | null}} */ (drawer)._closeOnBackdrop = null;
    }

    // Remove Escape key / focus-trap handler
    var onKeyDown = /** @type {HTMLElement & {_onKeyDown: ((evt: KeyboardEvent) => void) | null}} */ (drawer)._onKeyDown;
    if (onKeyDown) {
      document.removeEventListener("keydown", onKeyDown);
      /** @type {HTMLElement & {_onKeyDown: ((evt: KeyboardEvent) => void) | null}} */ (drawer)._onKeyDown = null;
    }

    // Restore focus to the triggering card
    var triggeringCard = /** @type {HTMLElement & {_triggeringCard: HTMLElement | null}} */ (drawer)._triggeringCard;
    if (triggeringCard) {
      triggeringCard.setAttribute("aria-expanded", "false");
      triggeringCard.focus();
      /** @type {HTMLElement & {_triggeringCard: HTMLElement | null}} */ (drawer)._triggeringCard = null;
    }
  }

  /* ==================================================================
   * 6.  Gate caching
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
   * Return the list of column status_keys that are currently blocked.
   *
   * Nothing inside this file consumes it since the move control was
   * removed; it stays because consumers read it through
   * ``window.robotsixBoardInternals`` and prime the cache via
   * ``window.robotsixBoardSetGate`` (mill does exactly this).
   * @returns {string[]} Array of blocked column status keys.
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
   * @returns {GateData} Gate data with blocked_columns array.
   */
  function getGateData() {
    // Try to read from cache
    try {
      var raw = sessionStorage.getItem(GATE_CACHE_KEY);
      if (raw) {
        /** @type {GateData|null} */
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
    if (!_gateEndpoint) { return; }

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
        _notifyError("GATE_FAILED", "Gate fetch failed", err, "gate");
        console.warn("board.js: gate fetch failed:", err);
      });
  }

  /**
   * Store gate data in sessionStorage.  Callable externally via
   * ``window.robotsixBoardSetGate()`` so server-rendered pages can
   * prime the gate cache without an extra round-trip.
   * @param {GateData} data  — { blocked_columns: string[], ... }
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
   * @param {string} url - The gate endpoint URL.
   */
  function robotsixBoardSetGateEndpoint(url) {
    _gateEndpoint = url;
    // Prime the cache immediately
    fetchGateDataAsync();
  }

  /* ==================================================================
   * 7.  Closed-ticket toggle
   * ================================================================ */

  /** @type {string} localStorage key for the toggle preference. */
  var CLOSED_TOGGLE_KEY = "robotsix-board-show-closed";

  /**
   * Create a checkbox toggle before #board that shows / hides the
   * terminal "closed" column.  State is persisted in localStorage.
   */
  function attachClosedToggle() {
    var board = document.getElementById("board");
    if (!board) { return; }
    if (!CLOSED_KEY) { return; }

    // Idempotent — don't create duplicate toggles
    if (document.getElementById("board-closed-toggle")) { return; }

    var container = document.createElement("div");
    container.id = "board-closed-toggle";

    var label = document.createElement("label");

    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = "board-closed-checkbox";
    checkbox.checked = getClosedToggleState();

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(" Show closed"));

    container.appendChild(label);
    if (!board.parentNode) { return; }
    board.parentNode.insertBefore(container, board);

    // Apply initial visibility
    applyClosedToggle(checkbox.checked);

    checkbox.addEventListener("change", function () {
      applyClosedToggle(checkbox.checked);
      setClosedToggleState(checkbox.checked);
    });
  }

  /**
   * Get the closed-toggle state from localStorage.
   * @returns {boolean} True if closed column should be shown.
   */
  function getClosedToggleState() {
    try {
      return localStorage.getItem(CLOSED_TOGGLE_KEY) !== "false";
    } catch (_e) {
      return true; // default: show closed
    }
  }

  /**
   * Persist the closed-toggle state to localStorage.
   * @param {boolean} show - Whether to show the closed column.
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
   * @param {boolean} show - Whether to show the closed column.
   */
  function applyClosedToggle(show) {
    if (!CLOSED_KEY) { return; }
    var board = document.getElementById("board");
    if (!board) { return; }
    var col = findColumnByStatus(board, CLOSED_KEY);
    if (!col) { return; }

    if (show) {
      col.classList.remove("hidden");
    } else {
      col.classList.add("hidden");
    }
  }

  /* ==================================================================
   * 8.  Public API
   * ================================================================ */

  /**
   * Trigger an immediate refresh.  Safe to call at any time; is a
   * no-op if the board is not in json_hydration mode.  Exposed as
   * ``window.robotsixBoardRefresh()``.
   */
  function robotsixBoardRefresh() {
    if (!CFG || CFG.render_mode !== "json_hydration") { return; }
    doRefresh();
  }

  /**
   * Stop the periodic refresh poll started by ``startRefreshLoop()``.
   * Safe to call at any time; is a no-op if no timer is running.
   * Exposed as ``window.robotsixBoardStopRefresh()``.
   */
  function robotsixBoardStopRefresh() {
    if (_refreshTimer !== null) {
      clearInterval(_refreshTimer);
      _refreshTimer = null;
    }
  }

  /**
   * Change, at runtime, the URL the board polls for card data.  Sets
   * ``CFG.refresh_url`` — replacing the refresh source used by both
   * ``doRefresh()`` and the polling loop — then triggers an immediate
   * refresh so the change takes effect without waiting for the next
   * poll tick.  No-op if the board is not initialised (no config).
   * Exposed as ``window.robotsixBoardSetRefreshUrl()``.
   * @param {string} url - The new refresh URL.
   */
  function robotsixBoardSetRefreshUrl(url) {
    if (!CFG) { return; }
    CFG.refresh_url = url;
    doRefresh();
  }

  /**
   * Change, at runtime, the board's polling interval.  Stops the
   * current refresh timer and starts a new one at ``ms`` milliseconds.
   * No-op if the board is not initialised.
   * Exposed as ``window.robotsixBoardSetRefreshInterval()``.
   * @param {number} ms  — interval in milliseconds (>= 1000 recommended)
   */
  function robotsixBoardSetRefreshInterval(ms) {
    if (!CFG) { return; }
    CFG.refresh_interval_ms = ms;
    startRefreshLoop();  // clears old timer, starts new one at updated interval
  }

  /**
   * Register a consumer error callback.  The function receives a
   * structured error object: ``{code, message, cause, phase}``.
   * Pass ``null`` to unregister.
   * @param {Function|null} fn - Error callback or null.
   */
  function robotsixBoardOnError(fn) {
    _onErrorCallback = fn;
  }

  /**
   * Apply column-level ARIA attributes to the pre-rendered board DOM.
   * Ensures every .board-column-cards has role="list" and every
   * .board-column has aria-labelledby pointing to its <h2> heading.
   */
  function applyColumnA11y() {
    var board = document.getElementById("board");
    if (!board) { return; }

    var columns = board.querySelectorAll(".board-column");
    for (var i = 0; i < columns.length; i++) {
      var col = columns[i];

      // Ensure .board-column-cards has role="list"
      var cardsList = col.querySelector(".board-column-cards");
      if (cardsList && !cardsList.hasAttribute("role")) {
        cardsList.setAttribute("role", "list");
      }

      // Ensure .board-column has aria-labelledby pointing to its <h2>
      var h2 = col.querySelector(".board-column-label");
      if (h2) {
        var headingId = h2.getAttribute("id");
        if (!headingId) {
          var statusKey = col.getAttribute("data-status") || "col-" + i;
          headingId = "col-heading-" + statusKey;
          h2.setAttribute("id", headingId);
        }
        if (!col.hasAttribute("aria-labelledby")) {
          col.setAttribute("aria-labelledby", headingId);
        }
      }
    }
  }

  /* ==================================================================
   * 9.  Bootstrap
   * ================================================================ */

  /**
   * Initialise the board: parse config, attach event handlers, start
   * the refresh loop, and mount UI controls.
   */
  function init() {
    try {
      if (!bootConfig()) {
        return; // not json_hydration mode or missing config
      }

    attachDrawerDelegation();
    attachClosedToggle();
    applyColumnA11y();
    startRefreshLoop();
    } catch (err) {
      _notifyError("INIT_FAILED", "Board initialisation failed", err, "init");
      _renderErrorStub("The board failed to load. Please refresh the page.");
    }
  }

  // ── Wire up on DOM ready ─────────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // ── Expose public API on window ──────────────────────────────────
  var w = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (window));
  w["robotsixBoardRefresh"] = robotsixBoardRefresh;
  w["robotsixBoardStopRefresh"] = robotsixBoardStopRefresh;
  w["robotsixBoardSetGate"] = robotsixBoardSetGate;
  w["robotsixBoardSetGateEndpoint"] = robotsixBoardSetGateEndpoint;
  w["robotsixBoardSetRefreshUrl"] = robotsixBoardSetRefreshUrl;
  w["robotsixBoardSetRefreshInterval"] = robotsixBoardSetRefreshInterval;
  w["robotsixBoardOnError"] = robotsixBoardOnError;

  // Expose pure IIFE-private helpers so they can be unit-tested.
  w["robotsixBoardInternals"] = {
    esc: esc,
    bootConfig: bootConfig,
    _setupDrawerA11y: _setupDrawerA11y,
    hashStr: hashStr,
    agentColor: agentColor,
    updateColumnCounts: updateColumnCounts,
    findColumnByStatus: findColumnByStatus,
    appendCardToColumn: appendCardToColumn,
    getGateData: getGateData,
    getGateBlockedColumns: getGateBlockedColumns,
    getClosedToggleState: getClosedToggleState,
    setClosedToggleState: setClosedToggleState,
    applyClosedToggle: applyClosedToggle,
    buildCardElement: buildCardElement,
    _attachDrawerHandlers: _attachDrawerHandlers,
    _trapFocus: _trapFocus,
    _buildAgentBadgeElements: _buildAgentBadgeElements,
    _buildDrawerHtml: _buildDrawerHtml,
    applyCardDiff: applyCardDiff,
    openDrawer: openDrawer,
    closeDrawer: closeDrawer,
    attachClosedToggle: attachClosedToggle,
    startRefreshLoop: startRefreshLoop,
    stopRefreshLoop: robotsixBoardStopRefresh,
    doRefresh: doRefresh,
    fetchGateDataAsync: fetchGateDataAsync,
    attachDrawerDelegation: attachDrawerDelegation,
    applyColumnA11y: applyColumnA11y,
    init: init,
    _notifyError: _notifyError,
    _renderErrorStub: _renderErrorStub,
  };
})();
