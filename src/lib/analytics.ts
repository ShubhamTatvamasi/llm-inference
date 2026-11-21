/* Optional, cookie-less GoatCounter analytics.
   The count.js script is rendered only when PUBLIC_GOATCOUNTER_CODE is set at build
   time; every call here is a no-op when that script is absent, so local builds and
   forks stay silent. Custom events use GoatCounter's `count({event:true})` API. */
type GoatCounter = { count: (v: { path: string; title?: string; event?: boolean }) => void };
declare global { interface Window { goatcounter?: GoatCounter } }

export function track(path: string, title?: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!document.querySelector('script[data-goatcounter]')) return;
  let tries = 0;
  const send = () => {
    if (window.goatcounter) { window.goatcounter.count({ path, title, event: true }); return; }
    if (tries++ < 20) setTimeout(send, 250); // count.js is async; retry for ~5 s
  };
  send();
}
