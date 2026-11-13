/* The non-chapter tool pages. Shown in the top bar on desktop and inside the nav drawer on small screens. */
export interface Tool { slug: string; label: string; title: string; icon: string }

export const tools: Tool[] = [
  { slug: 'lab', label: 'Lab', title: 'Inference Lab: every knob at once',
    icon: '<path d="M8 2.5h4M8.8 2.5v5L4 15.5A1.4 1.4 0 0 0 5.2 17.5h9.6a1.4 1.4 0 0 0 1.2-2L11.2 7.5v-5"/><path d="M6 13h8"/>' },
  { slug: 'hardware', label: 'Hardware', title: 'Every inference GPU and accelerator',
    icon: '<rect x="5" y="5" width="10" height="10" rx="1.5"/><path d="M8 2.5V5M12 2.5V5M8 15v2.5M12 15v2.5M2.5 8H5M2.5 12H5M15 8h2.5M15 12h2.5"/><rect x="8" y="8" width="4" height="4" rx="0.6"/>' },
  { slug: 'map', label: 'Map', title: 'Concept map: how the chapters connect',
    icon: '<circle cx="4.5" cy="10" r="2"/><circle cx="15.5" cy="4.5" r="2"/><circle cx="15.5" cy="15.5" r="2"/><path d="m6.3 9 7.4-3.6M6.3 11l7.4 3.6"/>' },
  { slug: 'glossary', label: 'Glossary', title: 'Short definitions of every term',
    icon: '<path d="M4 3.5h9.5a2 2 0 0 1 2 2v11H6a2 2 0 0 1-2-2z"/><path d="M4 14.5a2 2 0 0 1 2-2h9.5M7.5 7h5"/>' },
];

export const toolSvg = (t: Tool) =>
  `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${t.icon}</svg>`;
