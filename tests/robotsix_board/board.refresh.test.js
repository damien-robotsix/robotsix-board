import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SAMPLE_CONFIG, setBoardConfig, buildBoardDOM } from "./board_shared.js";

const {
  applyCardDiff,
  doRefresh,
  startRefreshLoop,
  bootConfig,
} = window.robotsixBoardInternals;

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
 * 4b.  doRefresh
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
 * 4c.  startRefreshLoop
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
