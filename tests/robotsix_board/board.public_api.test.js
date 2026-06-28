import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "../../src/robotsix_board/static/board.js";
import { SAMPLE_CONFIG, setBoardConfig, buildBoardDOM, setupBoardTest } from "./board_shared.js";

const {
  startRefreshLoop,
  bootConfig,
} = window.robotsixBoardInternals;

setupBoardTest();

/* ==================================================================
 * 9.  Public API: window.robotsixBoardRefresh
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
 * 9b.  Public API: window.robotsixBoardStopRefresh
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
 * 9c.  Public API: window.robotsixBoardSetRefreshUrl
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

/* ==================================================================
 * 9d.  Public API: window.robotsixBoardSetRefreshInterval
 * ================================================================ */

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
 * 9e.  Public API: window.robotsixBoardSetGate
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
 * 9f.  Public API: window.robotsixBoardSetGateEndpoint
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
