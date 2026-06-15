import { describe, it, expect, vi } from "vitest";

// Importing board.js runs its IIFE under the happy-dom environment,
// which populates window.robotsixBoardInternals with the pure helpers.
import "../../src/robotsix_board/static/board.js";

const { esc, bootConfig, buildSelectOptions, buildMoveForm, rebuildMoveSelect } =
  window.robotsixBoardInternals;

const SAMPLE_CONFIG = {
  render_mode: "json_hydration",
  columns: [
    ["todo", "To Do"],
    ["doing", "Doing"],
    ["done", "Done"],
  ],
  move_method: "POST",
  move_endpoint_template: "/move/{card_id}/{target_status}",
};

/**
 * Render a #board-config <script> element into document.body so that
 * bootConfig() can locate and parse it.
 */
function setBoardConfig(json) {
  document.body.innerHTML = "";
  const el = document.createElement("script");
  el.id = "board-config";
  el.type = "application/json";
  el.textContent = json;
  document.body.appendChild(el);
}

describe("esc()", () => {
  it("escapes HTML-significant characters", () => {
    expect(esc("<")).toBe("&lt;");
    expect(esc(">")).toBe("&gt;");
    expect(esc("&")).toBe("&amp;");
    expect(esc('"')).toBe("&quot;");
    expect(esc("'")).toBe("&#39;");
  });

  it("escapes a mixed string and passes plain text through unchanged", () => {
    expect(esc('<a href="x">&')).toBe("&lt;a href=&quot;x&quot;&gt;&amp;");
    expect(esc("plain text 123")).toBe("plain text 123");
  });
});

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
});

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

describe("buildMoveForm()", () => {
  it("builds a move form with select, submit button, and error placeholder", () => {
    setBoardConfig(JSON.stringify(SAMPLE_CONFIG));
    bootConfig();

    const form = buildMoveForm({ id: "c1", status: "todo" });
    expect(form.tagName).toBe("FORM");
    expect(form.className).toBe("board-card-move");
    expect(form.getAttribute("method")).toBe("POST");

    expect(form.querySelector("select[name='target_status']")).not.toBeNull();
    expect(form.querySelector("button.board-move-submit")).not.toBeNull();
    expect(form.querySelector(".board-move-error")).not.toBeNull();
  });
});

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

// Smoke-check that vi is wired up for use by future fetch-touching tests.
describe("vitest helpers", () => {
  it("can stub a global fetch", () => {
    const fn = vi.fn();
    vi.stubGlobal("fetch", fn);
    expect(typeof fetch).toBe("function");
    vi.unstubAllGlobals();
  });
});
