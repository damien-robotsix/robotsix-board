import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SAMPLE_CONFIG, setBoardConfig, buildBoardDOM } from "./board_shared.js";

const {
  init,
  _notifyError,
  _renderErrorStub,
  performMove,
  doRefresh,
  fetchGateDataAsync,
  applyCardDiff,
  bootConfig,
} = window.robotsixBoardInternals;

/* ==================================================================
 * Observability: _notifyError, _renderErrorStub, onError hook
 * ================================================================ */

describe("_notifyError()", () => {
  let boardEl;

  beforeEach(() => {
    buildBoardDOM();
    boardEl = document.getElementById("board");
  });

  afterEach(() => {
    window.robotsixBoardOnError(null);
  });

  it("dispatches a board:error CustomEvent on #board", () => {
    const handler = vi.fn();
    boardEl.addEventListener("board:error", handler);

    _notifyError("TEST_CODE", "test message", new Error("cause"), "test");

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.code).toBe("TEST_CODE");
    expect(detail.message).toBe("test message");
    expect(detail.cause).toBeInstanceOf(Error);
    expect(detail.phase).toBe("test");
  });

  it("calls the registered onError callback", () => {
    const cb = vi.fn();
    window.robotsixBoardOnError(cb);

    _notifyError("CB_TEST", "callback test", null, "init");

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0].code).toBe("CB_TEST");

    window.robotsixBoardOnError(null);
  });

  it("does not throw when the onError callback throws", () => {
    const cb = vi.fn().mockImplementation(() => {
      throw new Error("callback explosion");
    });
    window.robotsixBoardOnError(cb);

    expect(() =>
      _notifyError("SAFE", "should not throw", null, "init")
    ).not.toThrow();

    expect(cb).toHaveBeenCalledTimes(1);
    window.robotsixBoardOnError(null);
  });

  it("does not throw when #board is absent", () => {
    if (boardEl) { boardEl.remove(); }

    const cb = vi.fn();
    window.robotsixBoardOnError(cb);

    expect(() =>
      _notifyError("NO_BOARD", "no board element", null, "init")
    ).not.toThrow();

    expect(cb).toHaveBeenCalledTimes(1);
    window.robotsixBoardOnError(null);
  });

  it("accepts null callback registration to unregister", () => {
    const cb = vi.fn();
    window.robotsixBoardOnError(cb);
    window.robotsixBoardOnError(null);

    _notifyError("AFTER_NULL", "after unregister", null, "init");

    expect(cb).not.toHaveBeenCalled();
  });
});

describe("_renderErrorStub()", () => {
  beforeEach(() => {
    buildBoardDOM();
  });

  it("appends a .board-error div inside #board", () => {
    _renderErrorStub("Something went wrong");

    const stub = document.querySelector("#board .board-error");
    expect(stub).not.toBeNull();
    expect(stub.textContent).toBe("Something went wrong");
    expect(stub.getAttribute("role")).toBe("alert");
  });

  it("is a no-op when #board is absent", () => {
    document.body.innerHTML = "";
    expect(() => _renderErrorStub("no board")).not.toThrow();
  });
});

/* ==================================================================
 * init() error handling
 * ================================================================ */

describe("init() error hook", () => {
  beforeEach(() => {
    buildBoardDOM();
    setBoardConfig(JSON.stringify(SAMPLE_CONFIG));
  });

  afterEach(() => {
    window.robotsixBoardOnError(null);
  });

  it("renders error stub and dispatches board:error when init throws", () => {
    const board = document.getElementById("board");
    const errorHandler = vi.fn();
    board.addEventListener("board:error", errorHandler);

    // Force a throw inside init by making Element.prototype.querySelector
    // throw.  findColumnByStatus calls board.querySelector(...) inside
    // applyClosedToggle, which is called by attachClosedToggle during init.
    const origQS = Element.prototype.querySelector;
    Element.prototype.querySelector = function () {
      throw new Error("forced init failure");
    };

    try {
      init();
    } finally {
      Element.prototype.querySelector = origQS;
    }

    expect(errorHandler).toHaveBeenCalledTimes(1);
    expect(errorHandler.mock.calls[0][0].detail.code).toBe("INIT_FAILED");

    const stub = document.querySelector("#board .board-error");
    expect(stub).not.toBeNull();
  });

  it("calls the registered onError callback on init failure", () => {
    const cb = vi.fn();
    window.robotsixBoardOnError(cb);

    const origQS = Element.prototype.querySelector;
    Element.prototype.querySelector = function () {
      throw new Error("forced init failure");
    };

    try {
      init();
    } finally {
      Element.prototype.querySelector = origQS;
    }

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0].code).toBe("INIT_FAILED");
    window.robotsixBoardOnError(null);
  });
});

