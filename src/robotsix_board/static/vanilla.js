var Y = Object.defineProperty;
var x = (e, t, n) => t in e ? Y(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n;
var h = (e, t, n) => x(e, typeof t != "symbol" ? t + "" : t, n);
class L extends Error {
  constructor(n, s) {
    super(`${n} did not return the standard config envelope: ${s}`);
    /** The route that answered off-contract, e.g. `"GET /config"`. */
    h(this, "route");
    this.name = "ConfigContractError", this.route = n;
  }
}
class K extends Error {
  constructor(n) {
    const s = n.detail || n.title || "Config validation failed";
    super(s);
    h(this, "problem");
    /** The dotted key the message blames, when the detail names one. */
    h(this, "key");
    this.name = "ConfigValidationError", this.problem = n, this.key = ee(s);
  }
}
function ee(e) {
  const t = /^([A-Za-z_][\w.]*)\s*:\s*\S/.exec(e);
  return t ? t[1] : null;
}
function F(e) {
  return typeof e == "object" && e !== null && !Array.isArray(e);
}
function I(e, t) {
  if (!F(e))
    throw new L(t, "the response body is not a JSON object");
  if (!F(e.config)) {
    const n = Object.keys(e).slice(0, 8).join(", ");
    throw new L(
      t,
      `no "config" object in the response (top-level keys: ${n || "none"})`
    );
  }
}
class te {
  constructor(t = {}) {
    h(this, "baseUrl");
    h(this, "headers");
    h(this, "fetchImpl");
    this.baseUrl = (t.baseUrl || "").replace(/\/$/, ""), this.headers = t.headers || {}, this.fetchImpl = t.fetchImpl || globalThis.fetch.bind(globalThis);
  }
  /**
   * `GET /config` — effective values (secrets masked), schema and version.
   *
   * Throws {@link ConfigContractError} when the component answers without a
   * `config` document, rather than reporting an empty config the panel would
   * render — and then save — as schema defaults.
   */
  async getConfig() {
    const t = await this.request("GET", "/config");
    return I(t, "GET /config"), t;
  }
  /**
   * `PUT /config` — partial update.  Throws {@link ConfigValidationError} on
   * 422, {@link ConfigContractError} when the write succeeded but the response
   * carries no `config` document.
   */
  async putConfig(t) {
    const n = await this.request("PUT", "/config", t);
    return I(n, "PUT /config"), n;
  }
  /** `GET /config/versions` — recent versions, newest first. */
  async getVersions() {
    const t = await this.request("GET", "/config/versions");
    if (!Array.isArray(t == null ? void 0 : t.versions))
      throw new L("GET /config/versions", 'no "versions" array in the response');
    return t;
  }
  /** `POST /config/rollback` — revert to *version*, itself a versioned write. */
  async rollback(t) {
    const n = await this.request("POST", "/config/rollback", {
      version: t
    });
    return I(n, "POST /config/rollback"), n;
  }
  async request(t, n, s) {
    const r = { Accept: "application/json", ...this.headers };
    s !== void 0 && (r["Content-Type"] = "application/json");
    const o = await this.fetchImpl(`${this.baseUrl}${n}`, {
      method: t,
      headers: r,
      credentials: "same-origin",
      body: s === void 0 ? void 0 : JSON.stringify(s)
    }), a = await o.json().catch(() => null);
    if (!o.ok) {
      if (o.status === 422 && a && typeof a == "object")
        throw new K(a);
      const i = a || {};
      throw new Error(i.detail || i.title || `HTTP ${o.status}`);
    }
    return a;
  }
}
const ne = ["advanced", "description", "default", "title", "x-deploy-plane"];
function J(e, t) {
  const n = { ...t };
  for (const s of ne) {
    const r = e[s];
    r !== void 0 && n[s] === void 0 && (n[s] = r);
  }
  return n;
}
function $(e, t) {
  if (!e) return {};
  const n = e.anyOf || e.oneOf;
  if (Array.isArray(n)) {
    const r = n.filter((o) => o && o.type !== "null");
    return r.length === 1 ? J(e, $(r[0], t)) : e;
  }
  if (!e.$ref || !t) return e;
  const s = "#/$defs/";
  if (e.$ref.startsWith(s)) {
    const r = e.$ref.slice(s.length), o = t[r];
    if (o) return J(e, o);
  }
  return e;
}
function W(e) {
  return e.format === "password" && e.writeOnly === !0;
}
function z(e) {
  return e["x-deploy-plane"] || "component";
}
function k(e) {
  return e.type === "object" && e.properties !== void 0;
}
function S(e) {
  return e !== null && typeof e == "object" && !Array.isArray(e);
}
function M(e, t) {
  if (e.type !== "array" || !e.items) return null;
  const n = Array.isArray(e.items) ? e.items[0] : e.items;
  if (!n) return null;
  const s = $(n, t);
  return k(s) ? s : null;
}
function A(e, t) {
  if (e.type !== "object" || e.properties) return null;
  const n = e.additionalProperties;
  return !n || typeof n != "object" ? null : $(n, t);
}
function _(e) {
  return e && typeof e == "object" && "properties" in e ? e : X(e || {});
}
function X(e) {
  const t = {};
  for (const [n, s] of Object.entries(e))
    t[n] = se(s);
  return { type: "object", properties: t };
}
function se(e) {
  return e === "SECRET" ? { type: "string", format: "password", writeOnly: !0 } : typeof e == "boolean" ? { type: "boolean", default: e } : typeof e == "number" ? Number.isInteger(e) ? { type: "integer", default: e } : { type: "number", default: e } : Array.isArray(e) ? { type: "array", default: e } : e !== null && typeof e == "object" ? X(e) : { type: "string", default: e ?? "" };
}
function je(e, t, n) {
  const s = t.split(".");
  let r = e;
  for (let o = 0; o < s.length - 1; o++) {
    const a = s[o], i = /^\d+$/.test(s[o + 1]);
    (r[a] === void 0 || r[a] === null) && (r[a] = i ? [] : {}), r = r[a];
  }
  r[s[s.length - 1]] = n;
}
const re = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};
function m(e) {
  return String(e).replace(/[&<>"']/g, (t) => re[t]);
}
function b(e) {
  return m(e);
}
function N(e) {
  const t = globalThis.CSS;
  return t && typeof t.escape == "function" ? t.escape(e) : e;
}
function O(e) {
  if (!e) return "";
  let t = m(e);
  return t = t.replace(/`([^`]+)`/g, "<code>$1</code>"), t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>"), t = t.replace(/__([^_]+)__/g, "<strong>$1</strong>"), t = t.replace(/\*([^*]+)\*/g, "<em>$1</em>"), t = t.replace(/_([^_]+)_/g, "<em>$1</em>"), t = t.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (n, s, r) => /^https?:\/\//i.test(r) ? `<a href="${r}" target="_blank" rel="noopener">${s}</a>` : s
  ), t;
}
function oe(e, t, n = {}) {
  const s = _(e), r = {
    plane: n.plane || "component",
    defs: s.$defs,
    container: t
  }, o = {};
  return q(s, o, "", r), o;
}
function q(e, t, n, s) {
  const r = e.properties;
  if (r)
    for (const [o, a] of Object.entries(r)) {
      const i = n ? `${n}.${o}` : o, c = $(a, s.defs);
      if (z(c) !== s.plane) continue;
      const l = M(c, s.defs);
      if (l) {
        const u = ae(i, l, s);
        u !== null && (t[o] = u);
        continue;
      }
      const d = A(c, s.defs);
      if (d) {
        const u = ie(i, d, s);
        u !== null && (t[o] = u);
        continue;
      }
      if (k(c)) {
        const u = {};
        q(c, u, i, s), Object.keys(u).length > 0 && (t[o] = u);
        continue;
      }
      const f = Z(i, c, s);
      f !== E && (t[o] = f);
    }
}
function ae(e, t, n) {
  const s = n.container.querySelector(`[data-array-key="${N(e)}"]`);
  if (!s) return null;
  const r = [];
  return s.querySelectorAll(":scope > .rsu-config-array-items > .rsu-config-array-item").forEach((o) => {
    const a = o.dataset.arrayIndex;
    if (a === void 0) return;
    const i = {};
    q(t, i, `${e}.${a}`, n), r.push(i);
  }), r;
}
function ie(e, t, n) {
  const s = n.container.querySelector(`[data-map-key="${N(e)}"]`);
  if (!s) return null;
  const r = {};
  return s.querySelectorAll(":scope > .rsu-config-map-entries > .rsu-config-map-entry").forEach((o) => {
    const a = (o.dataset.mapName || "").trim();
    if (!a) return;
    const i = `${e}.${a}`;
    if (k(t)) {
      const l = {};
      q(t, l, i, n), r[a] = l;
      return;
    }
    const c = Z(i, t, n);
    r[a] = c === E ? "" : c;
  }), r;
}
const E = Symbol("omit");
function Z(e, t, n) {
  const s = n.container.querySelector(`[data-key="${N(e)}"]`);
  if (!s) return E;
  if (s instanceof HTMLInputElement && s.dataset.json === "1")
    try {
      return JSON.parse(s.value);
    } catch {
      return E;
    }
  if (s instanceof HTMLInputElement && s.type === "checkbox")
    return s.checked;
  if (s instanceof HTMLInputElement && s.type === "number")
    return s.value === "" ? E : t.type === "integer" ? parseInt(s.value, 10) : parseFloat(s.value);
  const r = s.value;
  return W(t), r === "" ? E : r;
}
function le(e, t, n) {
  const s = n === void 0 ? void 0 : _(n);
  return Q(e, t, s, s == null ? void 0 : s.$defs);
}
function Q(e, t, n, s) {
  const r = {};
  for (const [o, a] of Object.entries(t)) {
    const i = e[o], c = n != null && n.properties ? $(n.properties[o], s) : void 0;
    if (!(c ? A(c, s) !== null : !1) && S(a) && S(i)) {
      const d = Q(i, a, c, s);
      Object.keys(d).length > 0 && (r[o] = d);
      continue;
    }
    ce(i, a) || (r[o] = a);
  }
  return r;
}
function ce(e, t) {
  return e === t ? !0 : typeof e != typeof t || e === null || t === null || typeof e != "object" ? !1 : JSON.stringify(e) === JSON.stringify(t);
}
const R = "rsu-advanced", de = "rsu-config-foreign";
function ue(e, t, n, s = {}) {
  const r = _(t);
  e.innerHTML = "";
  const o = {
    plane: s.plane || "component",
    defs: r.$defs,
    onChange: s.onChange,
    componentId: s.componentId
  };
  B(r, n ?? {}, "", e, o), j(e, !1), e.addEventListener("click", (a) => {
    const i = a.target.closest(".rsu-config-desc-toggle");
    if (!i) return;
    const c = i.parentElement;
    if (!c) return;
    const l = c.classList.toggle("rsu-config-desc--collapsed");
    i.textContent = l ? "more…" : "less";
  });
}
function fe(e) {
  return e.querySelector(`.${R}`) !== null;
}
function j(e, t) {
  e.querySelectorAll(`.${R}`).forEach((n) => {
    n.hidden = !t;
  });
}
function pe(e) {
  e.querySelectorAll(".rsu-config-error").forEach((t) => t.remove()), e.querySelectorAll(".rsu-config-row--invalid").forEach((t) => t.classList.remove("rsu-config-row--invalid"));
}
function he(e, t, n) {
  const s = e.querySelector(`[data-key="${N(t)}"]`), r = s == null ? void 0 : s.closest(".rsu-config-row");
  if (!r) return !1;
  r.classList.add("rsu-config-row--invalid");
  const o = document.createElement("span");
  return o.className = "rsu-config-error", o.textContent = n, r.appendChild(o), !0;
}
function B(e, t, n, s, r) {
  const o = e.properties;
  if (!o) return;
  const a = e.required || [], i = S(t) ? t : {};
  let c = Object.entries(o);
  if (n === "") {
    const l = [], d = [];
    for (const f of c) {
      const u = $(f[1], r.defs);
      (k(u) || M(u, r.defs) || A(u, r.defs) ? d : l).push(f);
    }
    if (l.length > 0) {
      const f = G("General");
      for (const [u, p] of l)
        f.appendChild(V(u, u, p, i[u], a, r));
      s.appendChild(f);
    }
    c = d;
  }
  for (const [l, d] of c) {
    const f = n ? `${n}.${l}` : l, u = $(d, r.defs), p = i[l], g = M(u, r.defs);
    if (g) {
      s.appendChild(Ee(l, f, u, g, p, r));
      continue;
    }
    const y = A(u, r.defs);
    if (y) {
      s.appendChild(Se(l, f, u, y, p, r));
      continue;
    }
    if (k(u)) {
      const v = G(l, u.description);
      H(v, u, r), B(u, p, f, v, r), s.appendChild(v);
      continue;
    }
    s.appendChild(V(f, l, d, p, a, r));
  }
}
function G(e, t) {
  const n = document.createElement("div");
  return n.className = "rsu-config-section", n.innerHTML = `<h3 class="rsu-config-section-title">${m(e)}</h3>` + (t ? P(t) : ""), n;
}
function P(e) {
  const t = O(e);
  if (!(e.length > 140 || e.includes(`
`))) return `<p class="rsu-config-desc">${t}</p>`;
  let s = e.split(`
`)[0];
  return s.length > 120 && (s = `${s.slice(0, 120)}…`), `<div class="rsu-config-desc rsu-config-desc--collapsed"><span class="rsu-config-desc-short">${O(s)}</span><span class="rsu-config-desc-full">${t}</span><button type="button" class="rsu-config-desc-toggle">more…</button></div>`;
}
function H(e, t, n) {
  t.advanced && e.classList.add(R);
  const s = z(t) !== n.plane;
  return s && e.classList.add(de), s;
}
function w(e, t) {
  return t.onChange && e.querySelectorAll("[data-key]").forEach((n) => {
    n.addEventListener("change", () => {
      var s;
      return (s = t.onChange) == null ? void 0 : s.call(t);
    }), n.addEventListener("input", () => {
      var s;
      return (s = t.onChange) == null ? void 0 : s.call(t);
    });
  }), e;
}
function V(e, t, n, s, r, o) {
  const a = $(n, o.defs), i = document.createElement("div");
  i.className = "rsu-config-row";
  const l = H(i, a, o) ? " disabled" : "", d = r.includes(t), f = a.default ?? "", u = s ?? f, p = a.description ? `${a.description}
(${e})` : e !== t ? e : "", y = `<span class="rsu-config-key"${p ? ` title="${b(p)}"` : ""}>${m(t)}${d ? " *" : ""}</span>`, v = a.description ? `<span class="rsu-config-help">${O(a.description)}</span>` : "", C = {
    row: i,
    fullKey: e,
    label: y,
    help: v,
    disabled: l,
    displayVal: u,
    node: a,
    currentVal: s,
    defaultVal: f,
    ctx: o
  };
  return W(a) ? ge(C) : a.type === "array" || Array.isArray(u) ? ye(C) : Array.isArray(a.enum) ? me(C) : a.type === "integer" || a.type === "number" ? be(C) : a.type === "boolean" ? ve(C) : $e(C);
}
function ge(e) {
  const t = e.currentVal !== void 0 && e.currentVal !== null && e.currentVal !== "", n = t ? "(already set — enter a new value to change)" : "(not set — can be saved later)";
  return e.row.innerHTML = e.label + `<input type="password" class="rsu-config-value" data-key="${b(e.fullKey)}" data-secret="1" value="" placeholder="${b(n)}" autocomplete="off"${e.disabled}><span class="rsu-badge ${t ? "rsu-badge--success" : "rsu-badge--warning"}">${t ? "set" : "not set"}</span>` + e.help, w(e.row, e.ctx);
}
function ye(e) {
  const t = JSON.stringify(e.displayVal === "" ? [] : e.displayVal);
  return e.row.innerHTML = e.label + `<input type="text" class="rsu-config-value" data-key="${b(e.fullKey)}" data-json="1" value="${b(t)}" spellcheck="false"${e.disabled}><span class="rsu-config-hint">JSON list</span>` + e.help, w(e.row, e.ctx);
}
function me(e) {
  const t = String(e.currentVal ?? e.defaultVal ?? ""), n = e.node.enum.map((s) => {
    const r = String(s);
    return `<option value="${b(r)}"${r === t ? " selected" : ""}>${m(
      r
    )}</option>`;
  }).join("");
  return e.row.innerHTML = e.label + `<select class="rsu-config-value" data-key="${b(e.fullKey)}"${e.disabled}>${n}</select>` + e.help, w(e.row, e.ctx);
}
function be(e) {
  const t = e.node.type === "integer" ? ' step="1"' : "";
  return e.row.innerHTML = e.label + `<input type="number" class="rsu-config-value" data-key="${b(e.fullKey)}" value="${b(String(e.displayVal))}"${t}${e.disabled}>` + e.help, w(e.row, e.ctx);
}
function ve(e) {
  const t = e.displayVal === !0 || e.displayVal === "true" || e.displayVal === 1;
  return e.row.innerHTML = e.label + `<input type="checkbox" class="rsu-config-value" data-key="${b(e.fullKey)}"${t ? " checked" : ""}${e.disabled}>` + e.help, w(e.row, e.ctx);
}
function $e(e) {
  return e.row.innerHTML = e.label + `<input type="text" class="rsu-config-value" data-key="${b(e.fullKey)}" value="${b(String(e.displayVal))}"${e.disabled}>` + e.help, w(e.row, e.ctx);
}
function Ee(e, t, n, s, r, o) {
  const a = document.createElement("div");
  a.className = "rsu-config-section rsu-config-array", a.dataset.arrayKey = t, H(a, n, o), a.innerHTML = `<h3 class="rsu-config-section-title">${m(e)}</h3>` + (n.description ? P(n.description) : "");
  const i = document.createElement("div");
  i.className = "rsu-config-array-items", a.appendChild(i), (Array.isArray(r) ? r : []).forEach((d, f) => D(i, t, f, s, d, o));
  const l = document.createElement("button");
  return l.type = "button", l.className = "rsu-btn rsu-config-array-add", l.textContent = `+ Add ${e} item`, l.addEventListener("click", () => {
    var f;
    const d = i.querySelectorAll(":scope > .rsu-config-array-item").length;
    D(i, t, d, s, {}, o), j(i, !1), (f = o.onChange) == null || f.call(o);
  }), a.appendChild(l), a;
}
function D(e, t, n, s, r, o) {
  const a = document.createElement("div");
  a.className = "rsu-config-array-item", a.dataset.arrayIndex = String(n), a.dataset.arrayPrefix = t;
  const i = S(r) ? r : {}, c = i.id ?? i.name ?? i.email ?? i.account_id ?? `[${n}]`, l = document.createElement("div");
  l.className = "rsu-config-array-item-header", l.innerHTML = `<span>${m(String(c))}</span>`;
  const d = document.createElement("button");
  d.type = "button", d.className = "rsu-config-array-remove", d.textContent = "Remove", d.addEventListener("click", () => {
    var u;
    a.remove(), ke(e), (u = o.onChange) == null || u.call(o);
  }), l.appendChild(d), a.appendChild(l);
  const f = document.createElement("div");
  f.className = "rsu-config-array-item-body", B(s, i, `${t}.${n}`, f, o), a.appendChild(f), e.appendChild(a);
}
function Se(e, t, n, s, r, o) {
  const a = document.createElement("div");
  a.className = "rsu-config-section rsu-config-map", a.dataset.mapKey = t, H(a, n, o), a.innerHTML = `<h3 class="rsu-config-section-title">${m(e)}</h3>` + (n.description ? P(n.description) : "");
  const i = document.createElement("div");
  i.className = "rsu-config-map-entries", a.appendChild(i);
  const c = S(r) ? r : {};
  for (const [d, f] of Object.entries(c))
    U(i, t, d, s, f, o);
  const l = document.createElement("button");
  return l.type = "button", l.className = "rsu-btn rsu-config-map-add", l.textContent = `+ Add ${e} entry`, l.addEventListener("click", () => {
    var d;
    U(i, t, "", s, void 0, o), j(i, !1), (d = o.onChange) == null || d.call(o);
  }), a.appendChild(l), a;
}
function U(e, t, n, s, r, o) {
  const a = n || o.componentId || "", i = o.componentId !== void 0, c = document.createElement("div");
  c.className = "rsu-config-array-item rsu-config-map-entry", c.dataset.mapPrefix = t, c.dataset.mapName = a;
  const l = document.createElement("div");
  l.className = "rsu-config-array-item-header rsu-config-map-entry-header", i ? l.innerHTML = `<span class="rsu-config-map-name">${m(a)}</span>` : l.innerHTML = `<input type="text" class="rsu-config-map-name" value="${b(a)}" spellcheck="false" placeholder="name">`, c.appendChild(l);
  const d = document.createElement("div");
  if (d.className = "rsu-config-array-item-body", c.appendChild(d), ((p) => {
    d.innerHTML = "";
    const g = `${t}.${p}`;
    if (k(s)) {
      let y = r;
      o.componentId && S(s.properties) && "project_id" in s.properties && (y = {
        ...S(y) ? y : {},
        project_id: o.componentId
      }), B(s, y, g, d, o);
    } else
      d.appendChild(V(g, "value", s, r, [], o));
  })(a), !i) {
    const p = l.querySelector(".rsu-config-map-name");
    p.addEventListener("input", () => {
      var y;
      const g = p.value.trim();
      g !== c.dataset.mapName && (c.dataset.mapName = g, Ce(d, t, g), (y = o.onChange) == null || y.call(o));
    });
  }
  const u = document.createElement("button");
  u.type = "button", u.className = "rsu-config-array-remove", u.textContent = "Remove", u.addEventListener("click", () => {
    var p;
    c.remove(), (p = o.onChange) == null || p.call(o);
  }), l.appendChild(u), e.appendChild(c);
}
function Ce(e, t, n) {
  e.querySelectorAll("[data-key]").forEach((s) => {
    const r = s, o = r.dataset.key;
    if (!o || !o.startsWith(`${t}.`)) return;
    const a = o.slice(t.length + 1), i = a.includes(".") ? a.slice(a.indexOf(".")) : "";
    r.dataset.key = `${t}.${n}${i}`;
  });
}
function ke(e) {
  e.querySelectorAll(":scope > .rsu-config-array-item").forEach((t, n) => {
    const s = t, r = Number(s.dataset.arrayIndex), o = s.dataset.arrayPrefix;
    if (o !== void 0 && r !== n) {
      const a = `${o}.${r}.`, i = `${o}.${n}.`;
      s.querySelectorAll("[data-key]").forEach((c) => {
        const l = c, d = l.dataset.key;
        d && d.startsWith(a) && (l.dataset.key = i + d.slice(a.length));
      });
    }
    s.dataset.arrayIndex = String(n);
  });
}
const we = `
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
class Le {
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
      this.showBanner(`Failed to load config: ${T(t)}`, "error");
    }
  }
  /** Save the changed keys.  Resolves `false` when validation rejected them. */
  async save() {
    var s;
    pe(this.formEl), this.hideBanner(), this.saveBtn.disabled = !0;
    const t = oe(this.schema, this.formEl, { plane: this.plane }), n = le(this.loaded, t, this.schema);
    if (Object.keys(n).length === 0)
      return this.showBanner("No changes to save.", "success"), !0;
    try {
      const r = await this.client.putConfig(n);
      return this.renderForm({ config: r.config, schema: this.schema, version: r.version }), this.showBanner(`Saved — now at version ${r.version}.`, "success"), (s = this.onSaved) == null || s.call(this, r), !0;
    } catch (r) {
      if (this.saveBtn.disabled = !1, r instanceof K)
        (r.key ? he(this.formEl, r.key, r.message) : !1) || this.showBanner(r.message, "error");
      else {
        if (r instanceof L)
          return this.showBanner(`Saved, but ${r.message}. Re-reading the config.`, "error"), this.reload(), !0;
        this.showBanner(`Save failed: ${T(r)}`, "error");
      }
      return !1;
    }
  }
  /** Re-fetch and render the version history. */
  async loadHistory() {
    this.historyBody.innerHTML = '<tr><td colspan="4">Loading…</td></tr>';
    try {
      const { versions: t } = await this.client.getVersions();
      this.renderHistory(t || []);
    } catch (t) {
      this.historyBody.innerHTML = `<tr><td colspan="4">${m(T(t))}</td></tr>`;
    }
  }
  /** Roll back to *version*, re-rendering the form on success. */
  async rollback(t) {
    var n;
    try {
      const s = await this.client.rollback(t);
      this.renderForm({ config: s.config, schema: this.schema, version: s.version }), this.showBanner(`Rolled back — now at version ${s.version}.`, "success"), (n = this.onSaved) == null || n.call(this, s), this.selectTab("fields");
    } catch (s) {
      this.showBanner(`Rollback failed: ${T(s)}`, "error");
    }
  }
  /**
   * Render *response* into the form, resetting schema/loaded and the save button.
   *
   * Throws {@link ConfigContractError} when the payload carries no `config`
   * document: rendering one anyway means every field falls back to its schema
   * default, and the operator's next Save writes those defaults over the live
   * config.
   */
  renderForm(t) {
    const n = t.config;
    if (typeof n != "object" || n === null || Array.isArray(n))
      throw new L("GET /config", 'no "config" object in the response');
    this.schema = t.schema, this.loaded = n, ue(this.formEl, this.schema, this.loaded, {
      plane: this.plane,
      componentId: this.componentId,
      onChange: () => {
        this.saveBtn.disabled = !1;
      }
    }), this.advancedBar.hidden = !fe(this.formEl), this.advancedToggle.checked = !1, this.versionEl.textContent = t.version ? `version ${t.version}` : "", this.saveBtn.disabled = !0;
  }
  /** Render *versions* into the history table. */
  renderHistory(t) {
    if (t.length === 0) {
      this.historyBody.innerHTML = '<tr><td colspan="4">No previous versions.</td></tr>';
      return;
    }
    this.historyBody.innerHTML = t.map(
      (n) => `<tr><td>${m(n.version)}</td><td>${m(n.timestamp)}</td><td>${m((n.changed_keys || []).join(", "))}</td><td><button type="button" class="rsu-config-rollback" data-version="${m(n.version)}">Roll back</button></td></tr>`
    ).join("");
  }
  /** Switch the visible tab, loading history the first time it is shown. */
  selectTab(t) {
    this.root.querySelectorAll(".rsu-config-tab").forEach((n) => {
      n.classList.toggle("rsu-config-tab--active", n.dataset.tab === t);
    }), this.root.querySelectorAll(".rsu-config-tabpanel").forEach((n) => {
      n.hidden = n.dataset.tab !== t;
    }), t === "history" && this.loadHistory();
  }
  showBanner(t, n) {
    this.banner.textContent = t, this.banner.className = `rsu-config-banner rsu-config-banner--${n}`, this.banner.hidden = !1;
  }
  hideBanner() {
    this.banner.hidden = !0;
  }
}
function Be(e, t = {}) {
  const n = t.client || new te(t), s = t.plane || "component", r = t.history !== !1;
  e.innerHTML = we;
  const o = e.querySelector(".rsu-config-panel"), a = o.querySelector(".rsu-config-panel-title"), i = o.querySelector(".rsu-config-banner"), c = o.querySelector(".rsu-config-form"), l = o.querySelector(".rsu-config-advanced-bar"), d = o.querySelector(".rsu-config-advanced-toggle"), f = o.querySelector(".rsu-config-save"), u = o.querySelector(".rsu-config-version"), p = o.querySelector(".rsu-config-history tbody");
  a.textContent = t.title || "Settings", r || (o.querySelector('.rsu-config-tab[data-tab="history"]').hidden = !0);
  const g = new Le({
    root: o,
    client: n,
    plane: s,
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
  return o.querySelectorAll(".rsu-config-tab").forEach((y) => {
    y.addEventListener(
      "click",
      () => g.selectTab(y.dataset.tab || "fields")
    );
  }), d.addEventListener(
    "change",
    () => j(c, d.checked)
  ), f.addEventListener("click", () => void g.save()), p.addEventListener("click", (y) => {
    const v = y.target.closest(".rsu-config-rollback");
    v && g.rollback(Number(v.dataset.version));
  }), g.selectTab("fields"), t.initial ? g.renderForm(t.initial) : g.reload(), {
    element: o,
    reload: () => g.reload(),
    save: () => g.save(),
    destroy: () => {
      e.innerHTML = "";
    }
  };
}
function T(e) {
  return e instanceof Error ? e.message : String(e);
}
const Te = `
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
function He(e, t = {}) {
  e.innerHTML = Te;
  const n = e.querySelector(".rsu-appshell"), s = n.querySelector(".rsu-appshell-brand"), r = n.querySelector(".rsu-appshell-nav-list"), o = n.querySelector(".rsu-appshell-toggle"), a = n.querySelector(".rsu-appshell-settings"), i = n.querySelector(".rsu-appshell-slot");
  return t.brand ? s.textContent = t.brand : s.hidden = !0, Ae(r, t.navItems || []), t.settingsHref && (a.setAttribute("href", t.settingsHref), a.hidden = !1), t.rightSlot != null && Ne(i, t.rightSlot), o.addEventListener("click", () => {
    const c = n.classList.toggle("rsu-appshell--open");
    o.setAttribute("aria-expanded", String(c));
  }), {
    element: n,
    rightSlot: i,
    destroy: () => {
      e.innerHTML = "";
    }
  };
}
function Ae(e, t) {
  e.textContent = "";
  for (const n of t) {
    const s = document.createElement("li");
    s.className = "rsu-appshell-nav-item";
    const r = document.createElement("a");
    if (r.className = "rsu-appshell-link", r.setAttribute("href", n.href), n.active && (r.classList.add("rsu-appshell-link--active"), r.setAttribute("aria-current", "page")), n.icon) {
      const a = document.createElement("span");
      a.className = "rsu-appshell-icon", a.setAttribute("aria-hidden", "true"), a.textContent = n.icon, r.appendChild(a);
    }
    const o = document.createElement("span");
    o.className = "rsu-appshell-label", o.textContent = n.label, r.appendChild(o), s.appendChild(r), e.appendChild(s);
  }
}
function Ne(e, t) {
  e.textContent = "", typeof t == "string" ? e.textContent = t : e.appendChild(t);
}
export {
  R as ADVANCED_CLASS,
  te as ConfigClient,
  L as ConfigContractError,
  K as ConfigValidationError,
  de as FOREIGN_CLASS,
  M as arrayItemObject,
  pe as clearFieldErrors,
  oe as collectConfigValues,
  le as diffConfigValues,
  _ as ensureJsonSchema,
  b as escAttr,
  m as escHtml,
  z as fieldPlane,
  fe as hasAdvancedFields,
  k as isObjectNode,
  W as isSecretField,
  A as mapValueSchema,
  He as mountAppShell,
  Be as mountConfigPanel,
  ee as parseProblemKey,
  ue as renderConfigForm,
  O as renderInlineMarkdown,
  $ as resolveRef,
  j as setAdvancedVisible,
  je as setNestedValue,
  he as showFieldError
};
//# sourceMappingURL=vanilla.js.map
