/* Shared helpers for the hardware page: vendor colour + marker shape, number formats,
   and an adapter that lets the Lab's performance model run on any catalog entry. */
import { s } from '../../lib/viz';
import type { GPU } from '../../data/hardware';
import type { Accel, Group } from '../../data/accelType';

/** Colour follows the vendor group; shape is the second encoding so identity never rests on colour alone. */
export const G_COLOR: Record<Group, string> = {
  nvidia: 'var(--g-nvidia)', amd: 'var(--g-amd)', cloud: 'var(--g-cloud)', other: 'var(--g-other)',
};
export const G_SHAPE: Record<Group, 'circle' | 'square' | 'diamond' | 'triangle'> = {
  nvidia: 'circle', amd: 'square', cloud: 'diamond', other: 'triangle',
};

/** Draw a vendor marker centred on (x, y) with "radius" r. */
export function marker(parent: Element, g: Group, x: number, y: number, r: number, extra: Record<string, string | number> = {}) {
  const fill = G_COLOR[g];
  const base = { fill, stroke: 'var(--surface-solid)', 'stroke-width': 2, ...extra };
  switch (G_SHAPE[g]) {
    case 'circle': return s('circle', { cx: x, cy: y, r, ...base }, parent);
    case 'square': return s('rect', { x: x - r * 0.88, y: y - r * 0.88, width: r * 1.76, height: r * 1.76, rx: 2, ...base }, parent);
    case 'diamond': return s('path', { d: `M${x},${y - r * 1.2}L${x + r * 1.2},${y}L${x},${y + r * 1.2}L${x - r * 1.2},${y}Z`, ...base }, parent);
    default: return s('path', { d: `M${x},${y - r * 1.15}L${x + r * 1.1},${y + r * 0.85}L${x - r * 1.1},${y + r * 0.85}Z`, ...base }, parent);
  }
}

/** Inline SVG swatch (for legends, badges and table cells). */
export function swatch(g: Group, size = 12) {
  const r = size / 2 - 1;
  const c = size / 2;
  const fill = G_COLOR[g];
  const shape = G_SHAPE[g] === 'circle' ? `<circle cx="${c}" cy="${c}" r="${r}" fill="${fill}"/>`
    : G_SHAPE[g] === 'square' ? `<rect x="1" y="1" width="${size - 2}" height="${size - 2}" rx="2" fill="${fill}"/>`
    : G_SHAPE[g] === 'diamond' ? `<path d="M${c},0.5L${size - 0.5},${c}L${c},${size - 0.5}L0.5,${c}Z" fill="${fill}"/>`
    : `<path d="M${c},1L${size - 1},${size - 1.5}L1,${size - 1.5}Z" fill="${fill}"/>`;
  return `<svg class="hw-sw" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">${shape}</svg>`;
}

/** Numbers: compact but honest. */
export const nf = (v: number | null | undefined, d = 0) =>
  v == null ? '—' : v >= 10000 ? Math.round(v).toLocaleString('en-US') : v.toFixed(v < 10 && d === 0 ? 1 : d).replace(/\.0$/, '');
export const memStr = (gb: number) => (gb >= 1000 ? (gb / 1000).toFixed(gb >= 10000 ? 0 : 1) + ' TB' : gb < 1 ? Math.round(gb * 1000) + ' MB' : nf(gb) + ' GB');
export const priceStr = (p: [number, number] | null | undefined) =>
  !p ? '—' : p[0] === p[1] ? `$${p[0].toFixed(2)}` : `$${p[0].toFixed(2)}–${p[1].toFixed(2)}`;
export const host = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };

/** Adapter: catalog entry → the GPU shape used by the Lab's first-order model. */
export function toGPU(a: Accel): GPU {
  const mid = a.price ? (a.price[0] + a.price[1]) / 2 : 0;
  return {
    id: a.id, name: a.name, memGB: a.memGB, bwTBs: a.bwTBs, bf16TF: a.bf16 ?? a.fp8 ?? 0,
    fp8TF: a.fp8 ?? null, fp4TF: a.fp4 ?? null, int8TOPS: a.int8 ?? null,
    linkGBs: a.link?.GBs ?? 32, sms: a.cores ?? 0, l2MB: a.sramMB ?? 0, smemKB: 0, pricePerHr: mid,
  };
}
