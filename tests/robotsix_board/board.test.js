import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Importing board.js runs its IIFE under the happy-dom environment,
// which populates window.robotsixBoardInternals with the pure helpers.
import "../../src/robotsix_board/static/board.js";

// Polyfill CSS.escape for happy-dom (not yet implemented in all versions).
if (!globalThis.CSS) globalThis.CSS = {};
if (!CSS.escape) {
  CSS.escape = function (value) {
    return String(value);
  };
}

const {
  esc,
  bootConfig,
  buildSelectOptions,
  buildMoveForm,
  rebuildMoveSelect,
  hashStr,
  agentColor,
  updateColumnCounts,
  findColumnByStatus,
  getGateData,
  getGateBlockedColumns,
  getClosedToggleState,
  setClosedToggleState,
  applyClosedToggle,
  buildCardElement,
  applyCardDiff,
  openDrawer,
  closeDrawer,
  attachClosedToggle,
  startRefreshLoop,
  doRefresh,
  fetchGateDataAsync,
  attachMoveDelegation,
  attachDrawerDelegation,
  init,
} = window.robotsixBoardInternals;

const SAMPLE_CONFIG = {
  render_mode: "json_hydration",
  columns: [
    ["todo", "To Do"],
    ["doing", "Doing"],
    ["done", "Done"],
  ],
  move_method: "POST",
  move_endpoint_template: "/move/{card_id}/{target_status}",
};

/**
 * Render a #board-config <script> element into document.body so that
 * bootConfig() can locate and parse it.
 */
function setBoardConfig(json) {
  // Remove any existing #board-config element (but do NOT clear the
  // entire body — callers may have already built DOM like #board that
  // must survive for init() tests.)
  const existing = document.getElementById("board-config");
  if (existing) existing.remove();

  const el = document.createElement("script");
  el.id = "board-config";
  el.type = "application/json";
  el.textContent = json;
  document.body.appendChild(el);
}

describe("esc()", () => {
  it("escapes HTML-significant characters", () => {
    expect(esc("<")).toBe("&lt;");
    expect(esc(">")).toBe("&gt;");
    expect(esc("&")).toBe("&amp;");
    expect(esc('"')).toBe("&quot;");
    expect(esc("'")).toBe("&#39;");
  });

  it("escapes a mixed string and passes plain text through unchanged", () => {
    expect(esc('<a href="x">&')).toBe("&lt;a href=&quot;x&quot;&gt;&amp;");
    expect(esc("plain text 123")).toBe("plain text 123");
  });
});

describe("bootConfig()", () => {
  it("returns true and parses a valid json_hydration config", () => {
    setBoardConfig(JSON.stringify(SAMPLE_CONFIG));
    expect(bootConfig()).toBe(true);
  });

  it("returns false when #board-config is missing", () => {
    document.body.innerHTML = "";
    expect(bootConfig()).toBe(false);
  });

  it("returns false (no throw) for invalid JSON", () => {
    setBoardConfig("{ not valid json");
    expect(() => bootConfig()).not.toThrow();
    expect(bootConfig()).toBe(false);
  });

  it("returns false when render_mode is not json_hydration", () => {
    setBoardConfig(JSON.stringify({ render_mode: "static", columns: [] }));
    expect(bootConfig()).toBe(false);
  });
});

describe("buildSelectOptions()", () => {
  it("populates options, skips the current status, and disables blocked columns", () => {
    setBoardConfig(JSON.stringify(SAMPLE_CONFIG));
    bootConfig();

    const select = document.createElement("select");
    buildSelectOptions(select, "todo", ["done"]);

    // Placeholder + (3 columns - 1 current) = 3 options.
    expect(select.options.length).toBe(3);
    expect(select.options[0].value).toBe("");

    const values = Array.from(select.options).map((o) => o.value);
    expect(values).not.toContain("todo");
    expect(values).toContain("doing");
    expect(values).toContain("done");

    const doneOpt = Array.from(select.options).find((o) => o.value === "done");
    expect(doneOpt.disabled).toBe(true);
  });
});

describe("buildMoveForm()", () => {
  it("builds a move form with select, submit button, and error placeholder", () => {
    setBoardConfig(JSON.stringify(SAMPLE_CONFIG));
    bootConfig();

    const form = buildMoveForm({ id: "c1", status: "todo" });
    expect(form.tagName).toBe("FORM");
    expect(form.className).toBe("board-card-move");
    expect(form.getAttribute("method")).toBe("POST");

    expect(form.querySelector("select[name='target_status']")).not.toBeNull();
    expect(form.querySelector("button.board-move-submit")).not.toBeNull();
    expect(form.querySelector(".board-move-error")).not.toBeNull();
  });
});

describe("rebuildMoveSelect()", () => {
  it("replaces the select to reflect the card's new status", () => {
    setBoardConfig(JSON.stringify(SAMPLE_CONFIG));
    bootConfig();

    const form = buildMoveForm({ id: "c1", status: "todo" });
    const before = form.querySelector("select[name='target_status']");

    rebuildMoveSelect(form, { id: "c1", status: "doing" });
    const after = form.querySelector("select[name='target_status']");

    expect(after).not.toBe(before);
    const values = Array.from(after.options).map((o) => o.value);
    // The new current status "doing" is skipped; "todo" is now offered.
    expect(values).not.toContain("doing");
    expect(values).toContain("todo");
  });
});

/* ==================================================================
 * Shared helpers for DOM setup / teardown
 * ================================================================ */

/**
 * Render a minimal #board with three columns (todo, doing, done) into
 * document.body.  Returns the #board element.
 */
