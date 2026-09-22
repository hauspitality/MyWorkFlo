// The MyWorkFlo gauge/mountain brand mark, parameterized by color. Mirrors
// the inline SVG used in app/login/page.tsx and the marketing site's
// index.html — kept as a single source of truth for anything that needs to
// rasterize the mark (favicon/PWA icons) rather than render it inline.
export function brandMarkSvg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="37" fill="none" stroke="${color}" stroke-width="7" />
  <line x1="50" y1="10" x2="50" y2="22" stroke="${color}" stroke-width="7" stroke-linecap="round" />
  <line x1="24" y1="22" x2="31" y2="29" stroke="${color}" stroke-width="7" stroke-linecap="round" />
  <line x1="76" y1="22" x2="69" y2="29" stroke="${color}" stroke-width="7" stroke-linecap="round" />
  <line x1="50" y1="50" x2="67" y2="28" stroke="${color}" stroke-width="7" stroke-linecap="round" />
  <circle cx="50" cy="50" r="7" fill="${color}" />
  <polyline points="18,64 35,42 50,60 65,42 82,64" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;
}
