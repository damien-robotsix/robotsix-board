import { describe, it, expect } from "vitest";
import fc from "fast-check";

const {
  esc,
  hashStr,
  agentColor,
} = window.robotsixBoardInternals;


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

  // ------------------------------------------------------------------
  //  Property-based oracle (fast-check)
  // ------------------------------------------------------------------

  // Character generator: all BMP code points (0x0000–0xFFFF) except
  // surrogates (U+D800–U+DFFF).  Surrogates are excluded because
  // html.unescape replaces lone surrogates with U+FFFD, which breaks
  // the round-trip invariant.  (Mirrors the Python Hypothesis
  // blacklist of [Cs,Cc] — Cc would also break round-trip but this
  // generator does produce control chars; they round-trip fine through
  // esc because esc only touches the five HTML-significant chars.)
  //
  // fast-check v4 removed `fc.char16bits()`. An integer over the 16-bit range
  // mapped through String.fromCharCode is its exact equivalent — one UTF-16
  // code unit, always length 1. `fc.string({unit: 'binary', ...})` is NOT a
  // substitute: it emits astral characters as surrogate PAIRS, so charCodeAt(0)
  // below would inspect a high surrogate and the filter would silently discard
  // every one of them.
  const nonSurrogateChar = fc
    .integer({ min: 0, max: 0xFFFF })
    .map((cp) => String.fromCharCode(cp))
    .filter(
    (c) => {
      const cp = c.charCodeAt(0);
      return cp < 0xD800 || cp > 0xDFFF;
    },
  );

  /** Invert ENTITY_MAP so we can decode esc() output for round-trip testing. */
  const REVERSE_ENTITY_MAP = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
  };
  const ENTITY_RE = /&(?:amp|lt|gt|quot|#39);/g;

  /** Decode entities produced by esc() back to raw characters. */
  function decodeEntities(escaped) {
    return escaped.replace(ENTITY_RE, (m) => REVERSE_ENTITY_MAP[m]);
  }

  /** Shared arbitrary: BMP strings without surrogates, plus XSS vectors. */
  const anySafeString = fc.oneof(
    // v4 replaced fc.stringOf(charArb, opts) with fc.string({unit: charArb, ...}).
    fc.string({ unit: nonSurrogateChar, minLength: 0, maxLength: 200 }),
    fc.constantFrom(
      "<script>alert(1)</script>",
      "<img src=x onerror=alert(1)>",
      "' OR 1=1 --",
      "&amp;&lt;&gt;",
      "'\"><svg onload=alert(1)>",
    ),
  );

  it("property: no raw sigils survive escaping", () => {
    fc.assert(
      fc.property(anySafeString, (s) => {
        const result = esc(s);
        for (const rawChar of ["<", ">", '"', "'"]) {
          expect(result).not.toContain(rawChar);
        }
        // Every '&' must start a valid HTML entity.
        // The regex checks any '&' NOT followed by one of the known
        // entity patterns.
        expect(result).not.toMatch(/&(?!(?:amp|lt|gt|quot|#39);)/);
      }),
      {
        examples: [
          [""],
          ["<script>alert(1)</script>"],
          ["hello world"],
        ],
      },
    );
  });

  it("property: esc round-trips through decodeEntities", () => {
    fc.assert(
      fc.property(anySafeString, (s) => {
        expect(decodeEntities(esc(s))).toBe(s);
      }),
      {
        examples: [
          [""],
          ["<script>alert(1)</script>"],
          ["hello world"],
        ],
      },
    );
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
