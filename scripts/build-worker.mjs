import { build } from 'esbuild';

await build({
  entryPoints: ['dist/server/server.js'],
  bundle: true,
  outfile: 'dist/client/_worker.js',
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  external: ['node:async_hooks', 'node:stream', 'node:stream/web'],
});
