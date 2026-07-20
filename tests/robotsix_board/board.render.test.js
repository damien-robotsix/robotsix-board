import { describe, it, expect, beforeEach } from "vitest";
import { SAMPLE_CONFIG, setBoardConfig, buildBoardDOM } from "./board_shared.js";

const {
  buildSelectOptions,
  buildMoveForm,
  rebuildMoveSelect,
  findColumnByStatus,
  appendCardToColumn,
  updateColumnCounts,
  buildCardElement,
  bootConfig,
  applyColumnA11y,
} = window.robotsixBoardInternals;

/* ==================================================================
 * 2.  buildSelectOptions
 * ================================================================ */

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

/* ==================================================================
 * 2b.  buildMoveForm
 * ================================================================ */

describe("buildMoveForm()", () => {
  it("builds a move form with select, submit button, and error placeholder", () => {
    setBoardConfig(JSON.stringify(SAMPLE_CONFIG));
    bootConfig();

    const form = buildMoveForm({ id: "c1", title: "Test Title", status: "todo" });
    expect(form.tagName).toBe("FORM");
    expect(form.className).toBe("board-card-move");
    expect(form.getAttribute("method")).toBe("POST");

    const select = form.querySelector("select[name='target_status']");
    expect(select).not.toBeNull();
    expect(select.getAttribute("aria-label")).toBe("Move Test Title to column");

    const btn = form.querySelector("button.board-move-submit");
    expect(btn).not.toBeNull();
    expect(btn.getAttribute("aria-label")).toBe("Move Test Title");

    const errEl = form.querySelector(".board-move-error");
    expect(errEl).not.toBeNull();
    expect(errEl.getAttribute("role")).toBe("alert");
  });
});

/* ==================================================================
 * 2c.  rebuildMoveSelect
 * ================================================================ */

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
 * 3.  findColumnByStatus / appendCardToColumn / updateColumnCounts
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

describe("appendCardToColumn()", () => {
  beforeEach(() => {
    setBoardConfig(JSON.stringify(SAMPLE_CONFIG));
    bootConfig();
  });

  it("appends a card to the correct column and returns true", () => {
    buildBoardDOM();
    const board = document.getElementById("board");

    const result = appendCardToColumn(
      { id: "new-1", title: "New Card", status: "todo" },
      board,
      "todo"
    );

    expect(result).toBe(true);
    const todoCards = board.querySelector(
      '.board-column[data-status="todo"] .board-card'
    );
    expect(todoCards).not.toBeNull();
    expect(todoCards.getAttribute("data-card-id")).toBe("new-1");
  });

  it("returns false when the target column is not found", () => {
    buildBoardDOM();
    const board = document.getElementById("board");

    const result = appendCardToColumn(
      { id: "x", title: "X", status: "missing" },
      board,
      "missing"
    );

    expect(result).toBe(false);
  });

  it("returns false when the card-list element is missing", () => {
    buildBoardDOM();
    const board = document.getElementById("board");

    // Remove the .board-column-cards container from the "todo" column
    const col = findColumnByStatus(board, "todo");
    const list = col.querySelector(".board-column-cards");
    list.remove();

    const result = appendCardToColumn(
      { id: "x", title: "X", status: "todo" },
      board,
      "todo"
    );

    expect(result).toBe(false);
  });

  it("handles an empty card object gracefully (calls buildCardElement)", () => {
    buildBoardDOM();
    const board = document.getElementById("board");

    const result = appendCardToColumn({}, board, "todo");

    expect(result).toBe(true);
    const todoCards = board.querySelector(
      '.board-column[data-status="todo"] .board-card'
    );
    expect(todoCards).not.toBeNull();
    // buildCardElement should produce a .board-card element
    expect(todoCards.classList.contains("board-card")).toBe(true);
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
 * 3b.  buildCardElement
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

    // a11y: card listitem attributes
    expect(el.getAttribute("role")).toBe("listitem");
    expect(el.getAttribute("tabindex")).toBe("0");
    expect(el.getAttribute("aria-haspopup")).toBe("dialog");

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
 * 3c.  applyColumnA11y
 * ================================================================ */

describe("applyColumnA11y()", () => {
  it("adds role='list' to .board-column-cards and aria-labelledby to .board-column", () => {
    const board = buildBoardDOM();

    applyColumnA11y();

    const columns = board.querySelectorAll(".board-column");
    columns.forEach((col) => {
      const cardsList = col.querySelector(".board-column-cards");
      expect(cardsList.getAttribute("role")).toBe("list");

      expect(col.hasAttribute("aria-labelledby")).toBe(true);
      const labelledById = col.getAttribute("aria-labelledby");
      const h2 = col.querySelector(".board-column-label");
      expect(h2.getAttribute("id")).toBe(labelledById);
    });
  });

  it("does not overwrite existing role and aria-labelledby", () => {
    const board = buildBoardDOM();
    const col = board.querySelector('.board-column[data-status="todo"]');
    const cardsList = col.querySelector(".board-column-cards");
    cardsList.setAttribute("role", "grid");
    col.setAttribute("aria-labelledby", "custom-id");

    const header = col.querySelector(".board-column-header");
    const h2 = document.createElement("h2");
    h2.className = "board-column-label";
    h2.setAttribute("id", "custom-id");
    h2.textContent = "Custom";
    header.insertBefore(h2, header.firstChild);

    applyColumnA11y();

    expect(cardsList.getAttribute("role")).toBe("grid");
    expect(col.getAttribute("aria-labelledby")).toBe("custom-id");
  });
});
