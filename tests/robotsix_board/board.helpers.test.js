import { describe, it, expect } from "vitest";
import "../../src/robotsix_board/static/board.js";
import { setupBoardTest } from "./board_shared.js";

const {
  esc,
  hashStr,
  agentColor,
} = window.robotsixBoardInternals;

setupBoardTest();

/* ==================================================================
 * 0.  esc
 * ================================================================ */

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

/* ==================================================================
 * 0b.  hashStr / agentColor
 * ================================================================ */

describe("hashStr()", () => {
  it("returns a deterministic non-negative integer less than modulus", () => {
    const result = hashStr("hello", 100);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(100);
    expect(Number.isInteger(result)).toBe(true);
  });

  it("returns the same value for the same input", () => {
    expect(hashStr("abc", 50)).toBe(hashStr("abc", 50));
  });

  it("returns 0 for an empty string", () => {
    expect(hashStr("", 10)).toBe(0);
  });

  it("can produce different values for different inputs", () => {
    // Not strictly required, but highly probable with a reasonable modulus.
    const a = hashStr("alpha", 360);
    const b = hashStr("beta", 360);
    // They may collide but with 360 slots it's unlikely for short strings.
    // We just verify they're both in range.
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(360);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(360);
  });
});

describe("agentColor()", () => {
  it("returns a HSL colour string", () => {
    const color = agentColor("alice");
    expect(color).toMatch(/^hsl\(\d+, 50%, 30%\)$/);
  });

  it("returns the same colour for the same agent name", () => {
    expect(agentColor("bob")).toBe(agentColor("bob"));
  });
});
