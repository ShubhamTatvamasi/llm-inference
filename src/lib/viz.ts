/* ==========================================================================
   viz.ts — tiny shared toolkit for every interactive diagram on the site.
   No framework: plain DOM + SVG. Every diagram component does:

     <div class="viz-mount" data-viz="my-thing"></div>
     <script>
       import { mountAll, ... } from '../../lib/viz';
       mountAll('my-thing', (root) => { ... build UI into root ... });
     </script>

   Colours: always use the semantic tokens in `C` so all chapters agree.
   ========================================================================== */

export const C = {
  prefill: 'var(--c-prefill)', prefillSoft: 'var(--c-prefill-soft)',
  decode: 'var(--c-decode)', decodeSoft: 'var(--c-decode-soft)',
  kv: 'var(--c-kv)', kvSoft: 'var(--c-kv-soft)',
  weight: 'var(--c-weight)', weightSoft: 'var(--c-weight-soft)',
  token: 'var(--c-token)', tokenSoft: 'var(--c-token-soft)',
  compute: 'var(--c-compute)', computeSoft: 'var(--c-compute-soft)',
  mem: 'var(--c-mem)', memSoft: 'var(--c-mem-soft)',
  waste: 'var(--c-waste)', wasteSoft: 'var(--c-waste-soft)',
  comm: 'var(--c-comm)', commSoft: 'var(--c-comm-soft)',
  good: 'var(--c-good)',
  accent: 'var(--accent)', accentSoft: 'var(--accent-soft)',
  text: 'var(--text)', dim: 'var(--text-dim)', faint: 'var(--text-faint)',
  surface: 'var(--surface)', surface2: 'var(--surface-2)', surface3: 'var(--surface-3)',
  border: 'var(--border)', borderStrong: 'var(--border-strong)',
} as const;

/** A palette of 8 distinguishable request/series colours (for "request A, B, C…"). */
export const SERIES = [
  'var(--c-decode)', 'var(--c-prefill)', 'var(--c-token)', 'var(--c-kv)',
  'var(--c-weight)', 'var(--c-comm)', 'var(--c-compute)', 'var(--c-mem)',
];
export const SERIES_SOFT = [
  'var(--c-decode-soft)', 'var(--c-prefill-soft)', 'var(--c-token-soft)', 'var(--c-kv-soft)',
  'var(--c-weight-soft)', 'var(--c-comm-soft)', 'var(--c-compute-soft)', 'var(--c-mem-soft)',
];

const SVGNS = 'http://www.w3.org/2000/svg';
type Attrs = Record<string, string | number | boolean | null | undefined>;

function applyAttrs(el: Element, attrs: Attrs) {
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'text') { el.textContent = String(v); continue; }
    if (k === 'html') { (el as HTMLElement).innerHTML = String(v); continue; }
    el.setAttribute(k, v === true ? '' : String(v));
  }
}

/** Create an SVG element. `s('rect', {x:0, y:0, width:10, height:10, fill:C.kv}, parent)` */
export function s<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Attrs = {}, parent?: Element): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVGNS, tag);
  applyAttrs(el, attrs);
  if (parent) parent.appendChild(el);
  return el;
}

/** Create an HTML element. `h('div', {class:'stats'}, parent)` */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, parent?: Element): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  applyAttrs(el, attrs);
  if (parent) parent.appendChild(el);
  return el;
}

/** Root <svg> with a viewBox. Width scales to container; height follows aspect ratio. */
export function svgRoot(parent: Element, w: number, hgt: number, attrs: Attrs = {}) {
  return s('svg', { viewBox: `0 0 ${w} ${hgt}`, role: 'img', ...attrs }, parent);
}

export function clear(el: Element) { while (el.firstChild) el.removeChild(el.firstChild); }

