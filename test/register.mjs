/* Node test-runner bootstrap for this repo.
   The source modules use extensionless relative imports (as resolved by Astro/Rollup/bundler-mode
   TypeScript), but Node's built-in type stripping resolves only explicit `.ts` specifiers. This hook
   appends `.ts` to relative specifiers that have no extension, so the tests can import the real
   modules. Run with:  node --import ./test/register.mjs --test test/ */
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !/\.[a-z0-9]+$/i.test(specifier)) {
      try { return nextResolve(`${specifier}.ts`, context); } catch { /* fall through */ }
    }
    return nextResolve(specifier, context);
  },
});
