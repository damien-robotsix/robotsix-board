import { beforeEach, afterEach, vi } from "vitest";

// Importing board.js runs its IIFE under the happy-dom environment,
// which populates window.robotsixBoardInternals with the pure helpers.
import "../../../src/robotsix_board/static/board.js";

// Polyfill CSS.escape for happy-dom (not yet implemented in all versions).
if (!globalThis.CSS) { globalThis.CSS = {}; }
if (!CSS.escape) {
  CSS.escape = function (value) {
    return String(value);
  };
}

export const SAMPLE_CONFIG = {
  render_mode: "json_hydration",
  columns: [
    ["todo", "To Do"],
    ["doing", "Doing"],
    ["done", "Done"],
  ],
};

/**
 * Render a #board-config <script> element into document.body so that
 * bootConfig() can locate and parse it.
 */
export function setBoardConfig(json) {
  // Remove any existing #board-config element (but do NOT clear the
  // entire body — callers may have already built DOM like #board that
  // must survive for init() tests.)
  const existing = document.getElementById("board-config");
  if (existing) { existing.remove(); }

  const el = document.createElement("script");
  el.id = "board-config";
  el.type = "application/json";
  el.textContent = json;
  document.body.appendChild(el);
}

/**
 * Render a minimal #board with three columns (todo, doing, done) into
 * document.body.  Returns the #board element.
 */
export function buildBoardDOM() {
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

    const h2 = document.createElement("h2");
    h2.className = "board-column-label";
    h2.textContent = key.charAt(0).toUpperCase() + key.slice(1);
    header.appendChild(h2);

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

/**
 * Call at the top level of each split test file to register the
 * shared beforeEach / afterEach hooks.
 */
export function setupBoardTest() {
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
}