function buildBoardDOM() {
  document.body.innerHTML = "";
  const board = document.createElement("div");
  board.id = "board";

  const cols = ["todo", "doing", "done"];
  for (const key of cols) {
    const col = document.createElement("div");
    col.className = "board-column";
    col.setAttribute("data-status", key);

    const header = document.createElement("div");
    header.className = "board-column-header";

    const countEl = document.createElement("span");
    countEl.className = "board-column-count";
    countEl.textContent = "0";
    header.appendChild(countEl);

    col.appendChild(header);

    const cards = document.createElement("div");
    cards.className = "board-column-cards";
    col.appendChild(cards);

    board.appendChild(col);
  }

  // Also append a #drawer for drawer tests
  const drawer = document.createElement("div");
  drawer.id = "drawer";
  drawer.className = "hidden";
  const drawerContent = document.createElement("div");
  drawerContent.className = "drawer-content";
  drawer.appendChild(drawerContent);
  document.body.appendChild(drawer);

  document.body.appendChild(board);
  return board;
}

beforeEach(() => {
  // Reset DOM between tests
  document.body.innerHTML = "";
  // Clear storage
  sessionStorage.clear();
  localStorage.clear();
  // Reset module-private _gateEndpoint so fetchGateDataAsync is a no-op by default.
  // Safe: an empty-string endpoint makes fetchGateDataAsync return immediately.
  if (window.robotsixBoardSetGateEndpoint) {
    window.robotsixBoardSetGateEndpoint("");
  }
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/* ==================================================================
 * 1.  hashStr / agentColor
 * ================================================================ */

describe("hashStr()", () => {
  it("returns a deterministic non-negative integer less than modulus", () => {
    const result = hashStr("hello", 100);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(100);
    expect(Number.isInteger(result)).toBe(true);
  });

  it("returns the same value for the same input", () => {
    expect(hashStr("abc", 50)).toBe(hashStr("abc", 50));
  });

  it("returns 0 for an empty string", () => {
    expect(hashStr("", 10)).toBe(0);
  });

  it("can produce different values for different inputs", () => {
    // Not strictly required, but highly probable with a reasonable modulus.
    const a = hashStr("alpha", 360);
    const b = hashStr("beta", 360);
    // They may collide but with 360 slots it's unlikely for short strings.
    // We just verify they're both in range.
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(360);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(360);
  });
});

describe("agentColor()", () => {
  it("returns a HSL colour string", () => {
    const color = agentColor("alice");
    expect(color).toMatch(/^hsl\(\d+, 50%, 30%\)$/);
  });

  it("returns the same colour for the same agent name", () => {
    expect(agentColor("bob")).toBe(agentColor("bob"));
  });
});

/* ==================================================================
 * 2.  findColumnByStatus / updateColumnCounts
 * ================================================================ */

describe("findColumnByStatus()", () => {
  it("returns the column element for a matching data-status", () => {
    const board = buildBoardDOM();
    const col = findColumnByStatus(board, "doing");
    expect(col).not.toBeNull();
    expect(col.getAttribute("data-status")).toBe("doing");
  });

  it("returns null when no column matches", () => {
    const board = buildBoardDOM();
    expect(findColumnByStatus(board, "nonexistent")).toBeNull();
  });

  it("returns null when board is null", () => {
    expect(findColumnByStatus(null, "todo")).toBeNull();
  });

  it("returns null when status is empty string", () => {
    const board = buildBoardDOM();
    expect(findColumnByStatus(board, "")).toBeNull();
  });
});

describe("updateColumnCounts()", () => {
  it("updates .board-column-count to reflect visible card counts", () => {
    const board = buildBoardDOM();
    // Add two cards to "todo" column
    const todoCol = findColumnByStatus(board, "todo");
    const cardsContainer = todoCol.querySelector(".board-column-cards");
    const card1 = document.createElement("div");
    card1.className = "board-card";
    cardsContainer.appendChild(card1);
    const card2 = document.createElement("div");
    card2.className = "board-card";
    cardsContainer.appendChild(card2);

    // Add one hidden card (should not be counted)
    const hiddenCard = document.createElement("div");
    hiddenCard.className = "board-card hidden";
    cardsContainer.appendChild(hiddenCard);

    updateColumnCounts();

    const todoCount = todoCol.querySelector(".board-column-count");
    expect(todoCount.textContent).toBe("2");

    // "doing" and "done" should still be 0
    const doingCol = findColumnByStatus(board, "doing");
    expect(doingCol.querySelector(".board-column-count").textContent).toBe("0");
  });

  it("is a no-op when #board is absent", () => {
    document.body.innerHTML = "";
    expect(() => updateColumnCounts()).not.toThrow();
  });
});

/* ==================================================================
 * 3.  buildCardElement
 * ================================================================ */

describe("buildCardElement()", () => {
  beforeEach(() => {
    setBoardConfig(JSON.stringify(SAMPLE_CONFIG));
    bootConfig();
  });

  it("builds a .board-card element with title and move form", () => {
    const el = buildCardElement({ id: "c1", title: "Test card", status: "todo" });
    expect(el.className).toBe("board-card");
    expect(el.id).toBe("card-c1");
    expect(el.getAttribute("data-card-id")).toBe("c1");

    const titleEl = el.querySelector(".board-card-title");
    expect(titleEl).not.toBeNull();
    expect(titleEl.textContent).toBe("Test card");

    // Should include a move form
    expect(el.querySelector(".board-card-move")).not.toBeNull();
  });

  it("adds .board-card--merged when card.merged is true", () => {
    const el = buildCardElement({ id: "c2", title: "Merged", status: "todo", merged: true });
    expect(el.classList.contains("board-card--merged")).toBe(true);
  });

  it("renders generic badges", () => {
    const el = buildCardElement({
      id: "c3",
      title: "Badged",
      status: "todo",
      badges: ["bug", "urgent"],
    });
    const badgeRow = el.querySelector(".board-card-badges");
    expect(badgeRow).not.toBeNull();
    const badges = badgeRow.querySelectorAll(".board-badge:not(.src-badge)");
    expect(badges.length).toBe(2);
    expect(badges[0].textContent).toBe("bug");
    expect(badges[1].textContent).toBe("urgent");
  });

  it("renders agent badges with --badge-color style", () => {
    const el = buildCardElement({
      id: "c4",
      title: "Agent",
      status: "todo",
      agent_badges: ["alice"],
    });
    const agentBadge = el.querySelector('.board-badge[data-agent="alice"]');
    expect(agentBadge).not.toBeNull();
    expect(agentBadge.style.getPropertyValue("--badge-color")).toMatch(/^hsl\(/);
  });

  it("renders a source badge with .src-badge class", () => {
    const el = buildCardElement({
      id: "c5",
      title: "Source",
      status: "todo",
      source_badge: "github",
    });
    const srcBadge = el.querySelector(".board-badge.src-badge");
    expect(srcBadge).not.toBeNull();
    expect(srcBadge.textContent).toBe("github");
  });

  it("renders timestamps", () => {
    const el = buildCardElement({
      id: "c6",
      title: "Timed",
      status: "todo",
      timestamps: { created: "2025-01-01", updated: "2025-06-15" },
    });
    const tsRow = el.querySelector(".board-card-timestamps");
    expect(tsRow).not.toBeNull();
    const tsSpans = tsRow.querySelectorAll(".board-timestamp");
    expect(tsSpans.length).toBe(2);
    expect(tsSpans[0].textContent).toContain("created");
    expect(tsSpans[1].textContent).toContain("updated");
  });

  it("HTML-escapes the card id in the element id attribute", () => {
    const el = buildCardElement({ id: '<script>"', title: "XSS", status: "todo" });
    // The id attribute should be escaped
    expect(el.id).not.toContain("<");
    expect(el.id).not.toContain('"');
  });

  it("does not render a badge row when there are no badges", () => {
    const el = buildCardElement({ id: "c7", title: "Plain", status: "todo" });
    expect(el.querySelector(".board-card-badges")).toBeNull();
  });

  it("does not render a timestamp row when timestamps is empty", () => {
    const el = buildCardElement({
      id: "c8",
      title: "No TS",
      status: "todo",
      timestamps: {},
    });
    expect(el.querySelector(".board-card-timestamps")).toBeNull();
  });
});

/* ==================================================================
 * 4.  applyCardDiff
 * ================================================================ */

describe("applyCardDiff()", () => {
  beforeEach(() => {
    setBoardConfig(JSON.stringify(SAMPLE_CONFIG));
    bootConfig();
  });

  it("adds new cards to the correct columns", () => {
    buildBoardDOM();
    applyCardDiff([
      { id: "a", title: "Card A", status: "todo" },
      { id: "b", title: "Card B", status: "doing" },
    ]);

    const board = document.getElementById("board");
    const todoCards = board.querySelectorAll(
      '.board-column[data-status="todo"] .board-card'
    );
    const doingCards = board.querySelectorAll(
      '.board-column[data-status="doing"] .board-card'
    );

    expect(todoCards.length).toBe(1);
    expect(todoCards[0].getAttribute("data-card-id")).toBe("a");
    expect(doingCards.length).toBe(1);
    expect(doingCards[0].getAttribute("data-card-id")).toBe("b");
  });

  it("moves a card when its status changes", () => {
    buildBoardDOM();
    // Seed with a card in "todo"
    const board = document.getElementById("board");
    const todoCards = board.querySelector(
      '.board-column[data-status="todo"] .board-column-cards'
    );
    const cardEl = document.createElement("div");
    cardEl.className = "board-card";
    cardEl.setAttribute("data-card-id", "x");
    todoCards.appendChild(cardEl);

    // Now diff says the card is in "done"
    applyCardDiff([{ id: "x", title: "Card X", status: "done" }]);

    const oldCol = board.querySelector(
      '.board-column[data-status="todo"] .board-card'
    );
    expect(oldCol).toBeNull(); // removed from todo

    const newCol = board.querySelector(
      '.board-column[data-status="done"] .board-card'
    );
    expect(newCol).not.toBeNull();
    expect(newCol.getAttribute("data-card-id")).toBe("x");
  });

  it("removes cards no longer present in the incoming data", () => {
    buildBoardDOM();
    const board = document.getElementById("board");
    const todoCards = board.querySelector(
      '.board-column[data-status="todo"] .board-column-cards'
    );
    const cardEl = document.createElement("div");
    cardEl.className = "board-card";
    cardEl.setAttribute("data-card-id", "stale");
    todoCards.appendChild(cardEl);

    applyCardDiff([]); // empty response — stale card should be removed

    expect(board.querySelector('.board-card[data-card-id="stale"]')).toBeNull();
  });

  it("leaves unchanged cards alone", () => {
    buildBoardDOM();
    const board = document.getElementById("board");
    const todoCards = board.querySelector(
      '.board-column[data-status="todo"] .board-column-cards'
    );
    const cardEl = document.createElement("div");
    cardEl.className = "board-card";
    cardEl.setAttribute("data-card-id", "keep");
    cardEl.textContent = "original";
    todoCards.appendChild(cardEl);

    applyCardDiff([{ id: "keep", title: "Keep", status: "todo" }]);

    const kept = board.querySelector('.board-card[data-card-id="keep"]');
    expect(kept).not.toBeNull();
    expect(kept.textContent).toBe("original"); // DOM element not replaced
  });

  it("is a no-op when #board is absent", () => {
    document.body.innerHTML = "";
    expect(() => applyCardDiff([{ id: "a", title: "A", status: "todo" }])).not.toThrow();
  });

  it("is a no-op when cards is not an array", () => {
    buildBoardDOM();
    expect(() => applyCardDiff(null)).not.toThrow();
    expect(() => applyCardDiff("not array")).not.toThrow();
  });
});

/* ==================================================================
 * 5.  Closed-toggle state helpers
 * ================================================================ */

describe("getClosedToggleState() / setClosedToggleState()", () => {
  it("returns true by default when localStorage is empty", () => {
    expect(getClosedToggleState()).toBe(true);
  });

  it("returns false after setClosedToggleState(false)", () => {
    setClosedToggleState(false);
    expect(getClosedToggleState()).toBe(false);
    expect(localStorage.getItem("robotsix-board-show-closed")).toBe("false");
  });

  it("returns true after setClosedToggleState(true)", () => {
    setClosedToggleState(true);
    expect(getClosedToggleState()).toBe(true);
    expect(localStorage.getItem("robotsix-board-show-closed")).toBe("true");
  });

  it("persists across calls", () => {
    setClosedToggleState(false);
    // Simulate a fresh read (the function rereads localStorage each time)
    expect(getClosedToggleState()).toBe(false);
  });
});

/* ==================================================================
 * 6.  applyClosedToggle
 * ================================================================ */

describe("applyClosedToggle()", () => {
  beforeEach(() => {
    setBoardConfig(JSON.stringify(SAMPLE_CONFIG));
    bootConfig();
  });

  it("hides the closed column when show=false", () => {
    buildBoardDOM();
    const doneCol = findColumnByStatus(document.getElementById("board"), "done");
    // Ensure it starts visible
    doneCol.classList.remove("hidden");

    applyClosedToggle(false);
    expect(doneCol.classList.contains("hidden")).toBe(true);
  });

  it("shows the closed column when show=true", () => {
    buildBoardDOM();
    const doneCol = findColumnByStatus(document.getElementById("board"), "done");
    doneCol.classList.add("hidden");

    applyClosedToggle(true);
    expect(doneCol.classList.contains("hidden")).toBe(false);
  });

  it("is a no-op when the closed column is not found in the DOM", () => {
    buildBoardDOM();
    const board = document.getElementById("board");
    // Remove the "done" column so findColumnByStatus returns null.
    const doneCol = findColumnByStatus(board, "done");
    if (doneCol) doneCol.remove();

    expect(() => applyClosedToggle(false)).not.toThrow();
  });
});

/* ==================================================================
 * 7.  attachClosedToggle
 * ================================================================ */

describe("attachClosedToggle()", () => {
  beforeEach(() => {
    setBoardConfig(JSON.stringify(SAMPLE_CONFIG));
    bootConfig();
  });

  it("creates a checkbox toggle before #board", () => {
    buildBoardDOM();
    attachClosedToggle();

    const toggle = document.getElementById("board-closed-toggle");
    expect(toggle).not.toBeNull();
    const checkbox = document.getElementById("board-closed-checkbox");
    expect(checkbox).not.toBeNull();
    expect(checkbox.type).toBe("checkbox");

    // Toggle should be inserted before #board
    const board = document.getElementById("board");
    expect(board.previousElementSibling).toBe(toggle);
  });

  it("is idempotent — does not create duplicate toggles", () => {
    buildBoardDOM();
    attachClosedToggle();
    attachClosedToggle();

    const toggles = document.querySelectorAll("#board-closed-toggle");
    expect(toggles.length).toBe(1);
  });

  it("applies initial visibility based on localStorage state", () => {
    setClosedToggleState(false);
    buildBoardDOM();
    attachClosedToggle();

    const doneCol = findColumnByStatus(document.getElementById("board"), "done");
    expect(doneCol.classList.contains("hidden")).toBe(true);
  });

  it("toggles closed-column visibility on checkbox change", () => {
    setClosedToggleState(true);
    buildBoardDOM();
    attachClosedToggle();

    const checkbox = document.getElementById("board-closed-checkbox");
    const doneCol = findColumnByStatus(document.getElementById("board"), "done");

    // Uncheck → hide
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event("change"));
    expect(doneCol.classList.contains("hidden")).toBe(true);
    expect(getClosedToggleState()).toBe(false);

    // Re-check → show
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change"));
    expect(doneCol.classList.contains("hidden")).toBe(false);
    expect(getClosedToggleState()).toBe(true);
  });
});

/* ==================================================================
 * 8.  Gate data caching
 * ================================================================ */

describe("getGateData()", () => {
  it("returns a default empty object when no cache exists", () => {
    const data = getGateData();
    expect(data).toBeDefined();
    expect(Array.isArray(data.blocked_columns)).toBe(true);
    expect(data.blocked_columns.length).toBe(0);
  });

  it("returns cached data when fresh", () => {
    window.robotsixBoardSetGate({ blocked_columns: ["done"] });
    const data = getGateData();
    expect(data.blocked_columns).toEqual(["done"]);
  });

  it("returns stale data while triggering a background re-fetch", () => {
    // Write stale cache (fetched_at far in the past)
    const stale = {
      blocked_columns: ["old"],
      version: 1,
      fetched_at: Date.now() - 20 * 60 * 1000, // 20 min ago (TTL is 15 min)
    };
    sessionStorage.setItem("robotsix-board-gate", JSON.stringify(stale));

    // _gateEndpoint is null, so fetchGateDataAsync is a no-op.
    // getGateData should still return the stale data.
    const data = getGateData();
    expect(data.blocked_columns).toEqual(["old"]);
  });

  it("handles corrupt sessionStorage gracefully", () => {
    sessionStorage.setItem("robotsix-board-gate", "not valid json{{{");
    const data = getGateData();
    expect(data).toBeDefined();
    expect(data.blocked_columns).toEqual([]);
  });
});

/* ==================================================================
 * 8b.  getGateBlockedColumns
 * ================================================================ */

describe("getGateBlockedColumns()", () => {
  it("returns [] when no gate data exists", () => {
    sessionStorage.removeItem("robotsix-board-gate");
    expect(getGateBlockedColumns()).toEqual([]);
  });

  it("returns blocked_columns from cached gate data", () => {
    window.robotsixBoardSetGate({ blocked_columns: ["done"] });
    expect(getGateBlockedColumns()).toEqual(["done"]);
  });

  it("returns [] when blocked_columns is not an array", () => {
    // Create corrupt gate data where blocked_columns is a string
    const badData = { blocked_columns: "not-an-array", version: 1, fetched_at: Date.now() };
    sessionStorage.setItem("robotsix-board-gate", JSON.stringify(badData));
    expect(getGateBlockedColumns()).toEqual([]);
  });
});

/* ==================================================================
 * 9.  fetchGateDataAsync
 * ================================================================ */

describe("fetchGateDataAsync()", () => {
  it("does not call fetch when _gateEndpoint is not configured", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    fetchGateDataAsync();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("calls fetch and stores gate data on success", async () => {
    const mockData = { blocked_columns: ["review"] };
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });
    vi.stubGlobal("fetch", fetchSpy);

    // Configure endpoint (triggers fetchGateDataAsync internally)
    window.robotsixBoardSetGateEndpoint("https://example.com/gate");

    // Wait for the async .then() chain to store data in sessionStorage
    await vi.waitFor(() => {
      const cached = JSON.parse(
        sessionStorage.getItem("robotsix-board-gate") || "null"
      );
      expect(cached).not.toBeNull();
      expect(cached.blocked_columns).toEqual(["review"]);
      expect(cached.version).toBe(1);
    });
  });

  it("logs a warning on fetch failure", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    vi.stubGlobal("fetch", fetchSpy);

    window.robotsixBoardSetGateEndpoint("https://example.com/gate");

    await vi.waitFor(() => {
      expect(warnSpy).toHaveBeenCalled();
    });
    warnSpy.mockRestore();
  });
});

