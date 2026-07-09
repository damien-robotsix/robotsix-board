import { describe, it, expect, vi, beforeEach } from "vitest";
import { SAMPLE_CONFIG, setBoardConfig, buildBoardDOM } from "./board_shared.js";

const {
  buildMoveForm,
  performMove,
  attachMoveDelegation,
  bootConfig,
} = window.robotsixBoardInternals;

/* ==================================================================
 * 5.  performMove
 * ================================================================ */

describe("performMove()", () => {
  beforeEach(() => {
    setBoardConfig(JSON.stringify(SAMPLE_CONFIG));
    bootConfig();
    buildBoardDOM();
  });

  it("successful fetch moves card DOM to target column", async () => {
    const board = document.getElementById("board");
    const todoCards = board.querySelector(
      '.board-column[data-status="todo"] .board-column-cards'
    );

    const cardEl = document.createElement("div");
    cardEl.className = "board-card";
    cardEl.setAttribute("data-card-id", "move-me");

    const form = buildMoveForm({ id: "move-me", status: "todo" });
    cardEl.appendChild(form);
    todoCards.appendChild(cardEl);

    const select = form.querySelector("select[name='target_status']");
    select.value = "doing";
    const errorEl = form.querySelector(".board-move-error");

    const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchSpy);

    performMove("move-me", cardEl, form, select, errorEl);

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

    // Select should be rebuilt (old status "todo" now an option)
    const newSelect = doingCards.querySelector("select[name='target_status']");
    expect(newSelect).not.toBeNull();
    const values = Array.from(newSelect.options).map((o) => o.value);
    expect(values).toContain("todo");
    expect(values).not.toContain("doing");
  });

  it("failed fetch reverts select and shows inline error", async () => {
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
    const errorEl = form.querySelector(".board-move-error");

    const fetchSpy = vi.fn().mockResolvedValue({ ok: false, status: 422 });
    vi.stubGlobal("fetch", fetchSpy);

    performMove("fail-me", cardEl, form, select, errorEl);

    await vi.waitFor(() => {
      expect(errorEl.style.display).toBe("inline");
      expect(errorEl.textContent).toContain("Move failed");
    });

    // Select should be reverted to original value
    expect(select.value).toBe("doing");
  });

  it("null/empty cardId causes early return without fetch", () => {
    const board = document.getElementById("board");
    const todoCards = board.querySelector(
      '.board-column[data-status="todo"] .board-column-cards'
    );

    const cardEl = document.createElement("div");
    cardEl.className = "board-card";
    cardEl.setAttribute("data-card-id", "");

    const form = buildMoveForm({ id: "", status: "todo" });
    cardEl.appendChild(form);
    todoCards.appendChild(cardEl);

    const select = form.querySelector("select[name='target_status']");
    select.value = "doing";
    const errorEl = form.querySelector(".board-move-error");

    const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchSpy);

    performMove("", cardEl, form, select, errorEl);

    // Early return — fetch must not be called
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("URL template expansion uses configured endpoint", () => {
    const board = document.getElementById("board");
    const todoCards = board.querySelector(
      '.board-column[data-status="todo"] .board-column-cards'
    );

    const cardEl = document.createElement("div");
    cardEl.className = "board-card";
    cardEl.setAttribute("data-card-id", "url-test");

    const form = buildMoveForm({ id: "url-test", status: "todo" });
    cardEl.appendChild(form);
    todoCards.appendChild(cardEl);

    const select = form.querySelector("select[name='target_status']");
    select.value = "done";
    const errorEl = form.querySelector(".board-move-error");

    const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchSpy);

    performMove("url-test", cardEl, form, select, errorEl);

    const urlArg = fetchSpy.mock.calls[0][0];
    expect(urlArg).toBe("/move/url-test/done");
  });
});

/* ==================================================================
 * 5b.  attachMoveDelegation
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
