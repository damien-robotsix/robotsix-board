import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import "../../src/robotsix_board/static/board.js";
import { setupBoardTest } from "./board_shared.js";

setupBoardTest();

/* ==================================================================
 * 20.  Export-surface convention audit (AGENT.md lines 36-40)
 * ================================================================ */

describe("export surface convention", () => {
  const boardJsPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../src/robotsix_board/static/board.js",
  );
  const src = readFileSync(boardJsPath, "utf-8");

  // Extract every module-level function name (^  function <name>).
  const funcDeclRe = /^  function (\w+)/gm;
  const declaredFuncs = new Set();
  let m;
  while ((m = funcDeclRe.exec(src)) !== null) {
    declaredFuncs.add(m[1]);
  }

  // Extract function names from window.robotsixBoard* = <name>; assignments.
  const publicApiRe = /w\["robotsixBoard\w+"\]\s*=\s*(\w+);/g;
  const publicApiFuncs = new Set();
  while ((m = publicApiRe.exec(src)) !== null) {
    publicApiFuncs.add(m[1]);
  }

  // Isolate the Internals object literal and extract its keys.
  const internalsBlockMatch = src.match(
    /w\["robotsixBoardInternals"\]\s*=\s*\{([^}]+)\}/s,
  );
  const internalsKeys = new Set();
  if (internalsBlockMatch) {
    const keyRe = /(\w+):/g;
    while ((m = keyRe.exec(internalsBlockMatch[1])) !== null) {
      internalsKeys.add(m[1]);
    }
  }

  const exportedFuncs = new Set([...publicApiFuncs, ...internalsKeys]);

  it("has at least one function declared (sanity)", () => {
    expect(declaredFuncs.size).toBeGreaterThan(0);
  });

  it("exports every module-level function via window.robotsixBoard* or Internals", () => {
    const missing = [...declaredFuncs].filter((fn) => !exportedFuncs.has(fn));
    expect(missing).toEqual([]);
  });
});

/* ==================================================================
 * 21.  CSS class name cross-file consistency
 * ================================================================ */

describe("CSS class name cross-file consistency", () => {
  const boardCssPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../src/robotsix_board/static/board.css",
  );
  const boardJsPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../src/robotsix_board/static/board.js",
  );

  const cssSrc = readFileSync(boardCssPath, "utf-8");
  const jsSrc = readFileSync(boardJsPath, "utf-8");

  // --- extract CSS class selectors from board.css ---
  // Matches .class-name where class-name starts with a letter,
  // not preceded by a digit (avoids matching decimal numbers
  // like 0.85, rgba(0,0,0,0.4), etc.).
  const cssClassRe = /(?<!\d)\.([a-zA-Z_][\w-]*)/g;
  const cssClasses = new Set();
  let m;
  while ((m = cssClassRe.exec(cssSrc)) !== null) {
    cssClasses.add(m[1]);
  }

  // --- extract CSS class names used in board.js ---
  // Patterns covered:
  //   .className = "..."            — direct assignment (single or space-separated)
  //   .classList.add("...")         — add/remove/toggle calls
  //   .querySelector(".foo .bar")   — CSS selector strings
  //   .querySelectorAll(...)        — same
  //   .closest(...)                 — same
  //   HTML string literals with class="..."
  const jsClasses = new Set();

  // 1. className = "cls1 cls2" and classList.*("cls")
  const classNameRe = /\.className\s*=\s*"([^"]+)"/g;
  while ((m = classNameRe.exec(jsSrc)) !== null) {
    for (const cls of m[1].split(/\s+/)) {
      if (cls) jsClasses.add(cls);
    }
  }

  // 2. classList.add("cls"), classList.remove("cls"), classList.toggle("cls")
  const classListRe = /\.classList\.(?:add|remove|toggle)\("([^"]+)"\)/g;
  while ((m = classListRe.exec(jsSrc)) !== null) {
    jsClasses.add(m[1]);
  }

  // 3. querySelector/querySelectorAll/closest with CSS selector strings
  //    that contain class references.
  //    We extract class names from ".class-name" patterns inside
  //    selector string arguments.
  const querySelectorRe = /\.(?:querySelector(?:All)?|closest)\("([^"]+)"\)/g;
  while ((m = querySelectorRe.exec(jsSrc)) !== null) {
    const sel = m[1];
    const clsRe = /\.([a-zA-Z_][\w-]*)/g;
    let cm;
    while ((cm = clsRe.exec(sel)) !== null) {
      jsClasses.add(cm[1]);
    }
  }

  // 4. HTML string literals with class="..." attributes
  const htmlClassRe = /class="([^"]+)"/g;
  while ((m = htmlClassRe.exec(jsSrc)) !== null) {
    for (const cls of m[1].split(/\s+/)) {
      if (cls) jsClasses.add(cls);
    }
  }

  // --- known exceptions ---
  // "hidden" is a utility/visibility class — it is defined in
  // board.css but its usage via classList is dynamic, so it
  // passes the check naturally.  No special-casing needed.

  it("every JS class name has a matching CSS rule in board.css", () => {
    const missing = [...jsClasses].filter((cls) => !cssClasses.has(cls));
    expect(missing).toEqual([]);
  });
});