/** Mount a diagram on every matching placeholder (supports multiple instances per page). */
export function mountAll(name: string, init: (root: HTMLElement) => void) {
  const run = () => {
    document.querySelectorAll<HTMLElement>(`[data-viz="${name}"]`).forEach((root) => {
      if (root.dataset.mounted) return;
      root.dataset.mounted = '1';
      try { init(root); } catch (e) { console.error(`[viz:${name}]`, e); root.textContent = 'Diagram failed to load.'; }
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
}

export const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------------------------------------------------------- formatting */
export const fmt = {
  bytes(b: number, digits = 1) {
    const u = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    let i = 0; let x = b;
    while (Math.abs(x) >= 1024 && i < u.length - 1) { x /= 1024; i++; }
    return `${x.toFixed(i === 0 ? 0 : digits)} ${u[i]}`;
  },
  num(n: number, digits = 1) {
    const a = Math.abs(n);
    if (a >= 1e12) return (n / 1e12).toFixed(digits) + 'T';
    if (a >= 1e9) return (n / 1e9).toFixed(digits) + 'B';
    if (a >= 1e6) return (n / 1e6).toFixed(digits) + 'M';
    if (a >= 1e3) return (n / 1e3).toFixed(digits) + 'k';
    return Number.isInteger(n) ? String(n) : n.toFixed(digits);
  },
  pct(x: number, digits = 0) { return (x * 100).toFixed(digits) + '%'; },
  ms(x: number) { return x >= 1000 ? (x / 1000).toFixed(2) + ' s' : x.toFixed(x < 10 ? 1 : 0) + ' ms'; },
  int(n: number) { return Math.round(n).toLocaleString('en-US'); },
};

export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ease = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

/** Deterministic PRNG so simulations are reproducible across reloads. */
export function rng(seed = 42) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------------------------------------------------------- controls */
const ICON = {
  play: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5v11l9-5.5z"/></svg>',
  pause: '<svg viewBox="0 0 16 16" fill="currentColor"><rect x="3.5" y="2.5" width="3" height="11" rx="1"/><rect x="9.5" y="2.5" width="3" height="11" rx="1"/></svg>',
  step: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M3 2.5v11l7-5.5z"/><rect x="11" y="2.5" width="2.2" height="11" rx="1"/></svg>',
  reset: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 8a5 5 0 1 0 1.6-3.7"/><path d="M3 2.5V5h2.5"/></svg>',
};

export function button(parent: Element, label: string, onClick: () => void, opts: { primary?: boolean; icon?: keyof typeof ICON; title?: string } = {}) {
  const b = h('button', { class: 'btn' + (opts.primary ? ' primary' : ''), type: 'button', title: opts.title }, parent);
  b.innerHTML = (opts.icon ? ICON[opts.icon] : '') + `<span>${label}</span>`;
  b.addEventListener('click', onClick);
  return b;
}

export function ctrlBar(parent: Element) { return h('div', { class: 'ctrl' }, parent); }
export function group(parent: Element) { return h('div', { class: 'ctrl-group' }, parent); }

export interface SliderOpts {
  label: string; min: number; max: number; step?: number; value: number;
  format?: (v: number) => string; onInput: (v: number) => void;
}
export function slider(parent: Element, o: SliderOpts) {
  const wrap = h('label', { class: 'field' }, parent);
  h('span', { text: o.label }, wrap);
  const input = h('input', { type: 'range', min: o.min, max: o.max, step: o.step ?? 1, value: o.value }, wrap);
  const val = h('span', { class: 'val' }, wrap);
  const f = o.format ?? ((v: number) => String(v));
  const upd = () => { const v = Number(input.value); val.textContent = f(v); o.onInput(v); };
  input.addEventListener('input', upd);
  val.textContent = f(o.value);
  return {
    input,
    get value() { return Number(input.value); },
    set(v: number, fire = true) { input.value = String(v); val.textContent = f(v); if (fire) o.onInput(v); },
  };
}

export function select<T extends string>(parent: Element, label: string, options: { value: T; label: string }[], value: T, onChange: (v: T) => void) {
  const wrap = h('label', { class: 'field' }, parent);
  if (label) h('span', { text: label }, wrap);
  const sel = h('select', {}, wrap);
  for (const o of options) h('option', { value: o.value, text: o.label, selected: o.value === value }, sel);
  sel.addEventListener('change', () => onChange(sel.value as T));
  return sel;
}

/** Segmented toggle: one of N. */
export function segmented<T extends string>(parent: Element, options: { value: T; label: string }[], value: T, onChange: (v: T) => void) {
  const wrap = h('div', { class: 'seg', role: 'group' }, parent);
  const btns = options.map((o) => {
    const b = h('button', { type: 'button', text: o.label, 'aria-pressed': String(o.value === value) }, wrap);
    b.addEventListener('click', () => { btns.forEach((x) => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); onChange(o.value); });
    return b;
  });
  return {
    el: wrap,
    set(v: T) { options.forEach((o, i) => btns[i].setAttribute('aria-pressed', String(o.value === v))); },
  };
}

export function checkbox(parent: Element, label: string, value: boolean, onChange: (v: boolean) => void) {
  const wrap = h('label', { class: 'field' }, parent);
  const input = h('input', { type: 'checkbox', checked: value }, wrap);
  h('span', { text: label }, wrap);
  input.addEventListener('change', () => onChange(input.checked));
  return input;
}

/** Stat tiles. `const st = stats(root, ['TTFT','TPOT']); st.set('TTFT', '120 ms', 'sub')` */
export function stats(parent: Element, keys: string[]) {
  const grid = h('div', { class: 'stats' }, parent);
  const map = new Map<string, { v: HTMLElement; s: HTMLElement; tile: HTMLElement }>();
  for (const k of keys) {
    const tile = h('div', { class: 'stat' }, grid);
    h('div', { class: 'k', text: k }, tile);
    const v = h('div', { class: 'v', text: '–' }, tile);
    const sEl = h('div', { class: 's' }, tile);
    map.set(k, { v, s: sEl, tile });
  }
  return {
    el: grid,
    set(k: string, v: string, sub?: string, color?: string) {
      const t = map.get(k); if (!t) return;
      t.v.textContent = v; if (sub !== undefined) t.s.textContent = sub;
      t.v.style.color = color ?? ''; // reset when no colour, so a warning colour does not stick
    },
  };
}

export function legend(parent: Element, items: [string, string][]) {
  const el = h('div', { class: 'legend' }, parent);
  for (const [label, color] of items) {
    const sp = h('span', {}, el);
    const i = h('i', {}, sp); i.style.background = color;
    sp.appendChild(document.createTextNode(label));
  }
  return el;
}

export function narration(parent: Element) {
  const el = h('div', { class: 'narr', 'aria-live': 'polite' }, parent);
  return (html: string) => { el.innerHTML = html; };
}

/* ---------------------------------------------------------------- player */
export interface PlayerOpts {
  /** advance the simulation by one discrete step; return false when finished */
  step: () => boolean | void;
  /** reset simulation state */
  reset: () => void;
  /** draw current state (called after step/reset) */
  render: () => void;
  /** ms between steps at 1× speed */
  interval?: number;
  /** auto-start when scrolled into view */
  autoplay?: boolean;
  /** loop back to start when finished */
  loop?: boolean;
  speeds?: number[];
}

/**
 * Discrete-step player with Play/Pause, Step, Reset and speed buttons.
 * Pauses automatically when the diagram scrolls out of view.
 */
export function player(bar: Element, root: Element, o: PlayerOpts) {
  const g = group(bar);
  let playing = false; let timer: number | undefined; let visible = true; let speed = 1; let done = false;
  const interval = o.interval ?? 700;
  const playBtn = button(g, 'Play', () => (playing ? pause() : play()), { primary: true, icon: 'play' });
  button(g, 'Step', () => { pause(); tick(); }, { icon: 'step' });
  button(g, 'Reset', () => { reset(); }, { icon: 'reset' });
  const speeds = o.speeds ?? [0.5, 1, 2, 4];
  const sg = segmented(bar, speeds.map((x) => ({ value: String(x), label: `${x}×` })), '1', (v) => { speed = Number(v); if (playing) { stopTimer(); startTimer(); } });
  sg.el.title = 'Speed';

  function setBtn() { playBtn.innerHTML = (playing ? ICON.pause : ICON.play) + `<span>${playing ? 'Pause' : 'Play'}</span>`; }
  function tick() {
    if (done) { if (o.loop) { o.reset(); done = false; } else { pause(); return; } }
    const r = o.step();
    o.render();
    if (r === false) { done = true; if (!o.loop) pause(); }
  }
  function startTimer() { timer = window.setInterval(() => { if (visible) tick(); }, interval / speed); }
  function stopTimer() { if (timer) window.clearInterval(timer); timer = undefined; }
  function play() { if (done) { o.reset(); done = false; } playing = true; setBtn(); stopTimer(); startTimer(); }
  function pause() { playing = false; setBtn(); stopTimer(); }
  function reset() { pause(); done = false; o.reset(); o.render(); }

  const io = new IntersectionObserver((es) => {
    for (const e of es) {
      visible = e.isIntersecting;
      if (visible && o.autoplay && !playing && !done && !reducedMotion() && !started) { started = true; play(); }
    }
  }, { threshold: 0.25 });
  let started = false;
  io.observe(root);

  o.reset(); o.render();
  return { play, pause, reset, tick, get playing() { return playing; } };
}

/**
 * Continuous animation loop (requestAnimationFrame) that pauses off-screen.
 * `frame(dt, t)` gets seconds since last frame and total seconds.
 */
export function rafLoop(root: Element, frame: (dt: number, t: number) => void) {
  let last = 0; let total = 0; let raf = 0; let visible = false; let running = true;
  const loop = (now: number) => {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now; total += dt;
    if (visible && running) frame(dt, total);
    raf = requestAnimationFrame(loop);
  };
  const io = new IntersectionObserver((es) => { for (const e of es) { visible = e.isIntersecting; last = 0; } }, { threshold: 0.05 });
  io.observe(root);
  raf = requestAnimationFrame(loop);
  return {
    pause() { running = false; }, resume() { running = true; last = 0; },
    get running() { return running; },
    stop() { cancelAnimationFrame(raf); io.disconnect(); },
  };
}

/* ---------------------------------------------------------------- svg helpers */
export function rect(parent: Element, x: number, y: number, w: number, hh: number, fill: string, extra: Attrs = {}) {
  return s('rect', { x, y, width: Math.max(0, w), height: Math.max(0, hh), fill, rx: 3, ...extra }, parent);
}
export function text(parent: Element, x: number, y: number, str: string, extra: Attrs = {}) {
  return s('text', { x, y, text: str, 'dominant-baseline': 'middle', ...extra }, parent);
}
export function line(parent: Element, x1: number, y1: number, x2: number, y2: number, stroke: string, extra: Attrs = {}) {
  return s('line', { x1, y1, x2, y2, stroke, 'stroke-width': 1.5, ...extra }, parent);
}
/** Arrow marker defs — call once per svg, then use `marker-end="url(#<id>)"`. */
export function arrowDefs(svg: SVGSVGElement, id: string, color: string) {
  const defs = svg.querySelector('defs') ?? s('defs', {}, svg);
  const m = s('marker', { id, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
  s('path', { d: 'M0,0 L10,5 L0,10 z', fill: color }, m);
  return `url(#${id})`;
}
/** Diagonal hatch pattern (good for "wasted"/"reserved" memory). */
export function hatchDefs(svg: SVGSVGElement, id: string, color: string) {
  const defs = svg.querySelector('defs') ?? s('defs', {}, svg);
  const p = s('pattern', { id, patternUnits: 'userSpaceOnUse', width: 6, height: 6, patternTransform: 'rotate(45)' }, defs);
  s('rect', { width: 6, height: 6, fill: 'transparent' }, p);
  s('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: color, 'stroke-width': 2.2 }, p);
  return `url(#${id})`;
}

let uid = 0;
/** Unique id for defs when a diagram appears multiple times on a page. */
export const uniq = (p = 'v') => `${p}${++uid}`;
