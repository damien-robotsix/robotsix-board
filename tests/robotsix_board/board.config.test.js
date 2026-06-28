import { describe, it, expect, vi } from "vitest";
import "../../src/robotsix_board/static/board.js";
import { SAMPLE_CONFIG, setBoardConfig, setupBoardTest } from "./board_shared.js";

const {
  bootConfig,
} = window.robotsixBoardInternals;

setupBoardTest();

/* ==================================================================
 * 1.  bootConfig
 * ================================================================ */

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

  it("calls robotsixBoardSetGateEndpoint when gate_endpoint is set", () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ blocked_columns: [] }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    setBoardConfig(
      JSON.stringify({
        ...SAMPLE_CONFIG,
        gate_endpoint: "https://example.com/gate",
      })
    );
    bootConfig();

    expect(fetchSpy).toHaveBeenCalledWith("https://example.com/gate");
  });
});
