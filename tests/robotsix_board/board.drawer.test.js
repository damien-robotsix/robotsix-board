import { describe, it, expect, beforeEach } from "vitest";
import { buildBoardDOM } from "./board_shared.js";

const {
  openDrawer,
  closeDrawer,
  attachDrawerDelegation,
} = window.robotsixBoardInternals;

/* ==================================================================
 * 6.  openDrawer / closeDrawer
 * ================================================================ */

describe("openDrawer() / closeDrawer()", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    const drawer = document.createElement("div");
    drawer.id = "drawer";
    drawer.className = "hidden";
    const content = document.createElement("div");
    content.className = "drawer-content";
    drawer.appendChild(content);
    document.body.appendChild(drawer);
  });

  function makeCardEl(id, title) {
    const el = document.createElement("div");
    el.className = "board-card";
    el.setAttribute("data-card-id", id);

    const titleEl = document.createElement("div");
    titleEl.className = "board-card-title";
    titleEl.textContent = title;
    el.appendChild(titleEl);

    return el;
  }

  it("sets dialog ARIA attributes on the drawer", () => {
    const cardEl = makeCardEl("42", "Hello World");
    openDrawer(cardEl);

    const drawer = document.getElementById("drawer");
    expect(drawer.getAttribute("role")).toBe("dialog");
    expect(drawer.getAttribute("aria-modal")).toBe("true");
    expect(drawer.getAttribute("aria-labelledby")).toBe("drawer-title");
  });

  it("adds id='drawer-title' to the drawer heading", () => {
    const cardEl = makeCardEl("42", "Hello World");
    openDrawer(cardEl);

    const heading = document.getElementById("drawer-title");
    expect(heading).not.toBeNull();
    expect(heading.tagName).toBe("H2");
    expect(heading.textContent).toBe("Hello World");
  });

  it("moves focus to the close button on open", () => {
    const cardEl = makeCardEl("42", "Hello World");
    document.body.appendChild(cardEl);
    cardEl.focus();
    expect(document.activeElement).toBe(cardEl);

    openDrawer(cardEl);

    const closeBtn = document.querySelector(".drawer-close");
    expect(document.activeElement).toBe(closeBtn);
  });

  it("restores focus to the triggering card on close", () => {
    const cardEl = makeCardEl("42", "Hello World");
    document.body.appendChild(cardEl);

    openDrawer(cardEl);
    closeDrawer();

    expect(document.activeElement).toBe(cardEl);
  });

  it("closes the drawer on Escape key", () => {
    const cardEl = makeCardEl("1", "Test");
    openDrawer(cardEl);

    const drawer = document.getElementById("drawer");
    expect(drawer.classList.contains("hidden")).toBe(false);

    const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
    document.dispatchEvent(event);

    expect(drawer.classList.contains("hidden")).toBe(true);
  });

  it("removes the Escape key handler on close", () => {
    const cardEl = makeCardEl("1", "Test");
    openDrawer(cardEl);
    const drawer = document.getElementById("drawer");
    expect(drawer._onKeyDown).not.toBeNull();

    closeDrawer();
    expect(drawer._onKeyDown).toBeNull();
  });

  it("populates drawer content and removes .hidden", () => {
    const cardEl = makeCardEl("42", "Hello World");
    openDrawer(cardEl);

    const drawer = document.getElementById("drawer");
    expect(drawer.classList.contains("hidden")).toBe(false);

    const content = drawer.querySelector(".drawer-content");
    expect(content.innerHTML).toContain("Hello World");
    expect(content.innerHTML).toContain("ID: 42");
  });

  it("closes the drawer and re-adds .hidden", () => {
    const cardEl = makeCardEl("1", "Test");
    openDrawer(cardEl);
    closeDrawer();

    const drawer = document.getElementById("drawer");
    expect(drawer.classList.contains("hidden")).toBe(true);
  });

  it("removes the backdrop click handler on close", () => {
    const cardEl = makeCardEl("1", "Test");
    openDrawer(cardEl);
    const drawer = document.getElementById("drawer");
    expect(drawer._closeOnBackdrop).not.toBeNull();

    closeDrawer();
    expect(drawer._closeOnBackdrop).toBeNull();
  });

  it("closes the drawer when clicking the backdrop (outside .drawer-content)", () => {
    const cardEl = makeCardEl("1", "Test");
    openDrawer(cardEl);

    const drawer = document.getElementById("drawer");
    // Simulate a click on the drawer itself (the backdrop)
    const clickEvent = new Event("click", { bubbles: true });
    // Dispatch on drawer; _closeOnBackdrop checks evt.target.closest('.drawer-content')
    // drawer is the target, it doesn't match .drawer-content, so it should close.
    drawer.dispatchEvent(clickEvent);

    expect(drawer.classList.contains("hidden")).toBe(true);
  });

  it("does not close the drawer when clicking inside .drawer-content", () => {
    const cardEl = makeCardEl("1", "Test");
    openDrawer(cardEl);

    const drawer = document.getElementById("drawer");
    const content = drawer.querySelector(".drawer-content");
    content.dispatchEvent(new Event("click", { bubbles: true }));

    expect(drawer.classList.contains("hidden")).toBe(false);
  });

  it("includes badges and timestamps in drawer content", () => {
    const cardEl = document.createElement("div");
    cardEl.className = "board-card";
    cardEl.setAttribute("data-card-id", "b1");

    const titleEl = document.createElement("div");
    titleEl.className = "board-card-title";
    titleEl.textContent = "Detailed";
    cardEl.appendChild(titleEl);

    const badgeRow = document.createElement("div");
    badgeRow.className = "board-card-badges";
    const badge1 = document.createElement("span");
    badge1.className = "board-badge";
    badge1.textContent = "bug";
    badgeRow.appendChild(badge1);
    cardEl.appendChild(badgeRow);

    const tsRow = document.createElement("div");
    tsRow.className = "board-card-timestamps";
    const ts1 = document.createElement("span");
    ts1.className = "board-timestamp";
    ts1.textContent = "created: 2025-01-01";
    tsRow.appendChild(ts1);
    cardEl.appendChild(tsRow);

    openDrawer(cardEl);

    const content = document.getElementById("drawer").querySelector(".drawer-content");
    expect(content.innerHTML).toContain("bug");
    expect(content.innerHTML).toContain("created: 2025-01-01");
  });

  it("traps focus: Tab from last focusable wraps to first", () => {
    const cardEl = makeCardEl("99", "Focus Trap");
    openDrawer(cardEl);

    const drawer = document.getElementById("drawer");
    // The drawer should have a .drawer-close button (first focusable)
    const closeBtn = drawer.querySelector(".drawer-close");
    // And some other focusable — the drawer-content itself is not focusable
    // but the close button is. We need at least 2 focusable elements.
    // Add a dummy link inside the drawer content for testing
    const content = drawer.querySelector(".drawer-content");
    const dummyLink = document.createElement("a");
    dummyLink.href = "#";
    dummyLink.textContent = "dummy";
    content.appendChild(dummyLink);

    // Focus the last focusable element (dummyLink)
    dummyLink.focus();
    expect(document.activeElement).toBe(dummyLink);

    // Dispatch Tab (no shift) on the document — should wrap to first (closeBtn)
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));

    expect(document.activeElement).toBe(closeBtn);
  });

  it("traps focus: Shift+Tab from first focusable wraps to last", () => {
    const cardEl = makeCardEl("99", "Focus Trap Shift");
    openDrawer(cardEl);

    const drawer = document.getElementById("drawer");
    const closeBtn = drawer.querySelector(".drawer-close");
    const content = drawer.querySelector(".drawer-content");
    const dummyLink = document.createElement("a");
    dummyLink.href = "#";
    dummyLink.textContent = "dummy";
    content.appendChild(dummyLink);

    // Focus the first focusable element (closeBtn)
    closeBtn.focus();
    expect(document.activeElement).toBe(closeBtn);

    // Dispatch Shift+Tab on the document — should wrap to last (dummyLink)
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true }));

    expect(document.activeElement).toBe(dummyLink);
  });

  it("is a no-op when #drawer is absent", () => {
    document.body.innerHTML = "";
    const cardEl = makeCardEl("x", "X");
    expect(() => openDrawer(cardEl)).not.toThrow();
    expect(() => closeDrawer()).not.toThrow();
  });
});

