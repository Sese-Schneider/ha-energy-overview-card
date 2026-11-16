import { build, context } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { verifyVendoredColors } from './vendor-ha-colors.mjs';

const license = (await readFile(new URL('../LICENSE', import.meta.url), 'utf8')).trim();
const { manifest, contents } = await verifyVendoredColors();
const sourceUrl = `https://github.com/${manifest.repository}/blob/${manifest.revision}/src/common/color/compute-color.ts`;
const thirdPartyLicense = contents.get('LICENSE').trim();
const notices = [...contents].filter(([name]) => name.startsWith('NOTICE')).map(([, text]) => text.trim()).join('\n\n');
const thirdPartyBanner = `Third-party component: Home Assistant Frontend color helpers\nSource: ${sourceUrl}\nUnmodified upstream source; bundled/minified with esbuild.\nLicensed under Apache-2.0:\n\n${thirdPartyLicense}${notices ? `\n\nUpstream notices:\n${notices}` : ''}`;
const options = {
  entryPoints: ['src/energy-overview-card.ts'],
  outfile: 'dist/energy-overview-card.js',
  bundle: true,
  banner: { js: `/*!\n${license}\n*/\n/*!\n${thirdPartyBanner}\n*/` },
  plugins: [{ name: 'verify-ha-color-dependency', setup(builder) {
    let verified;
    builder.onStart(async () => {
      verified = verifyVendoredColors();
      const current = await verified;
      if (JSON.stringify(current.manifest) !== JSON.stringify(manifest)) {
        throw new Error('The pinned color dependency changed. Restart the build to regenerate its license banner.');
      }
    });
    builder.onLoad({ filter: /[/\\]vendor[/\\]home-assistant[/\\]compute-color\.ts$/ }, async () => {
      const current = await verified;
      const root = new URL('../src/vendor/home-assistant/', import.meta.url);
      return {
        // Compile the same source bytes that passed verification, not a later reread.
        contents: current.contents.get('compute-color.ts'),
        loader: 'ts',
        watchFiles: ['upstream.json', ...current.manifest.files.map((file) => file.localPath)].map((path) => fileURLToPath(new URL(path, root))),
      };
    });
  } }],
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
