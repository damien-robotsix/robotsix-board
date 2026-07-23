import { describe, it, expect, vi } from "vitest";

const {
  getGateData,
  getGateBlockedColumns,
  fetchGateDataAsync,
} = window.robotsixBoardInternals;


/* ==================================================================
 * 7.  getGateData
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
 * 7b.  getGateBlockedColumns
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
 * 7c.  fetchGateDataAsync
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
