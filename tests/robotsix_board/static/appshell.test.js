/*
 * Tests for the AppShell vanilla.js vendor asset.
 *
 * Imports the vendored vanilla.js module and exercises mountAppShell
 * in a happy-dom environment.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mountAppShell } from "../../../src/robotsix_board/static/vanilla.js";

describe("mountAppShell", () => {
  let container;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("renders the shell root with rsu-appshell class", () => {
    mountAppShell(container, {});
    const root = container.querySelector(".rsu-appshell");
    expect(root).not.toBeNull();
    expect(root.tagName).toBe("HEADER");
  });

  it("renders brand text when provided", () => {
    mountAppShell(container, { brand: "Test Board" });
    const brand = container.querySelector(".rsu-appshell-brand");
    expect(brand).not.toBeNull();
    expect(brand.textContent).toBe("Test Board");
  });

  it("hides brand element when brand is not provided", () => {
    mountAppShell(container, {});
    const brand = container.querySelector(".rsu-appshell-brand");
    expect(brand).not.toBeNull();
    expect(brand.hidden).toBe(true);
  });

  it("renders nav items", () => {
    mountAppShell(container, {
      navItems: [
        { label: "Board", href: "/", active: true },
        { label: "Settings", href: "/settings" },
      ],
    });
    const links = container.querySelectorAll(".rsu-appshell-link");
    expect(links).toHaveLength(2);
    expect(links[0].textContent).toContain("Board");
    expect(links[0].getAttribute("href")).toBe("/");
    expect(links[0].classList.contains("rsu-appshell-link--active")).toBe(true);
    expect(links[0].getAttribute("aria-current")).toBe("page");

    expect(links[1].textContent).toContain("Settings");
    expect(links[1].classList.contains("rsu-appshell-link--active")).toBe(false);
  });

  it("renders settings link when settingsHref is provided", () => {
    mountAppShell(container, { settingsHref: "/config" });
    const link = container.querySelector(".rsu-appshell-settings");
    expect(link).not.toBeNull();
    expect(link.hidden).toBe(false);
    expect(link.getAttribute("href")).toBe("/config");
  });

  it("hides settings link when settingsHref is not provided", () => {
    mountAppShell(container, {});
    const link = container.querySelector(".rsu-appshell-settings");
    expect(link).not.toBeNull();
    expect(link.hidden).toBe(true);
  });

  it("renders right slot content", () => {
    mountAppShell(container, { rightSlot: "Healthy" });
    const slot = container.querySelector(".rsu-appshell-slot");
    expect(slot).not.toBeNull();
    expect(slot.textContent).toBe("Healthy");
  });

  it("renders no right slot content when not provided", () => {
    mountAppShell(container, {});
    const slot = container.querySelector(".rsu-appshell-slot");
    expect(slot).not.toBeNull();
    expect(slot.textContent).toBe("");
  });

  it("toggles open class on hamburger click", () => {
    mountAppShell(container, {
      navItems: [{ label: "Home", href: "/" }],
    });
    const root = container.querySelector(".rsu-appshell");
    const toggle = container.querySelector(".rsu-appshell-toggle");
    expect(root.classList.contains("rsu-appshell--open")).toBe(false);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    toggle.click();
    expect(root.classList.contains("rsu-appshell--open")).toBe(true);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");

    toggle.click();
    expect(root.classList.contains("rsu-appshell--open")).toBe(false);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("returns handle with element, rightSlot, and destroy", () => {
    const handle = mountAppShell(container, {});
    expect(handle.element).toBeInstanceOf(HTMLElement);
    expect(handle.rightSlot).toBeInstanceOf(HTMLElement);
    expect(handle.destroy).toBeTypeOf("function");

    handle.destroy();
    expect(container.innerHTML).toBe("");
  });

  it("renders icons when nav item has icon", () => {
    mountAppShell(container, {
      navItems: [{ label: "Home", href: "/", icon: "🏠" }],
    });
    const icon = container.querySelector(".rsu-appshell-icon");
    expect(icon).not.toBeNull();
    expect(icon.textContent).toBe("🏠");
    expect(icon.getAttribute("aria-hidden")).toBe("true");
  });
});
