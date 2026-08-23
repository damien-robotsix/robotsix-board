var X = Object.defineProperty;
var Z = (e, t, s) => t in e ? X(e, t, { enumerable: !0, configurable: !0, writable: !0, value: s }) : e[t] = s;
var h = (e, t, s) => Z(e, typeof t != "symbol" ? t + "" : t, s);
class D extends Error {
  constructor(s) {
    const n = s.detail || s.title || "Config validation failed";
    super(n);
    h(this, "problem");
    /** The dotted key the message blames, when the detail names one. */
    h(this, "key");
    this.name = "ConfigValidationError", this.problem = s, this.key = Q(n);
  }
}
function Q(e) {
  const t = /^([A-Za-z_][\w.]*)\s*:\s*\S/.exec(e);
  return t ? t[1] : null;
}
class Y {
  constructor(t = {}) {
    h(this, "baseUrl");
    h(this, "headers");
    h(this, "fetchImpl");
    this.baseUrl = (t.baseUrl || "").replace(/\/$/, ""), this.headers = t.headers || {}, this.fetchImpl = t.fetchImpl || globalThis.fetch.bind(globalThis);
  }
  /** `GET /config` — effective values (secrets masked), schema and version. */
  async getConfig() {
    return this.request("GET", "/config");
  }
  /** `PUT /config` — partial update.  Throws {@link ConfigValidationError} on 422. */
  async putConfig(t) {
    return this.request("PUT", "/config", t);
  }
  /** `GET /config/versions` — recent versions, newest first. */
  async getVersions() {
    return this.request("GET", "/config/versions");
  }
  /** `POST /config/rollback` — revert to *version*, itself a versioned write. */
  async rollback(t) {
    return this.request("POST", "/config/rollback", { version: t });
  }
  async request(t, s, n) {
    const r = { Accept: "application/json", ...this.headers };
    n !== void 0 && (r["Content-Type"] = "application/json");
    const a = await this.fetchImpl(`${this.baseUrl}${s}`, {
      method: t,
      headers: r,
      credentials: "same-origin",
      body: n === void 0 ? void 0 : JSON.stringify(n)
    }), o = await a.json().catch(() => null);
    if (!a.ok) {
      if (a.status === 422 && o && typeof o == "object")
        throw new D(o);
      const i = o || {};
      throw new Error(i.detail || i.title || `HTTP ${a.status}`);
    }
    return o;
  }
}
const x = ["advanced", "description", "default", "title", "x-deploy-plane"];
function R(e, t) {
  const s = { ...t };
  for (const n of x) {
    const r = e[n];
    r !== void 0 && s[n] === void 0 && (s[n] = r);
  }
  return s;
}
function $(e, t) {
  if (!e) return {};
  const s = e.anyOf || e.oneOf;
  if (Array.isArray(s)) {
    const r = s.filter((a) => a && a.type !== "null");
    return r.length === 1 ? R(e, $(r[0], t)) : e;
  }
  if (!e.$ref || !t) return e;
  const n = "#/$defs/";
  if (e.$ref.startsWith(n)) {
    const r = e.$ref.slice(n.length), a = t[r];
    if (a) return R(e, a);
  }
  return e;
}
function U(e) {
  return e.format === "password" && e.writeOnly === !0;
}
function G(e) {
  return e["x-deploy-plane"] || "component";
}
function k(e) {
  return e.type === "object" && e.properties !== void 0;
}
function S(e) {
  return e !== null && typeof e == "object" && !Array.isArray(e);
}
function I(e, t) {
  if (e.type !== "array" || !e.items) return null;
  const s = Array.isArray(e.items) ? e.items[0] : e.items;
  if (!s) return null;
  const n = $(s, t);
  return k(n) ? n : null;
}
function T(e, t) {
  if (e.type !== "object" || e.properties) return null;
  const s = e.additionalProperties;
  return !s || typeof s != "object" ? null : $(s, t);
}
function O(e) {
  return e && typeof e == "object" && "properties" in e ? e : K(e || {});
}
function K(e) {
  const t = {};
  for (const [s, n] of Object.entries(e))
    t[s] = ee(n);
  return { type: "object", properties: t };
}
function ee(e) {
  return e === "SECRET" ? { type: "string", format: "password", writeOnly: !0 } : typeof e == "boolean" ? { type: "boolean", default: e } : typeof e == "number" ? Number.isInteger(e) ? { type: "integer", default: e } : { type: "number", default: e } : Array.isArray(e) ? { type: "array", default: e } : e !== null && typeof e == "object" ? K(e) : { type: "string", default: e ?? "" };
}
function Ae(e, t, s) {
  const n = t.split(".");
  let r = e;
  for (let a = 0; a < n.length - 1; a++) {
    const o = n[a], i = /^\d+$/.test(n[a + 1]);
    (r[o] === void 0 || r[o] === null) && (r[o] = i ? [] : {}), r = r[o];
  }
  r[n[n.length - 1]] = s;
}
const te = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};
function m(e) {
  return String(e).replace(/[&<>"']/g, (t) => te[t]);
}
function b(e) {
  return m(e);
}
function A(e) {
  const t = globalThis.CSS;
  return t && typeof t.escape == "function" ? t.escape(e) : e;
}
function M(e) {
  if (!e) return "";
  let t = m(e);
  return t = t.replace(/`([^`]+)`/g, "<code>$1</code>"), t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>"), t = t.replace(/__([^_]+)__/g, "<strong>$1</strong>"), t = t.replace(/\*([^*]+)\*/g, "<em>$1</em>"), t = t.replace(/_([^_]+)_/g, "<em>$1</em>"), t = t.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (s, n, r) => /^https?:\/\//i.test(r) ? `<a href="${r}" target="_blank" rel="noopener">${n}</a>` : n
  ), t;
}
function ne(e, t, s = {}) {
  const n = O(e), r = {
    plane: s.plane || "component",
    defs: n.$defs,
    container: t
  }, a = {};
  return N(n, a, "", r), a;
}
function N(e, t, s, n) {
  const r = e.properties;
  if (r)
    for (const [a, o] of Object.entries(r)) {
      const i = s ? `${s}.${a}` : a, c = $(o, n.defs);
      if (G(c) !== n.plane) continue;
      const l = I(c, n.defs);
      if (l) {
        const u = se(i, l, n);
        u !== null && (t[a] = u);
        continue;
      }
      const d = T(c, n.defs);
      if (d) {
        const u = re(i, d, n);
        u !== null && (t[a] = u);
        continue;
      }
      if (k(c)) {
        const u = {};
        N(c, u, i, n), Object.keys(u).length > 0 && (t[a] = u);
        continue;
      }
      const f = W(i, c, n);
      f !== E && (t[a] = f);
    }
}
function se(e, t, s) {
  const n = s.container.querySelector(`[data-array-key="${A(e)}"]`);
  if (!n) return null;
  const r = [];
  return n.querySelectorAll(":scope > .rsu-config-array-items > .rsu-config-array-item").forEach((a) => {
    const o = a.dataset.arrayIndex;
    if (o === void 0) return;
    const i = {};
    N(t, i, `${e}.${o}`, s), r.push(i);
  }), r;
}
function re(e, t, s) {
  const n = s.container.querySelector(`[data-map-key="${A(e)}"]`);
  if (!n) return null;
  const r = {};
  return n.querySelectorAll(":scope > .rsu-config-map-entries > .rsu-config-map-entry").forEach((a) => {
    const o = (a.dataset.mapName || "").trim();
    if (!o) return;
    const i = `${e}.${o}`;
    if (k(t)) {
      const l = {};
      N(t, l, i, s), r[o] = l;
      return;
    }
    const c = W(i, t, s);
    r[o] = c === E ? "" : c;
  }), r;
}
const E = Symbol("omit");
function W(e, t, s) {
  const n = s.container.querySelector(`[data-key="${A(e)}"]`);
  if (!n) return E;
  if (n instanceof HTMLInputElement && n.dataset.json === "1")
    try {
      return JSON.parse(n.value);
    } catch {
      return E;
    }
  if (n instanceof HTMLInputElement && n.type === "checkbox")
    return n.checked;
  if (n instanceof HTMLInputElement && n.type === "number")
    return n.value === "" ? E : t.type === "integer" ? parseInt(n.value, 10) : parseFloat(n.value);
  const r = n.value;
  return U(t), r === "" ? E : r;
}
function ae(e, t, s) {
  const n = s === void 0 ? void 0 : O(s);
  return z(e, t, n, n == null ? void 0 : n.$defs);
}
function z(e, t, s, n) {
  const r = {};
  for (const [a, o] of Object.entries(t)) {
    const i = e[a], c = s != null && s.properties ? $(s.properties[a], n) : void 0;
    if (!(c ? T(c, n) !== null : !1) && S(o) && S(i)) {
      const d = z(i, o, c, n);
      Object.keys(d).length > 0 && (r[a] = d);
      continue;
    }
    oe(i, o) || (r[a] = o);
  }
  return r;
}
function oe(e, t) {
  return e === t ? !0 : typeof e != typeof t || e === null || t === null || typeof e != "object" ? !1 : JSON.stringify(e) === JSON.stringify(t);
}
const V = "rsu-advanced", ie = "rsu-config-foreign";
function le(e, t, s, n = {}) {
  const r = O(t);
  e.innerHTML = "";
  const a = {
    plane: n.plane || "component",
    defs: r.$defs,
    onChange: n.onChange,
    componentId: n.componentId
  };
  B(r, s ?? {}, "", e, a), q(e, !1), e.addEventListener("click", (o) => {
    const i = o.target.closest(".rsu-config-desc-toggle");
    if (!i) return;
    const c = i.parentElement;
    if (!c) return;
    const l = c.classList.toggle("rsu-config-desc--collapsed");
    i.textContent = l ? "more…" : "less";
  });
}
function ce(e) {
  return e.querySelector(`.${V}`) !== null;
}
function q(e, t) {
  e.querySelectorAll(`.${V}`).forEach((s) => {
    s.hidden = !t;
  });
}
function de(e) {
  e.querySelectorAll(".rsu-config-error").forEach((t) => t.remove()), e.querySelectorAll(".rsu-config-row--invalid").forEach((t) => t.classList.remove("rsu-config-row--invalid"));
}
function ue(e, t, s) {
  const n = e.querySelector(`[data-key="${A(t)}"]`), r = n == null ? void 0 : n.closest(".rsu-config-row");
  if (!r) return !1;
  r.classList.add("rsu-config-row--invalid");
  const a = document.createElement("span");
  return a.className = "rsu-config-error", a.textContent = s, r.appendChild(a), !0;
}
function B(e, t, s, n, r) {
  const a = e.properties;
  if (!a) return;
  const o = e.required || [], i = S(t) ? t : {};
  let c = Object.entries(a);
  if (s === "") {
    const l = [], d = [];
    for (const f of c) {
      const u = $(f[1], r.defs);
      (k(u) || I(u, r.defs) || T(u, r.defs) ? d : l).push(f);
    }
    if (l.length > 0) {
      const f = F("General");
      for (const [u, p] of l)
        f.appendChild(j(u, u, p, i[u], o, r));
      n.appendChild(f);
    }
    c = d;
  }
  for (const [l, d] of c) {
    const f = s ? `${s}.${l}` : l, u = $(d, r.defs), p = i[l], g = I(u, r.defs);
    if (g) {
      n.appendChild(be(l, f, u, g, p, r));
      continue;
    }
    const y = T(u, r.defs);
    if (y) {
      n.appendChild(ve(l, f, u, y, p, r));
      continue;
    }
    if (k(u)) {
      const v = F(l, u.description);
      H(v, u, r), B(u, p, f, v, r), n.appendChild(v);
      continue;
    }
    n.appendChild(j(f, l, d, p, o, r));
  }
}
function F(e, t) {
  const s = document.createElement("div");
  return s.className = "rsu-config-section", s.innerHTML = `<h3 class="rsu-config-section-title">${m(e)}</h3>` + (t ? _(t) : ""), s;
}
function _(e) {
  const t = M(e);
  if (!(e.length > 140 || e.includes(`
`))) return `<p class="rsu-config-desc">${t}</p>`;
  let n = e.split(`
`)[0];
  return n.length > 120 && (n = `${n.slice(0, 120)}…`), `<div class="rsu-config-desc rsu-config-desc--collapsed"><span class="rsu-config-desc-short">${M(n)}</span><span class="rsu-config-desc-full">${t}</span><button type="button" class="rsu-config-desc-toggle">more…</button></div>`;
}
function H(e, t, s) {
  t.advanced && e.classList.add(V);
  const n = G(t) !== s.plane;
  return n && e.classList.add(ie), n;
}
function w(e, t) {
  return t.onChange && e.querySelectorAll("[data-key]").forEach((s) => {
    s.addEventListener("change", () => {
      var n;
      return (n = t.onChange) == null ? void 0 : n.call(t);
    }), s.addEventListener("input", () => {
      var n;
      return (n = t.onChange) == null ? void 0 : n.call(t);
    });
  }), e;
}
function j(e, t, s, n, r, a) {
  const o = $(s, a.defs), i = document.createElement("div");
  i.className = "rsu-config-row";
  const l = H(i, o, a) ? " disabled" : "", d = r.includes(t), f = o.default ?? "", u = n ?? f, p = o.description ? `${o.description}
(${e})` : e !== t ? e : "", y = `<span class="rsu-config-key"${p ? ` title="${b(p)}"` : ""}>${m(t)}${d ? " *" : ""}</span>`, v = o.description ? `<span class="rsu-config-help">${M(o.description)}</span>` : "", C = {
    row: i,
    fullKey: e,
    label: y,
    help: v,
    disabled: l,
    displayVal: u,
    node: o,
    currentVal: n,
    defaultVal: f,
    ctx: a
  };
  return U(o) ? fe(C) : o.type === "array" || Array.isArray(u) ? pe(C) : Array.isArray(o.enum) ? he(C) : o.type === "integer" || o.type === "number" ? ge(C) : o.type === "boolean" ? ye(C) : me(C);
}
function fe(e) {
  const t = e.currentVal !== void 0 && e.currentVal !== null && e.currentVal !== "", s = t ? "(already set — enter a new value to change)" : "(not set — can be saved later)";
  return e.row.innerHTML = e.label + `<input type="password" class="rsu-config-value" data-key="${b(e.fullKey)}" data-secret="1" value="" placeholder="${b(s)}" autocomplete="off"${e.disabled}><span class="rsu-badge ${t ? "rsu-badge--success" : "rsu-badge--warning"}">${t ? "set" : "not set"}</span>` + e.help, w(e.row, e.ctx);
}
function pe(e) {
  const t = JSON.stringify(e.displayVal === "" ? [] : e.displayVal);
  return e.row.innerHTML = e.label + `<input type="text" class="rsu-config-value" data-key="${b(e.fullKey)}" data-json="1" value="${b(t)}" spellcheck="false"${e.disabled}><span class="rsu-config-hint">JSON list</span>` + e.help, w(e.row, e.ctx);
}
function he(e) {
  const t = String(e.currentVal ?? e.defaultVal ?? ""), s = e.node.enum.map((n) => {
    const r = String(n);
    return `<option value="${b(r)}"${r === t ? " selected" : ""}>${m(
      r
    )}</option>`;
  }).join("");
  return e.row.innerHTML = e.label + `<select class="rsu-config-value" data-key="${b(e.fullKey)}"${e.disabled}>${s}</select>` + e.help, w(e.row, e.ctx);
}
function ge(e) {
  const t = e.node.type === "integer" ? ' step="1"' : "";
  return e.row.innerHTML = e.label + `<input type="number" class="rsu-config-value" data-key="${b(e.fullKey)}" value="${b(String(e.displayVal))}"${t}${e.disabled}>` + e.help, w(e.row, e.ctx);
}
function ye(e) {
  const t = e.displayVal === !0 || e.displayVal === "true" || e.displayVal === 1;
  return e.row.innerHTML = e.label + `<input type="checkbox" class="rsu-config-value" data-key="${b(e.fullKey)}"${t ? " checked" : ""}${e.disabled}>` + e.help, w(e.row, e.ctx);
}
function me(e) {
  return e.row.innerHTML = e.label + `<input type="text" class="rsu-config-value" data-key="${b(e.fullKey)}" value="${b(String(e.displayVal))}"${e.disabled}>` + e.help, w(e.row, e.ctx);
}
function be(e, t, s, n, r, a) {
  const o = document.createElement("div");
  o.className = "rsu-config-section rsu-config-array", o.dataset.arrayKey = t, H(o, s, a), o.innerHTML = `<h3 class="rsu-config-section-title">${m(e)}</h3>` + (s.description ? _(s.description) : "");
  const i = document.createElement("div");
  i.className = "rsu-config-array-items", o.appendChild(i), (Array.isArray(r) ? r : []).forEach((d, f) => P(i, t, f, n, d, a));
  const l = document.createElement("button");
  return l.type = "button", l.className = "rsu-btn rsu-config-array-add", l.textContent = `+ Add ${e} item`, l.addEventListener("click", () => {
    var f;
    const d = i.querySelectorAll(":scope > .rsu-config-array-item").length;
    P(i, t, d, n, {}, a), q(i, !1), (f = a.onChange) == null || f.call(a);
  }), o.appendChild(l), o;
}
function P(e, t, s, n, r, a) {
  const o = document.createElement("div");
  o.className = "rsu-config-array-item", o.dataset.arrayIndex = String(s), o.dataset.arrayPrefix = t;
  const i = S(r) ? r : {}, c = i.id ?? i.name ?? i.email ?? i.account_id ?? `[${s}]`, l = document.createElement("div");
  l.className = "rsu-config-array-item-header", l.innerHTML = `<span>${m(String(c))}</span>`;
  const d = document.createElement("button");
  d.type = "button", d.className = "rsu-config-array-remove", d.textContent = "Remove", d.addEventListener("click", () => {
    var u;
    o.remove(), Ee(e), (u = a.onChange) == null || u.call(a);
  }), l.appendChild(d), o.appendChild(l);
  const f = document.createElement("div");
  f.className = "rsu-config-array-item-body", B(n, i, `${t}.${s}`, f, a), o.appendChild(f), e.appendChild(o);
}
function ve(e, t, s, n, r, a) {
  const o = document.createElement("div");
  o.className = "rsu-config-section rsu-config-map", o.dataset.mapKey = t, H(o, s, a), o.innerHTML = `<h3 class="rsu-config-section-title">${m(e)}</h3>` + (s.description ? _(s.description) : "");
  const i = document.createElement("div");
  i.className = "rsu-config-map-entries", o.appendChild(i);
  const c = S(r) ? r : {};
  for (const [d, f] of Object.entries(c))
    J(i, t, d, n, f, a);
  const l = document.createElement("button");
  return l.type = "button", l.className = "rsu-btn rsu-config-map-add", l.textContent = `+ Add ${e} entry`, l.addEventListener("click", () => {
    var d;
    J(i, t, "", n, void 0, a), q(i, !1), (d = a.onChange) == null || d.call(a);
  }), o.appendChild(l), o;
}
function J(e, t, s, n, r, a) {
  const o = s || a.componentId || "", i = a.componentId !== void 0, c = document.createElement("div");
  c.className = "rsu-config-array-item rsu-config-map-entry", c.dataset.mapPrefix = t, c.dataset.mapName = o;
  const l = document.createElement("div");
  l.className = "rsu-config-array-item-header rsu-config-map-entry-header", i ? l.innerHTML = `<span class="rsu-config-map-name">${m(o)}</span>` : l.innerHTML = `<input type="text" class="rsu-config-map-name" value="${b(o)}" spellcheck="false" placeholder="name">`, c.appendChild(l);
  const d = document.createElement("div");
  if (d.className = "rsu-config-array-item-body", c.appendChild(d), ((p) => {
    d.innerHTML = "";
    const g = `${t}.${p}`;
    if (k(n)) {
      let y = r;
      a.componentId && S(n.properties) && "project_id" in n.properties && (y = {
        ...S(y) ? y : {},
        project_id: a.componentId
      }), B(n, y, g, d, a);
    } else
      d.appendChild(j(g, "value", n, r, [], a));
  })(o), !i) {
    const p = l.querySelector(".rsu-config-map-name");
    p.addEventListener("input", () => {
      var y;
      const g = p.value.trim();
      g !== c.dataset.mapName && (c.dataset.mapName = g, $e(d, t, g), (y = a.onChange) == null || y.call(a));
    });
  }
  const u = document.createElement("button");
  u.type = "button", u.className = "rsu-config-array-remove", u.textContent = "Remove", u.addEventListener("click", () => {
    var p;
    c.remove(), (p = a.onChange) == null || p.call(a);
  }), l.appendChild(u), e.appendChild(c);
}
function $e(e, t, s) {
  e.querySelectorAll("[data-key]").forEach((n) => {
    const r = n, a = r.dataset.key;
    if (!a || !a.startsWith(`${t}.`)) return;
    const o = a.slice(t.length + 1), i = o.includes(".") ? o.slice(o.indexOf(".")) : "";
    r.dataset.key = `${t}.${s}${i}`;
  });
}
function Ee(e) {
  e.querySelectorAll(":scope > .rsu-config-array-item").forEach((t, s) => {
    const n = t, r = Number(n.dataset.arrayIndex), a = n.dataset.arrayPrefix;
    if (a !== void 0 && r !== s) {
      const o = `${a}.${r}.`, i = `${a}.${s}.`;
      n.querySelectorAll("[data-key]").forEach((c) => {
        const l = c, d = l.dataset.key;
        d && d.startsWith(o) && (l.dataset.key = i + d.slice(o.length));
      });
    }
    n.dataset.arrayIndex = String(s);
  });
}
const Se = `
<div class="rsu-config-panel">
  <div class="rsu-config-panel-header">
    <h2 class="rsu-config-panel-title"></h2>
    <div class="rsu-config-panel-tabs" role="tablist">
      <button type="button" class="rsu-config-tab" data-tab="fields" role="tab">Settings</button>
      <button type="button" class="rsu-config-tab" data-tab="history" role="tab">History</button>
    </div>
  </div>
  <div class="rsu-config-banner" hidden></div>
  <div class="rsu-config-tabpanel" data-tab="fields">
    <label class="rsu-config-advanced-bar" hidden>
      <input type="checkbox" class="rsu-config-advanced-toggle">
      Show advanced settings
    </label>
    <div class="rsu-config-form"></div>
    <div class="rsu-config-actions">
      <button type="button" class="rsu-btn rsu-config-save" disabled>Save</button>
      <span class="rsu-config-version"></span>
    </div>
  </div>
  <div class="rsu-config-tabpanel" data-tab="history" hidden>
    <table class="rsu-config-history">
      <thead><tr><th>Version</th><th>When</th><th>Changed keys</th><th></th></tr></thead>
      <tbody></tbody>
    </table>
  </div>
</div>
`;
class Ce {
  constructor(t) {
    h(this, "client");
    h(this, "plane");
    h(this, "onSaved");
    h(this, "root");
    h(this, "formEl");
    h(this, "banner");
    h(this, "saveBtn");
    h(this, "versionEl");
    h(this, "historyBody");
    h(this, "advancedBar");
    h(this, "advancedToggle");
    h(this, "componentId");
    h(this, "schema");
    h(this, "loaded");
    this.client = t.client, this.plane = t.plane, this.onSaved = t.onSaved, this.root = t.root, this.formEl = t.formEl, this.banner = t.banner, this.saveBtn = t.saveBtn, this.versionEl = t.versionEl, this.historyBody = t.historyBody, this.advancedBar = t.advancedBar, this.advancedToggle = t.advancedToggle, this.componentId = t.componentId, this.schema = t.schema, this.loaded = t.loaded;
  }
  /** Re-fetch config and re-render the form, discarding unsaved edits. */
  async reload() {
    try {
      const t = await this.client.getConfig();
      this.renderForm(t), this.hideBanner();
    } catch (t) {
      this.showBanner(`Failed to load config: ${L(t)}`, "error");
    }
  }
  /** Save the changed keys.  Resolves `false` when validation rejected them. */
  async save() {
    var n;
    de(this.formEl), this.hideBanner(), this.saveBtn.disabled = !0;
    const t = ne(this.schema, this.formEl, { plane: this.plane }), s = ae(this.loaded, t, this.schema);
    if (Object.keys(s).length === 0)
      return this.showBanner("No changes to save.", "success"), !0;
    try {
      const r = await this.client.putConfig(s);
      return this.renderForm({ config: r.config, schema: this.schema, version: r.version }), this.showBanner(`Saved — now at version ${r.version}.`, "success"), (n = this.onSaved) == null || n.call(this, r), !0;
    } catch (r) {
      return this.saveBtn.disabled = !1, r instanceof D ? r.key && ue(this.formEl, r.key, r.message) || this.showBanner(r.message, "error") : this.showBanner(`Save failed: ${L(r)}`, "error"), !1;
    }
  }
  /** Re-fetch and render the version history. */
  async loadHistory() {
    this.historyBody.innerHTML = '<tr><td colspan="4">Loading…</td></tr>';
    try {
      const { versions: t } = await this.client.getVersions();
      this.renderHistory(t || []);
    } catch (t) {
      this.historyBody.innerHTML = `<tr><td colspan="4">${m(L(t))}</td></tr>`;
    }
  }
  /** Roll back to *version*, re-rendering the form on success. */
  async rollback(t) {
    var s;
    try {
      const n = await this.client.rollback(t);
      this.renderForm({ config: n.config, schema: this.schema, version: n.version }), this.showBanner(`Rolled back — now at version ${n.version}.`, "success"), (s = this.onSaved) == null || s.call(this, n), this.selectTab("fields");
    } catch (n) {
      this.showBanner(`Rollback failed: ${L(n)}`, "error");
    }
  }
  /** Render *response* into the form, resetting schema/loaded and the save button. */
  renderForm(t) {
    this.schema = t.schema, this.loaded = t.config || {}, le(this.formEl, this.schema, this.loaded, {
      plane: this.plane,
      componentId: this.componentId,
      onChange: () => {
        this.saveBtn.disabled = !1;
      }
    }), this.advancedBar.hidden = !ce(this.formEl), this.advancedToggle.checked = !1, this.versionEl.textContent = t.version ? `version ${t.version}` : "", this.saveBtn.disabled = !0;
  }
  /** Render *versions* into the history table. */
  renderHistory(t) {
    if (t.length === 0) {
      this.historyBody.innerHTML = '<tr><td colspan="4">No previous versions.</td></tr>';
      return;
    }
    this.historyBody.innerHTML = t.map(
      (s) => `<tr><td>${m(s.version)}</td><td>${m(s.timestamp)}</td><td>${m((s.changed_keys || []).join(", "))}</td><td><button type="button" class="rsu-config-rollback" data-version="${m(s.version)}">Roll back</button></td></tr>`
    ).join("");
  }
  /** Switch the visible tab, loading history the first time it is shown. */
  selectTab(t) {
    this.root.querySelectorAll(".rsu-config-tab").forEach((s) => {
      s.classList.toggle("rsu-config-tab--active", s.dataset.tab === t);
    }), this.root.querySelectorAll(".rsu-config-tabpanel").forEach((s) => {
      s.hidden = s.dataset.tab !== t;
    }), t === "history" && this.loadHistory();
  }
  showBanner(t, s) {
    this.banner.textContent = t, this.banner.className = `rsu-config-banner rsu-config-banner--${s}`, this.banner.hidden = !1;
  }
  hideBanner() {
    this.banner.hidden = !0;
  }
}
function Ne(e, t = {}) {
  const s = t.client || new Y(t), n = t.plane || "component", r = t.history !== !1;
  e.innerHTML = Se;
  const a = e.querySelector(".rsu-config-panel"), o = a.querySelector(".rsu-config-panel-title"), i = a.querySelector(".rsu-config-banner"), c = a.querySelector(".rsu-config-form"), l = a.querySelector(".rsu-config-advanced-bar"), d = a.querySelector(".rsu-config-advanced-toggle"), f = a.querySelector(".rsu-config-save"), u = a.querySelector(".rsu-config-version"), p = a.querySelector(".rsu-config-history tbody");
  o.textContent = t.title || "Settings", r || (a.querySelector('.rsu-config-tab[data-tab="history"]').hidden = !0);
  const g = new Ce({
    root: a,
    client: s,
    plane: n,
    onSaved: t.onSaved,
    componentId: t.componentId,
    formEl: c,
    banner: i,
    saveBtn: f,
    versionEl: u,
    historyBody: p,
    advancedBar: l,
    advancedToggle: d,
    schema: { type: "object", properties: {} },
    loaded: {}
  });
  return a.querySelectorAll(".rsu-config-tab").forEach((y) => {
    y.addEventListener(
      "click",
      () => g.selectTab(y.dataset.tab || "fields")
    );
  }), d.addEventListener(
    "change",
    () => q(c, d.checked)
  ), f.addEventListener("click", () => void g.save()), p.addEventListener("click", (y) => {
    const v = y.target.closest(".rsu-config-rollback");
    v && g.rollback(Number(v.dataset.version));
  }), g.selectTab("fields"), t.initial ? g.renderForm(t.initial) : g.reload(), {
    element: a,
    reload: () => g.reload(),
    save: () => g.save(),
    destroy: () => {
      e.innerHTML = "";
    }
  };
}
function L(e) {
  return e instanceof Error ? e.message : String(e);
}
const ke = `
<header class="rsu-appshell">
  <span class="rsu-appshell-brand"></span>
  <button
    type="button"
    class="rsu-appshell-toggle"
    aria-expanded="false"
    aria-label="Toggle navigation"
  >
    <span class="rsu-appshell-toggle-bar"></span>
    <span class="rsu-appshell-toggle-bar"></span>
    <span class="rsu-appshell-toggle-bar"></span>
  </button>
  <nav class="rsu-appshell-nav" aria-label="Main navigation">
    <ul class="rsu-appshell-nav-list"></ul>
  </nav>
  <div class="rsu-appshell-right">
    <a class="rsu-appshell-settings" hidden>Settings</a>
    <div class="rsu-appshell-slot"></div>
  </div>
</header>
`;
function qe(e, t = {}) {
  e.innerHTML = ke;
  const s = e.querySelector(".rsu-appshell"), n = s.querySelector(".rsu-appshell-brand"), r = s.querySelector(".rsu-appshell-nav-list"), a = s.querySelector(".rsu-appshell-toggle"), o = s.querySelector(".rsu-appshell-settings"), i = s.querySelector(".rsu-appshell-slot");
  return t.brand ? n.textContent = t.brand : n.hidden = !0, we(r, t.navItems || []), t.settingsHref && (o.setAttribute("href", t.settingsHref), o.hidden = !1), t.rightSlot != null && Le(i, t.rightSlot), a.addEventListener("click", () => {
    const c = s.classList.toggle("rsu-appshell--open");
    a.setAttribute("aria-expanded", String(c));
  }), {
    element: s,
    rightSlot: i,
    destroy: () => {
      e.innerHTML = "";
    }
  };
}
function we(e, t) {
  e.textContent = "";
  for (const s of t) {
    const n = document.createElement("li");
    n.className = "rsu-appshell-nav-item";
    const r = document.createElement("a");
    if (r.className = "rsu-appshell-link", r.setAttribute("href", s.href), s.active && (r.classList.add("rsu-appshell-link--active"), r.setAttribute("aria-current", "page")), s.icon) {
      const o = document.createElement("span");
      o.className = "rsu-appshell-icon", o.setAttribute("aria-hidden", "true"), o.textContent = s.icon, r.appendChild(o);
    }
    const a = document.createElement("span");
    a.className = "rsu-appshell-label", a.textContent = s.label, r.appendChild(a), n.appendChild(r), e.appendChild(n);
  }
}
function Le(e, t) {
  e.textContent = "", typeof t == "string" ? e.textContent = t : e.appendChild(t);
}
export {
  V as ADVANCED_CLASS,
  Y as ConfigClient,
  D as ConfigValidationError,
  ie as FOREIGN_CLASS,
  I as arrayItemObject,
  de as clearFieldErrors,
  ne as collectConfigValues,
  ae as diffConfigValues,
  O as ensureJsonSchema,
  b as escAttr,
  m as escHtml,
  G as fieldPlane,
  ce as hasAdvancedFields,
  k as isObjectNode,
  U as isSecretField,
  T as mapValueSchema,
  qe as mountAppShell,
  Ne as mountConfigPanel,
  Q as parseProblemKey,
  le as renderConfigForm,
  M as renderInlineMarkdown,
  $ as resolveRef,
  q as setAdvancedVisible,
  Ae as setNestedValue,
  ue as showFieldError
};
//# sourceMappingURL=vanilla.js.map
