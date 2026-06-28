import { describe, it, expect, beforeEach } from "vitest";
import "../../src/robotsix_board/static/board.js";
import { SAMPLE_CONFIG, setBoardConfig, buildBoardDOM, setupBoardTest } from "./board_shared.js";

const {
  getClosedToggleState,
  setClosedToggleState,
  applyClosedToggle,
  attachClosedToggle,
  findColumnByStatus,
  bootConfig,
} = window.robotsixBoardInternals;

setupBoardTest();

/* ==================================================================
 * 8.  getClosedToggleState / setClosedToggleState
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
 * 8b.  applyClosedToggle
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
 * 8c.  attachClosedToggle
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
