/* BEGIN USAGE */
// browser-window.js — Simplified Chrome browser window (dark theme, macOS), as custom elements.
// No dependencies, no image assets, no React. All inline styles + inline SVG.
// Defines: <browser-window>, <browser-tab-bar>, <browser-toolbar>, <browser-tab>, <browser-traffic-lights>
//
// Usage — wrap your page content in <browser-window> to get the tab bar + URL bar.
// Tabs are light-DOM children; the window marks the active one from `active-index`:
//
//   <browser-window width="1100" height="680" url="acme.design/pricing" active-index="0">
//     <browser-tab title="Pricing"></browser-tab>
//     <browser-tab title="Docs"></browser-tab>
//     ...your page content...
//   </browser-window>
//
// Attributes:
//   <browser-window>  width (900) · height (600) · url ("example.com") · active-index (0)
//   <browser-tab>     title ("New Tab") · active
//   <browser-toolbar> url
// With no <browser-tab> children the window renders a single "New Tab".
// `active` on a tab is for authoring; the parent rewrites data-active on every render,
// so when both are present the parent wins.
/* END USAGE */

(() => {
  const C = {
    barBg: '#202124',
    tabBg: '#35363a',
    text: '#e8eaed',
    dim: '#9aa0a6',
    urlBg: '#282a2d',
  };
  /**
   * React version renders text and attributes through JSX, which escapes them. These
   * elements build their shadow with innerHTML template strings, so that protection is
   * gone — every value that comes from an author attribute, from persisted state, or
   * from a Magic Share replay has to go through here. The artboard label matters most:
   * it is renameable, it round-trips through the sidecar, AND a peer can push one in
   * over Magic Share, so an unescaped one is script execution in the follower's page.
   */
  const esc = (v) =>
    String(v ?? '').replace(
      /[&<>"']/g,
      (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch],
    );

  // Non-numeric input falls through into a style="..." attribute, so it must be
  // escaped too — a quote in it would break out of the attribute.
  const px = (v) => (/^-?\d+(\.\d+)?$/.test(String(v)) ? `${v}px` : esc(v));

  /**
   * display:contents — the host generates no box of its own, so the shadow's root
   * div becomes the parent's layout child directly. That is what keeps this port
   * pixel-identical to the React version: the JSX component renders that same div
   * with nothing wrapping it. `block` would add an outer box that swallows the
   * flex properties meant for the inner one, showing up as a few pixels of drift
   * in the visual regression.
   */
  /**
   * The React version lives in the light DOM, so its box model comes from the
   * product's own `*` reset (most products set border-box). That reset never
   * reaches into a shadow root, and hardcoding either value gets half the products
   * wrong. `inherit` is wrong too — it passes an inline border-box down to
   * descendants, which a `*` rule would not. Copying the host's computed value is
   * the only thing that matches the React version exactly: the host is a light DOM
   * element, so the product's `*` rule does hit it.
   */
  const hostCss = (el) =>
    '<style>:host{display:contents}*,*::before,*::after{box-sizing:' +
    getComputedStyle(el).boxSizing +
    '}</style>';

  class Base extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }
    connectedCallback() {
      this._render();
    }
    attributeChangedCallback() {
      if (this.shadowRoot) this._render();
    }
    attr(name, fallback) {
      const v = this.getAttribute(name);
      return v === null || v === '' ? fallback : v;
    }
  }

  class ChromeTrafficLights extends Base {
    _render() {
      const dot = (bg) =>
        `<div style="width:12px;height:12px;border-radius:50%;background:${bg}"></div>`;
      this.shadowRoot.innerHTML =
        hostCss(this) +
        `
        <div part="frame" style="display:flex;gap:8px;padding:0 14px">
          ${dot('#ff5f57')}${dot('#febc2e')}${dot('#28c840')}
        </div>`;
    }
  }

  class ChromeTab extends Base {
    static get observedAttributes() {
      return ['title', 'active', 'data-active'];
    }
    _render() {
      // The parent rewrites data-active on every reflow; an author-written `active`
      // only takes effect when there is no parent to override it.
      const active = this.hasAttribute('data-active') || this.hasAttribute('active');
      const curve = (flip) => `
        <svg width="8" height="10" viewBox="0 0 8 10"
             style="position:absolute;bottom:0;${flip ? 'right' : 'left'}:-8px;${flip ? 'transform:scaleX(-1);' : ''}">
          <path d="M0 10C2 9 6 8 8 0V10H0Z" fill="${C.tabBg}"/>
        </svg>`;
      this.shadowRoot.innerHTML =
        hostCss(this) +
        `
        <div part="frame" style="position:relative;height:34px;align-self:flex-end;padding:0 12px;
             display:flex;align-items:center;gap:8px;
             background:${active ? C.tabBg : 'transparent'};border-radius:8px 8px 0 0;
             min-width:120px;max-width:220px;font-family:system-ui,sans-serif;font-size:12px;
             color:${active ? C.text : C.dim}">
          ${active ? curve(false) + curve(true) : ''}
          <div style="width:14px;height:14px;border-radius:50%;background:#5f6368;flex-shrink:0"></div>
          <span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(this.attr('title', 'New Tab'))}</span>
        </div>`;
    }
  }

  /**
   * Project active-index onto data-active on the children.
   *
   * Same shape as how deck-stage marks its slides: list state is written by the
   * parent onto light DOM children, so authors and tests can read it without
   * piercing a shadow root.
   */
  function markTabs(host) {
    const tabs = [...host.querySelectorAll(':scope > browser-tab')];
    const idx = Number(host.getAttribute('active-index') ?? 0);
    tabs.forEach((t, i) => t.toggleAttribute('data-active', i === idx));
    return tabs;
  }

  /** Supply one default tab when the author wrote none, matching the React
   *  version's default `tabs` value. */
  function ensureDefaultTab(host, slotName) {
    if (host.querySelector(':scope > browser-tab')) return;
    const t = document.createElement('browser-tab');
    t.setAttribute('title', 'New Tab');
    if (slotName) t.setAttribute('slot', slotName);
    t.toggleAttribute('data-active', true);
    host.appendChild(t);
  }

  class ChromeTabBar extends Base {
    static get observedAttributes() {
      return ['active-index'];
    }
    _render() {
      this.shadowRoot.innerHTML =
        hostCss(this) +
        `
        <div part="frame" style="display:flex;align-items:center;height:44px;background:${C.barBg};padding-right:8px">
          <browser-traffic-lights></browser-traffic-lights>
          <div style="display:flex;align-items:flex-end;height:100%;padding-left:4px;flex:1"><slot></slot></div>
        </div>`;
      ensureDefaultTab(this);
      markTabs(this);
    }
  }

  class ChromeToolbar extends Base {
    static get observedAttributes() {
      return ['url'];
    }
    _render() {
      const dot = `<div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center">
          <div style="width:16px;height:16px;border-radius:50%;background:${C.dim};opacity:0.4"></div>
        </div>`;
      this.shadowRoot.innerHTML =
        hostCss(this) +
        `
        <div part="frame" style="height:40px;background:${C.tabBg};display:flex;align-items:center;gap:4px;padding:0 8px">
          ${dot}
          <div style="flex:1;height:30px;border-radius:15px;background:${C.urlBg};display:flex;
               align-items:center;gap:8px;padding:0 14px;margin:0 6px">
            <div style="width:12px;height:12px;border-radius:50%;background:${C.dim};opacity:0.4"></div>
            <span style="flex:1;color:${C.text};font-size:13px;font-family:system-ui,sans-serif">${esc(this.attr('url', 'example.com'))}</span>
          </div>
          ${dot}
        </div>`;
    }
  }

  class ChromeWindow extends Base {
    static get observedAttributes() {
      return ['width', 'height', 'url', 'active-index'];
    }
    connectedCallback() {
      this._render();
      if (!this._mo) {
        // Re-mark after the author adds or removes a tab — same reason deck-stage
        // watches for slide changes.
        this._mo = new MutationObserver(() => this._markOwnTabs());
        this._mo.observe(this, { childList: true });
      }
    }
    disconnectedCallback() {
      this._mo?.disconnect();
      this._mo = null;
    }
    _markOwnTabs() {
      for (const t of this.querySelectorAll(':scope > browser-tab')) t.setAttribute('slot', 'tab');
      ensureDefaultTab(this, 'tab');
      markTabs(this);
    }
    _render() {
      this.shadowRoot.innerHTML =
        hostCss(this) +
        `
        <div part="frame" style="width:${px(this.attr('width', 900))};height:${px(this.attr('height', 600))};
             border-radius:10px;overflow:hidden;border:1px solid #DEE0E3;
             display:flex;flex-direction:column;background:${C.tabBg}">
          <div style="display:flex;align-items:center;height:44px;background:${C.barBg};padding-right:8px">
            <browser-traffic-lights></browser-traffic-lights>
            <div style="display:flex;align-items:flex-end;height:100%;padding-left:4px;flex:1">
              <slot name="tab"></slot>
            </div>
          </div>
          <browser-toolbar url="${esc(this.attr('url', 'example.com'))}"></browser-toolbar>
          <div style="flex:1;background:#fff;overflow:auto"><slot></slot></div>
        </div>`;
      this._markOwnTabs();
    }
  }

  for (const [tag, ctor] of [
    ['browser-traffic-lights', ChromeTrafficLights],
    ['browser-tab', ChromeTab],
    ['browser-tab-bar', ChromeTabBar],
    ['browser-toolbar', ChromeToolbar],
    ['browser-window', ChromeWindow],
  ]) {
    if (!customElements.get(tag)) customElements.define(tag, ctor);
  }
})();
