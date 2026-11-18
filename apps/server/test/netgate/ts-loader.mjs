/**
 * Minimal ESM resolve hook so a plain `node` child process can load this repository's TypeScript with
 * `--experimental-transform-types`. Vitest resolves extensionless imports itself; Node does not. This hook
 * only retries a failed relative specifier as `<specifier>.ts` or `<specifier>/index.ts`. It adds no
 * dependency and is test-only.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (error) {
    if ((specifier.startsWith('.') || specifier.startsWith('/')) && context.parentURL) {
      const base = fileURLToPath(new URL(specifier, context.parentURL));
      for (const candidate of [`${base}.ts`, `${base}/index.ts`]) {
        if (existsSync(candidate)) return next(pathToFileURL(candidate).href, context);
      }
    }
    throw error;
  }
}