/* ==================================================================
 * applyCardDiff() error handling
 * ================================================================ */

describe("applyCardDiff() error hook", () => {
  let board;

  beforeEach(() => {
    buildBoardDOM();
    board = document.getElementById("board");
  });

  afterEach(() => {
    window.robotsixBoardOnError(null);
  });

  it("dispatches board:error when applyCardDiff throws", () => {
    const errorHandler = vi.fn();
    board.addEventListener("board:error", errorHandler);

    // Force Element.prototype.querySelector to throw so the
    // findColumnByStatus → appendCardToColumn chain fails inside the
    // try block of applyCardDiff.
    const origQS = Element.prototype.querySelector;
    Element.prototype.querySelector = function () {
      throw new Error("forced diff failure");
    };

    try {
      applyCardDiff([{ id: "test", status: "todo" }]);
    } finally {
      Element.prototype.querySelector = origQS;
    }

    expect(errorHandler).toHaveBeenCalledTimes(1);
    expect(errorHandler.mock.calls[0][0].detail.code).toBe("RENDER_FAILED");
  });

  it("calls the registered onError callback on diff failure", () => {
    const cb = vi.fn();
    window.robotsixBoardOnError(cb);

    const origQS = Element.prototype.querySelector;
    Element.prototype.querySelector = function () {
      throw new Error("forced diff failure");
    };

    try {
      applyCardDiff([{ id: "test", status: "todo" }]);
    } finally {
      Element.prototype.querySelector = origQS;
    }

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0].code).toBe("RENDER_FAILED");
    window.robotsixBoardOnError(null);
  });

  it("does not dispatch when applyCardDiff returns early (null input)", () => {
    const errorHandler = vi.fn();
    board.addEventListener("board:error", errorHandler);

    applyCardDiff(null);

    expect(errorHandler).not.toHaveBeenCalled();
  });

  it("does not dispatch when #board is missing", () => {
    const errorHandler = vi.fn();
    board.addEventListener("board:error", errorHandler);

    board.remove();
    applyCardDiff([{ id: "test", status: "todo" }]);

    expect(errorHandler).not.toHaveBeenCalled();
  });
});

/* ==================================================================
 * doRefresh() error hook
 * ================================================================ */

describe("doRefresh() error hook", () => {
  beforeEach(() => {
    buildBoardDOM();
    setBoardConfig(
      JSON.stringify({
        ...SAMPLE_CONFIG,
        refresh_url: "/api/refresh",
      })
    );
    bootConfig();
  });

  afterEach(() => {
    window.robotsixBoardOnError(null);
  });

  it("dispatches board:error on refresh fetch failure", async () => {
    const board = document.getElementById("board");
    const errorHandler = vi.fn();
    board.addEventListener("board:error", errorHandler);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down"))
    );

    doRefresh();

    await vi.waitFor(() => {
      expect(errorHandler).toHaveBeenCalledTimes(1);
    });

    expect(errorHandler.mock.calls[0][0].detail.code).toBe("REFRESH_FAILED");
  });

  it("calls the registered onError callback on refresh failure", async () => {
    const cb = vi.fn();
    window.robotsixBoardOnError(cb);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down"))
    );

    doRefresh();

    await vi.waitFor(() => {
      expect(cb).toHaveBeenCalledTimes(1);
    });

    expect(cb.mock.calls[0][0].code).toBe("REFRESH_FAILED");
    window.robotsixBoardOnError(null);
  });
});

/* ==================================================================
 * fetchGateDataAsync() error hook
 * ================================================================ */

describe("fetchGateDataAsync() error hook", () => {
  beforeEach(() => {
    buildBoardDOM();
    // Stub fetch to succeed so setGateEndpoint in beforeEach doesn't
    // trigger a failing fetch before the test body runs.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ blocked_columns: [] }),
      })
    );
    window.robotsixBoardSetGateEndpoint("/api/gate");
  });

  afterEach(() => {
    window.robotsixBoardOnError(null);
  });

  it("dispatches board:error on gate fetch failure", async () => {
    const board = document.getElementById("board");
    const errorHandler = vi.fn();
    board.addEventListener("board:error", errorHandler);

    // Override with failing fetch
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("gate down"))
    );

    fetchGateDataAsync();

    await vi.waitFor(() => {
      expect(errorHandler).toHaveBeenCalledTimes(1);
    });

    expect(errorHandler.mock.calls[0][0].detail.code).toBe("GATE_FAILED");
  });

  it("calls the registered onError callback on gate failure", async () => {
    const cb = vi.fn();
    window.robotsixBoardOnError(cb);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("gate down"))
    );

    fetchGateDataAsync();

    await vi.waitFor(() => {
      expect(cb).toHaveBeenCalledTimes(1);
    });

    expect(cb.mock.calls[0][0].code).toBe("GATE_FAILED");
    window.robotsixBoardOnError(null);
  });
});

