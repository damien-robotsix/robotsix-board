import { describe, it, expect, vi } from "vitest";
import { SAMPLE_CONFIG, setBoardConfig, buildBoardDOM } from "./board_shared.js";

const {
  init,
} = window.robotsixBoardInternals;

/**
 * Return a config with a refresh_url so startRefreshLoop will call fetch.
 */
function configWithRefreshUrl() {
  return {
    ...SAMPLE_CONFIG,
    refresh_url: "/api/board/refresh",
  };
}

/**
 * Stub global fetch to return a successful empty-card response so
 * doRefresh() doesn't log a warning.
 */
function stubFetch() {
  const fakeResponse = {
    ok: true,
    json: () => Promise.resolve([]),
  };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fakeResponse));
}

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

  it("calls startRefreshLoop (via fetch) when init succeeds", () => {
    buildBoardDOM();
    setBoardConfig(JSON.stringify(configWithRefreshUrl()));
    stubFetch();

    init();

    expect(fetch).toHaveBeenCalledWith("/api/board/refresh");
  });

  it("does not call fetch when init bails out because #board-config is missing", () => {
    document.body.innerHTML = "";
    buildBoardDOM();
    stubFetch();

    init();

    // No toggle should have been created
    expect(document.getElementById("board-closed-toggle")).toBeNull();
    // fetch must not have been called
    expect(fetch).not.toHaveBeenCalled();
  });

  it("bails out when render_mode is not json_hydration", () => {
    setBoardConfig(JSON.stringify({ render_mode: "static", columns: [] }));
    buildBoardDOM();
    stubFetch();

    init();

    expect(document.getElementById("board-closed-toggle")).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("bails out when #board-config contains malformed JSON", () => {
    buildBoardDOM();
    // setBoardConfig appends a script element with raw text — use
    // invalid JSON that JSON.parse will reject.
    setBoardConfig("{not valid json");
    stubFetch();

    init();

    // bootConfig catches the parse error and returns false, so
    // init bails before starting the refresh loop.
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not throw and still starts refresh loop when #board is missing", () => {
    // Valid config, but no #board DOM element in the body.
    setBoardConfig(JSON.stringify(configWithRefreshUrl()));
    stubFetch();

    expect(() => init()).not.toThrow();

    // startRefreshLoop does not depend on #board — fetch should
    // still be called.
    expect(fetch).toHaveBeenCalledWith("/api/board/refresh");
  });
});