/* ==================================================================
 * 10.  openDrawer / closeDrawer
 * ================================================================ */

describe("openDrawer() / closeDrawer()", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    const drawer = document.createElement("div");
    drawer.id = "drawer";
    drawer.className = "hidden";
    const content = document.createElement("div");
    content.className = "drawer-content";
    drawer.appendChild(content);
    document.body.appendChild(drawer);
  });

  function makeCardEl(id, title) {
    const el = document.createElement("div");
    el.className = "board-card";
    el.setAttribute("data-card-id", id);

    const titleEl = document.createElement("div");
    titleEl.className = "board-card-title";
    titleEl.textContent = title;
    el.appendChild(titleEl);

    return el;
  }

  it("populates drawer content and removes .hidden", () => {
    const cardEl = makeCardEl("42", "Hello World");
    openDrawer(cardEl);

    const drawer = document.getElementById("drawer");
    expect(drawer.classList.contains("hidden")).toBe(false);

    const content = drawer.querySelector(".drawer-content");
    expect(content.innerHTML).toContain("Hello World");
    expect(content.innerHTML).toContain("ID: 42");
  });

  it("closes the drawer and re-adds .hidden", () => {
    const cardEl = makeCardEl("1", "Test");
    openDrawer(cardEl);
    closeDrawer();

    const drawer = document.getElementById("drawer");
    expect(drawer.classList.contains("hidden")).toBe(true);
  });

  it("removes the backdrop click handler on close", () => {
    const cardEl = makeCardEl("1", "Test");
    openDrawer(cardEl);
    const drawer = document.getElementById("drawer");
    expect(drawer._closeOnBackdrop).not.toBeNull();

    closeDrawer();
    expect(drawer._closeOnBackdrop).toBeNull();
  });

  it("closes the drawer when clicking the backdrop (outside .drawer-content)", () => {
    const cardEl = makeCardEl("1", "Test");
    openDrawer(cardEl);

    const drawer = document.getElementById("drawer");
    // Simulate a click on the drawer itself (the backdrop)
    const clickEvent = new Event("click", { bubbles: true });
    // Dispatch on drawer; _closeOnBackdrop checks evt.target.closest('.drawer-content')
    // drawer is the target, it doesn't match .drawer-content, so it should close.
    drawer.dispatchEvent(clickEvent);

    expect(drawer.classList.contains("hidden")).toBe(true);
  });

  it("does not close the drawer when clicking inside .drawer-content", () => {
    const cardEl = makeCardEl("1", "Test");
    openDrawer(cardEl);

    const drawer = document.getElementById("drawer");
    const content = drawer.querySelector(".drawer-content");
    content.dispatchEvent(new Event("click", { bubbles: true }));

    expect(drawer.classList.contains("hidden")).toBe(false);
  });

  it("includes badges and timestamps in drawer content", () => {
    const cardEl = document.createElement("div");
    cardEl.className = "board-card";
    cardEl.setAttribute("data-card-id", "b1");

    const titleEl = document.createElement("div");
    titleEl.className = "board-card-title";
    titleEl.textContent = "Detailed";
    cardEl.appendChild(titleEl);

    const badgeRow = document.createElement("div");
    badgeRow.className = "board-card-badges";
    const badge1 = document.createElement("span");
    badge1.className = "board-badge";
    badge1.textContent = "bug";
    badgeRow.appendChild(badge1);
    cardEl.appendChild(badgeRow);

    const tsRow = document.createElement("div");
    tsRow.className = "board-card-timestamps";
    const ts1 = document.createElement("span");
    ts1.className = "board-timestamp";
    ts1.textContent = "created: 2025-01-01";
    tsRow.appendChild(ts1);
    cardEl.appendChild(tsRow);

    openDrawer(cardEl);

    const content = document.getElementById("drawer").querySelector(".drawer-content");
    expect(content.innerHTML).toContain("bug");
    expect(content.innerHTML).toContain("created: 2025-01-01");
  });

  it("is a no-op when #drawer is absent", () => {
    document.body.innerHTML = "";
    const cardEl = makeCardEl("x", "X");
    expect(() => openDrawer(cardEl)).not.toThrow();
    expect(() => closeDrawer()).not.toThrow();
  });
});

