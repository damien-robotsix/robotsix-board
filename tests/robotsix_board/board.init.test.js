import { describe, it, expect, vi } from "vitest";
import "../../src/robotsix_board/static/board.js";
import { SAMPLE_CONFIG, setBoardConfig, buildBoardDOM, setupBoardTest } from "./board_shared.js";

const {
  init,
} = window.robotsixBoardInternals;

setupBoardTest();

/* ==================================================================
 * 10.  init
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