/* ==================================================================
 * 6b.  attachDrawerDelegation
 * ================================================================ */

describe("attachDrawerDelegation()", () => {
  it("opens the drawer when a .board-card is clicked", () => {
    const board = buildBoardDOM();
    const todoCards = board.querySelector(
      '.board-column[data-status="todo"] .board-column-cards'
    );
    const cardEl = document.createElement("div");
    cardEl.className = "board-card";
    cardEl.setAttribute("data-card-id", "drawer-card");
    const titleEl = document.createElement("div");
    titleEl.className = "board-card-title";
    titleEl.textContent = "Drawer Test";
    cardEl.appendChild(titleEl);
    todoCards.appendChild(cardEl);

    attachDrawerDelegation();

    cardEl.dispatchEvent(new Event("click", { bubbles: true }));

    const drawer = document.getElementById("drawer");
    expect(drawer.classList.contains("hidden")).toBe(false);
    expect(drawer.querySelector(".drawer-content").innerHTML).toContain("Drawer Test");
  });

  it("does not open the drawer when .board-card-move is clicked", () => {
    const board = buildBoardDOM();
    const todoCards = board.querySelector(
      '.board-column[data-status="todo"] .board-column-cards'
    );
    const cardEl = document.createElement("div");
    cardEl.className = "board-card";
    cardEl.setAttribute("data-card-id", "no-drawer");
    const moveForm = document.createElement("form");
    moveForm.className = "board-card-move";
    cardEl.appendChild(moveForm);
    todoCards.appendChild(cardEl);

    attachDrawerDelegation();

    moveForm.dispatchEvent(new Event("click", { bubbles: true }));

    const drawer = document.getElementById("drawer");
    expect(drawer.classList.contains("hidden")).toBe(true);
  });

  it("opens the drawer on Enter keydown on a .board-card", () => {
    const board = buildBoardDOM();
    const todoCards = board.querySelector(
      '.board-column[data-status="todo"] .board-column-cards'
    );
    const cardEl = document.createElement("div");
    cardEl.className = "board-card";
    cardEl.setAttribute("data-card-id", "kbd-enter");
    const titleEl = document.createElement("div");
    titleEl.className = "board-card-title";
    titleEl.textContent = "Keyboard Enter";
    cardEl.appendChild(titleEl);
    todoCards.appendChild(cardEl);

    attachDrawerDelegation();

    cardEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    const drawer = document.getElementById("drawer");
    expect(drawer.classList.contains("hidden")).toBe(false);
    expect(drawer.querySelector(".drawer-content").innerHTML).toContain("Keyboard Enter");
  });

  it("opens the drawer on Space keydown on a .board-card", () => {
    const board = buildBoardDOM();
    const todoCards = board.querySelector(
      '.board-column[data-status="todo"] .board-column-cards'
    );
    const cardEl = document.createElement("div");
    cardEl.className = "board-card";
    cardEl.setAttribute("data-card-id", "kbd-space");
    const titleEl = document.createElement("div");
    titleEl.className = "board-card-title";
    titleEl.textContent = "Keyboard Space";
    cardEl.appendChild(titleEl);
    todoCards.appendChild(cardEl);

    attachDrawerDelegation();

    cardEl.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));

    const drawer = document.getElementById("drawer");
    expect(drawer.classList.contains("hidden")).toBe(false);
    expect(drawer.querySelector(".drawer-content").innerHTML).toContain("Keyboard Space");
  });

  it("does not open the drawer on non-Enter/Space keydown", () => {
    const board = buildBoardDOM();
    const todoCards = board.querySelector(
      '.board-column[data-status="todo"] .board-column-cards'
    );
    const cardEl = document.createElement("div");
    cardEl.className = "board-card";
    cardEl.setAttribute("data-card-id", "kbd-other");
    const titleEl = document.createElement("div");
    titleEl.className = "board-card-title";
    titleEl.textContent = "Other Key";
    cardEl.appendChild(titleEl);
    todoCards.appendChild(cardEl);

    attachDrawerDelegation();

    cardEl.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));

    const drawer = document.getElementById("drawer");
    expect(drawer.classList.contains("hidden")).toBe(true);
  });

  it("does not open the drawer on Enter keydown inside .board-card-move", () => {
    const board = buildBoardDOM();
    const todoCards = board.querySelector(
      '.board-column[data-status="todo"] .board-column-cards'
    );
    const cardEl = document.createElement("div");
    cardEl.className = "board-card";
    cardEl.setAttribute("data-card-id", "no-kbd-drawer");
    const moveForm = document.createElement("form");
    moveForm.className = "board-card-move";
    cardEl.appendChild(moveForm);
    todoCards.appendChild(cardEl);

    attachDrawerDelegation();

    moveForm.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    const drawer = document.getElementById("drawer");
    expect(drawer.classList.contains("hidden")).toBe(true);
  });

  it("closes the drawer via the .drawer-close button", () => {
    const board = buildBoardDOM();
    const todoCards = board.querySelector(
      '.board-column[data-status="todo"] .board-column-cards'
    );
    const cardEl = document.createElement("div");
    cardEl.className = "board-card";
    cardEl.setAttribute("data-card-id", "close-test");
    const titleEl = document.createElement("div");
    titleEl.className = "board-card-title";
    titleEl.textContent = "Close Test";
    cardEl.appendChild(titleEl);
    todoCards.appendChild(cardEl);

    attachDrawerDelegation();

    // Open first
    cardEl.dispatchEvent(new Event("click", { bubbles: true }));
    const drawer = document.getElementById("drawer");
    expect(drawer.classList.contains("hidden")).toBe(false);

    // Click the close button
    const closeBtn = drawer.querySelector(".drawer-close");
    closeBtn.dispatchEvent(new Event("click", { bubbles: true }));
    expect(drawer.classList.contains("hidden")).toBe(true);
  });
});