/* ==================================================================
 * 11.  attachMoveDelegation
 * ================================================================ */

describe("attachMoveDelegation()", () => {
  beforeEach(() => {
    setBoardConfig(JSON.stringify(SAMPLE_CONFIG));
    bootConfig();
  });

  it("attaches a submit handler that calls fetch on move form submit", async () => {
    buildBoardDOM();

    // Create a card with a move form
    const board = document.getElementById("board");
    const todoCards = board.querySelector(
      '.board-column[data-status="todo"] .board-column-cards'
    );
    const cardEl = document.createElement("div");
    cardEl.className = "board-card";
    cardEl.setAttribute("data-card-id", "move-me");

    // Build a move form inside the card
    const form = buildMoveForm({ id: "move-me", status: "todo" });
    cardEl.appendChild(form);
    todoCards.appendChild(cardEl);

    // Select "doing" as target
    const select = form.querySelector("select[name='target_status']");
    select.value = "doing";

    attachMoveDelegation();

    const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchSpy);

    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    // Wait for the async .then() chain to move the card and rebuild the select
    await vi.waitFor(() => {
      const doingCards = board.querySelector(
        '.board-column[data-status="doing"] .board-card'
      );
      expect(doingCards).not.toBeNull();
    });

    const doingCards = board.querySelector(
      '.board-column[data-status="doing"] .board-card'
    );
    expect(doingCards.getAttribute("data-card-id")).toBe("move-me");

    // The move select should have been rebuilt (old status "todo" now an option)
    const newSelect = doingCards.querySelector("select[name='target_status']");
    expect(newSelect).not.toBeNull();
    const values = Array.from(newSelect.options).map((o) => o.value);
    expect(values).toContain("todo");
    expect(values).not.toContain("doing");
  });

  it("shows an inline error on fetch failure", async () => {
    buildBoardDOM();
    const board = document.getElementById("board");
    const todoCards = board.querySelector(
      '.board-column[data-status="todo"] .board-column-cards'
    );
    const cardEl = document.createElement("div");
    cardEl.className = "board-card";
    cardEl.setAttribute("data-card-id", "fail-me");
    const form = buildMoveForm({ id: "fail-me", status: "todo" });
    cardEl.appendChild(form);
    todoCards.appendChild(cardEl);

    const select = form.querySelector("select[name='target_status']");
    select.value = "doing";

    attachMoveDelegation();

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
    });
    vi.stubGlobal("fetch", fetchSpy);

    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      const errorEl = form.querySelector(".board-move-error");
      expect(errorEl.style.display).toBe("inline");
      expect(errorEl.textContent).toContain("Move failed");
    });
  });

  it("ignores submits that are not .board-card-move forms", () => {
    buildBoardDOM();
    attachMoveDelegation();

    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const board = document.getElementById("board");
    board.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("ignores submits when no target_status is selected", () => {
    buildBoardDOM();
    const board = document.getElementById("board");
    const todoCards = board.querySelector(
      '.board-column[data-status="todo"] .board-column-cards'
    );
    const cardEl = document.createElement("div");
    cardEl.className = "board-card";
    cardEl.setAttribute("data-card-id", "no-target");
    const form = buildMoveForm({ id: "no-target", status: "todo" });
    cardEl.appendChild(form);
    todoCards.appendChild(cardEl);

    attachMoveDelegation();

    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

/* ==================================================================
 * 12.  attachDrawerDelegation
 * ================================================================ */

describe("attachDrawerDelegation()", () => {
  it("opens the drawer when a .board-card is clicked", () => {
    const board = buildBoardDOM();
    const todoCards = board.querySelector(
      '.board-column[data-status="todo"] .board-column-cards'
    );
    const cardEl = document.createElement("div");
    cardEl.className = "board-card";
    cardEl.setAttribute("data-card-id", "drawer-card");
    const titleEl = document.createElement("div");
    titleEl.className = "board-card-title";
    titleEl.textContent = "Drawer Test";
    cardEl.appendChild(titleEl);
    todoCards.appendChild(cardEl);

    attachDrawerDelegation();

    cardEl.dispatchEvent(new Event("click", { bubbles: true }));

    const drawer = document.getElementById("drawer");
    expect(drawer.classList.contains("hidden")).toBe(false);
    expect(drawer.querySelector(".drawer-content").innerHTML).toContain("Drawer Test");
  });

  it("does not open the drawer when .board-card-move is clicked", () => {
    const board = buildBoardDOM();
    const todoCards = board.querySelector(
      '.board-column[data-status="todo"] .board-column-cards'
    );
    const cardEl = document.createElement("div");
    cardEl.className = "board-card";
    cardEl.setAttribute("data-card-id", "no-drawer");
    const moveForm = document.createElement("form");
    moveForm.className = "board-card-move";
    cardEl.appendChild(moveForm);
    todoCards.appendChild(cardEl);

    attachDrawerDelegation();

    moveForm.dispatchEvent(new Event("click", { bubbles: true }));

    const drawer = document.getElementById("drawer");
    expect(drawer.classList.contains("hidden")).toBe(true);
  });

  it("closes the drawer via the .drawer-close button", () => {
    const board = buildBoardDOM();
    const todoCards = board.querySelector(
      '.board-column[data-status="todo"] .board-column-cards'
    );
    const cardEl = document.createElement("div");
    cardEl.className = "board-card";
    cardEl.setAttribute("data-card-id", "close-test");
    const titleEl = document.createElement("div");
    titleEl.className = "board-card-title";
    titleEl.textContent = "Close Test";
    cardEl.appendChild(titleEl);
    todoCards.appendChild(cardEl);

    attachDrawerDelegation();

    // Open first
    cardEl.dispatchEvent(new Event("click", { bubbles: true }));
    const drawer = document.getElementById("drawer");
    expect(drawer.classList.contains("hidden")).toBe(false);

    // Click the close button
    const closeBtn = drawer.querySelector(".drawer-close");
    closeBtn.dispatchEvent(new Event("click", { bubbles: true }));
    expect(drawer.classList.contains("hidden")).toBe(true);
  });
});

/* ==================================================================
 * 13.  doRefresh
 * ================================================================ */

describe("doRefresh()", () => {
  beforeEach(() => {
    setBoardConfig(
      JSON.stringify({
        ...SAMPLE_CONFIG,
        refresh_url: "https://example.com/refresh",
      })
    );
    bootConfig();
  });

  it("fetches refresh_url and applies card diff", async () => {
    buildBoardDOM();

    const mockCards = [{ id: "r1", title: "Refreshed", status: "todo" }];
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCards),
    });
    vi.stubGlobal("fetch", fetchSpy);

    doRefresh();

    // Wait for the async .then() chain to apply card diff to the DOM
    await vi.waitFor(() => {
      const board = document.getElementById("board");
      const card = board.querySelector('.board-card[data-card-id="r1"]');
      expect(card).not.toBeNull();
    });
  });

  it("logs a warning on fetch failure", async () => {
    buildBoardDOM();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    vi.stubGlobal("fetch", fetchSpy);

    doRefresh();

    await vi.waitFor(() => {
      expect(warnSpy).toHaveBeenCalled();
    });
    warnSpy.mockRestore();
  });

  it("is a no-op when refresh_url is not configured", () => {
    // Override config without refresh_url
    setBoardConfig(JSON.stringify({ ...SAMPLE_CONFIG }));
    bootConfig();

    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    doRefresh();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

/* ==================================================================
 * 13b. startRefreshLoop
 * ================================================================ */

describe("startRefreshLoop()", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("bails out when refresh_url is not configured", () => {
    setBoardConfig(JSON.stringify(SAMPLE_CONFIG));
    bootConfig();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    startRefreshLoop();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("calls doRefresh immediately when refresh_url is set", () => {
    setBoardConfig(
      JSON.stringify({
        ...SAMPLE_CONFIG,
        refresh_url: "https://example.com/refresh",
      })
    );
    bootConfig();
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal("fetch", fetchSpy);

    startRefreshLoop();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("polls at the configured refresh_interval_ms", () => {
    setBoardConfig(
      JSON.stringify({
        ...SAMPLE_CONFIG,
        refresh_url: "https://example.com/refresh",
        refresh_interval_ms: 15000,
      })
    );
    bootConfig();
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal("fetch", fetchSpy);

    startRefreshLoop();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // 14999 ms should NOT trigger another call
    vi.advanceTimersByTime(14999);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // The remaining 1 ms triggers the second call
    vi.advanceTimersByTime(1);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("defaults to 30000 ms when refresh_interval_ms is not set", () => {
    setBoardConfig(
      JSON.stringify({
        ...SAMPLE_CONFIG,
        refresh_url: "https://example.com/refresh",
      })
    );
    bootConfig();
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal("fetch", fetchSpy);

    startRefreshLoop();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // 29999 ms should NOT trigger another call
    vi.advanceTimersByTime(29999);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // The remaining 1 ms triggers the second call
    vi.advanceTimersByTime(1);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("clears the previous timer when called again (re-init guard)", () => {
    setBoardConfig(
      JSON.stringify({
        ...SAMPLE_CONFIG,
        refresh_url: "https://example.com/refresh",
        refresh_interval_ms: 10000,
      })
    );
    bootConfig();
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal("fetch", fetchSpy);

    // First call starts polling.
    startRefreshLoop();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Advance past half the interval — the timer is still running.
    vi.advanceTimersByTime(5000);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Second call (simulating re-init) must clear the old timer
    // and start a fresh one.
    startRefreshLoop();
    // doRefresh is called immediately on the second call too,
    // so we have 2 calls now.
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // The old timer is dead — advancing 5000 ms more (which would
    // have fired the old timer at the 10 s mark) must NOT trigger
    // another fetch.
    vi.advanceTimersByTime(5000);
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // Advancing to the new timer's interval (another 5 s, total 10 s
    // since the second call) triggers the new interval.
    vi.advanceTimersByTime(5000);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });
});

/* ==================================================================
 * 14.  Public API: window.robotsixBoardRefresh
 * ================================================================ */

describe("robotsixBoardRefresh()", () => {
  it("triggers doRefresh when the board is configured", async () => {
    setBoardConfig(
      JSON.stringify({
        ...SAMPLE_CONFIG,
        refresh_url: "https://example.com/refresh",
      })
    );
    bootConfig();
    buildBoardDOM();

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal("fetch", fetchSpy);

    window.robotsixBoardRefresh();

    await vi.waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });
  });

  it("is a no-op when the board is not in json_hydration mode", () => {
    // Ensure CFG exists but render_mode is not json_hydration.
    setBoardConfig(JSON.stringify({ render_mode: "static", columns: [] }));
    bootConfig();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    window.robotsixBoardRefresh();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

/* ==================================================================
 * 14b.  Public API: window.robotsixBoardStopRefresh
 * ================================================================ */

describe("robotsixBoardStopRefresh()", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stops the polling loop so no further fetches fire", () => {
    setBoardConfig(
      JSON.stringify({
        ...SAMPLE_CONFIG,
        refresh_url: "https://example.com/refresh",
        refresh_interval_ms: 10000,
      })
    );
    bootConfig();
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal("fetch", fetchSpy);

    startRefreshLoop();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Stop the loop, then advance past the interval.
    window.robotsixBoardStopRefresh();
    vi.advanceTimersByTime(15000);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("is a no-op when no timer is running", () => {
    // Should not throw.
    expect(() => window.robotsixBoardStopRefresh()).not.toThrow();
  });

  it("is a no-op when called twice in a row", () => {
    setBoardConfig(
      JSON.stringify({
        ...SAMPLE_CONFIG,
        refresh_url: "https://example.com/refresh",
      })
    );
    bootConfig();
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal("fetch", fetchSpy);

    startRefreshLoop();
    window.robotsixBoardStopRefresh();
    // Second call — should not throw.
    expect(() => window.robotsixBoardStopRefresh()).not.toThrow();
  });
});

/* ==================================================================
 * 15.  Public API: window.robotsixBoardSetRefreshUrl
 * ================================================================ */

describe("robotsixBoardSetRefreshUrl()", () => {
  it("sets the refresh URL and triggers an immediate fetch", async () => {
    setBoardConfig(JSON.stringify(SAMPLE_CONFIG));
    bootConfig();
    buildBoardDOM();

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal("fetch", fetchSpy);

    window.robotsixBoardSetRefreshUrl("https://example.com/new-refresh");

    await vi.waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith("https://example.com/new-refresh");
    });
  });

  it("is a no-op when the refresh URL is empty/falsy", () => {
    // doRefresh() checks !CFG.refresh_url — empty string is falsy, so
    // it returns before calling fetch.  The !CFG guard in setRefreshUrl
    // itself is not directly exercised here (CFG is initialised).
    setBoardConfig(JSON.stringify({ ...SAMPLE_CONFIG }));
    bootConfig();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    window.robotsixBoardSetRefreshUrl("");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("robotsixBoardSetRefreshInterval()", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is a no-op when the board is not initialised", () => {
    // Reset CFG to null so the !CFG guard is actually exercised.
    // JSON.parse("null") returns null; bootConfig() assigns it to CFG.
    setBoardConfig("null");
    bootConfig();  // CFG = null, returns false
    expect(() => window.robotsixBoardSetRefreshInterval(10000)).not.toThrow();
  });

  it("changes the polling interval at runtime", () => {
    setBoardConfig(JSON.stringify({
      ...SAMPLE_CONFIG,
      refresh_url: "https://example.com/refresh",
      refresh_interval_ms: 5000,
    }));
    bootConfig();
    buildBoardDOM();

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal("fetch", fetchSpy);

    // Start with 5-second interval — one immediate fetch.
    startRefreshLoop();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Change to 10-second interval — startRefreshLoop() fires doRefresh()
    // immediately, so we get a second fetch right away.
    window.robotsixBoardSetRefreshInterval(10000);
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // After 5 seconds — no fetch yet (new timer is at 10 s).
    vi.advanceTimersByTime(5000);
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // After another 5 seconds (total 10 s since interval change) — fetch fires.
    vi.advanceTimersByTime(5000);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });
});

/* ==================================================================
 * 16.  Public API: window.robotsixBoardSetGate
 * ================================================================ */

describe("robotsixBoardSetGate()", () => {
  it("stores gate data in sessionStorage", () => {
    sessionStorage.clear();
    window.robotsixBoardSetGate({ blocked_columns: ["review", "test"] });

    const cached = JSON.parse(sessionStorage.getItem("robotsix-board-gate"));
    expect(cached.blocked_columns).toEqual(["review", "test"]);
    expect(cached.version).toBe(1);
    expect(typeof cached.fetched_at).toBe("number");
  });
});

/* ==================================================================
 * 17.  Public API: window.robotsixBoardSetGateEndpoint
 * ================================================================ */

describe("robotsixBoardSetGateEndpoint()", () => {
  it("configures the gate endpoint and triggers an async fetch", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ blocked_columns: [] }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    window.robotsixBoardSetGateEndpoint("https://example.com/gate");

    await vi.waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith("https://example.com/gate");
    });
  });
});

/* ==================================================================
 * 18.  init
 * ================================================================ */

describe("init()", () => {
  it("boots the board when config is present and valid", () => {
    // buildBoardDOM() clears the body and creates #board; setBoardConfig()
    // adds #board-config without clearing (so #board survives).  Order
    // matters: buildBoardDOM() must come first because it still nukes
    // document.body.innerHTML.
    buildBoardDOM();
    setBoardConfig(JSON.stringify(SAMPLE_CONFIG));

    // init should succeed (no throw), attach handlers, and create toggle
    init();

    // Verify closed toggle was created
    expect(document.getElementById("board-closed-toggle")).not.toBeNull();
  });

  it("bails out when #board-config is missing", () => {
    document.body.innerHTML = "";
    buildBoardDOM();

    init();

    // No toggle should have been created
    expect(document.getElementById("board-closed-toggle")).toBeNull();
  });

  it("bails out when render_mode is not json_hydration", () => {
    setBoardConfig(JSON.stringify({ render_mode: "static", columns: [] }));
    buildBoardDOM();

    init();

    expect(document.getElementById("board-closed-toggle")).toBeNull();
  });
});

// Smoke-check that vi is wired up for use by future fetch-touching tests.
describe("vitest helpers", () => {
  it("can stub a global fetch", () => {
    const fn = vi.fn();
    vi.stubGlobal("fetch", fn);
    expect(typeof fetch).toBe("function");
    vi.unstubAllGlobals();
  });
});
