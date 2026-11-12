import { build, context } from 'esbuild';
import { readFile } from 'node:fs/promises';

const license = (await readFile(new URL('../LICENSE', import.meta.url), 'utf8')).trim();
const options = {
  entryPoints: ['src/energy-overview-card.ts'],
  outfile: 'dist/energy-overview-card.js',
  bundle: true,
  banner: { js: `/*!\n${license}\n*/` },
  format: 'esm',
  target: 'es2022',
  minify: true,
  sourcemap: 'external',
  logLevel: 'info',
};
if (process.argv.includes('--watch')) {
  const builder = await context(options);
  await builder.watch();
} else {
  await build(options);
}