/* ==================================================================
 * performMove() error hook
 * ================================================================ */

describe("performMove() error hook", () => {
  beforeEach(() => {
    setBoardConfig(JSON.stringify(SAMPLE_CONFIG));
    bootConfig();
    buildBoardDOM();
  });

  afterEach(() => {
    window.robotsixBoardOnError(null);
  });

  it("dispatches board:error on move fetch failure", async () => {
    const board = document.getElementById("board");
    const errorHandler = vi.fn();
    board.addEventListener("board:error", errorHandler);

    const todoCards = board.querySelector(
      '.board-column[data-status="todo"] .board-column-cards'
    );
    const cardEl = document.createElement("div");
    cardEl.className = "board-card";
    cardEl.setAttribute("data-card-id", "move-error");

    const { buildMoveForm } = window.robotsixBoardInternals;
    const form = buildMoveForm({ id: "move-error", status: "todo" });
    cardEl.appendChild(form);
    todoCards.appendChild(cardEl);

    const select = form.querySelector("select[name='target_status']");
    select.value = "doing";
    const errorEl = form.querySelector(".board-move-error");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("move network error"))
    );

    performMove("move-error", cardEl, form, select, errorEl);

    await vi.waitFor(() => {
      expect(errorHandler).toHaveBeenCalledTimes(1);
    });

    expect(errorHandler.mock.calls[0][0].detail.code).toBe("MOVE_FAILED");
  });

  it("calls the registered onError callback on move failure", async () => {
    const cb = vi.fn();
    window.robotsixBoardOnError(cb);

    const board = document.getElementById("board");
    const todoCards = board.querySelector(
      '.board-column[data-status="todo"] .board-column-cards'
    );
    const cardEl = document.createElement("div");
    cardEl.className = "board-card";
    cardEl.setAttribute("data-card-id", "move-cb");

    const { buildMoveForm } = window.robotsixBoardInternals;
    const form = buildMoveForm({ id: "move-cb", status: "todo" });
    cardEl.appendChild(form);
    todoCards.appendChild(cardEl);

    const select = form.querySelector("select[name='target_status']");
    select.value = "doing";
    const errorEl = form.querySelector(".board-move-error");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("move cb error"))
    );

    performMove("move-cb", cardEl, form, select, errorEl);

    await vi.waitFor(() => {
      expect(cb).toHaveBeenCalledTimes(1);
    });

    expect(cb.mock.calls[0][0].code).toBe("MOVE_FAILED");
    window.robotsixBoardOnError(null);
  });
});

/* ==================================================================
 * CFG.onError string lookup
 * ================================================================ */

describe("CFG.onError string lookup", () => {
  afterEach(() => {
    window.robotsixBoardOnError(null);
  });
  it("resolves a global function name from CFG.onError", () => {
    const cb = vi.fn();
    window._testOnErrorHandler = cb;

    buildBoardDOM();
    setBoardConfig(
      JSON.stringify({
        ...SAMPLE_CONFIG,
        onError: "_testOnErrorHandler",
      })
    );
    bootConfig();

    _notifyError("CFG_TEST", "cfg onError test", null, "init");

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0].code).toBe("CFG_TEST");

    delete window._testOnErrorHandler;
    window.robotsixBoardOnError(null);
  });

  it("ignores CFG.onError when it is not a string", () => {
    buildBoardDOM();
    setBoardConfig(
      JSON.stringify({
        ...SAMPLE_CONFIG,
        onError: 123,
      })
    );
    bootConfig();

    expect(() =>
      _notifyError("NO_CFG", "non-string onError", null, "init")
    ).not.toThrow();
  });
});

/* ==================================================================
 * window.robotsixBoardOnError public API
 * ================================================================ */

describe("window.robotsixBoardOnError()", () => {
  it("is exposed on window", () => {
    expect(typeof window.robotsixBoardOnError).toBe("function");
  });

  it("accepts a function and invokes it on error", () => {
    const cb = vi.fn();
    window.robotsixBoardOnError(cb);

    _notifyError("PUBLIC", "public api test", null, "test");

    expect(cb).toHaveBeenCalledTimes(1);
    window.robotsixBoardOnError(null);
  });

  it("accepts null to clear the callback", () => {
    const cb = vi.fn();
    window.robotsixBoardOnError(cb);
    window.robotsixBoardOnError(null);

    _notifyError("CLEARED", "should not fire", null, "test");

    expect(cb).not.toHaveBeenCalled();
  });
});
