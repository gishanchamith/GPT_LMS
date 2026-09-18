// Production bundle: dist/server.js. Type-checking is `npm run typecheck` (esbuild only strips
// types). The workspace package @lp/shared ships TypeScript source, so it is bundled in;
// every npm dependency stays external and is loaded from node_modules at runtime.
import { readFile, rm } from 'node:fs/promises';
import { build } from 'esbuild';

const pkg = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8')) as {
  dependencies: Record<string, string>;
};
const external = Object.keys(pkg.dependencies).filter((name) => !name.startsWith('@lp/'));

await rm(new URL('./dist', import.meta.url), { recursive: true, force: true });
await build({
  entryPoints: ['src/server.ts'],
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  external,
  logLevel: 'info',
});
