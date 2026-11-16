import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { updateVendoredColors, verifyVendoredColors } from '../scripts/vendor-ha-colors.mjs';

const revision = 'a'.repeat(40);
const source = 'export function computeCssColor(color: string) { return color; }\nexport function computeCssVariableName(color: string) { return color; }\n';
const license = 'Apache License\nVersion 2.0\n';
async function directory(t) {
  const path = await mkdtemp(join(tmpdir(), 'energy-ha-colors-'));
  t.after(() => rm(path, { recursive: true, force: true }));
  return pathToFileURL(`${path}${sep}`);
}
function fetchFixture(files = {}) {
  const entries = { 'src/common/color/compute-color.ts': source, 'LICENSE.md': license, ...files };
  return async (url) => {
    const prefix = `https://raw.githubusercontent.com/home-assistant/frontend/${revision}/`;
    assert.ok(url.startsWith(prefix));
    const path = url.slice(prefix.length);
    const body = entries[path];
    const bytes = Buffer.from(body ?? '');
    return { ok: body !== undefined, status: body === undefined ? 404 : 200,
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
  };
}
test('verifies the pinned checked-in dependency and complete release attribution offline', async () => {
  const { manifest, contents } = await verifyVendoredColors();
  assert.equal(manifest.repository, 'home-assistant/frontend');
  assert.match(manifest.revision, /^[a-f0-9]{40}$/);
  assert.match(manifest.files.find((file) => file.localPath === 'compute-color.ts').sha256, /^[a-f0-9]{64}$/);
  const bundle = await readFile(new URL('../dist/energy-overview-card.js', import.meta.url), 'utf8');
  const projectLicense = (await readFile(new URL('../LICENSE', import.meta.url), 'utf8')).trim();
  assert.ok(bundle.includes(projectLicense));
  assert.ok(bundle.includes(contents.get('LICENSE').trim()));
  assert.ok(bundle.includes(`https://github.com/${manifest.repository}/blob/${manifest.revision}/src/common/color/compute-color.ts`));
  assert.ok(!bundle.includes('new Option'), 'unused upstream color-validation code should be tree-shaken');
});
test('rejects mutable revisions before fetching or writing', async (t) => {
  const root = await directory(t);
  await assert.rejects(updateVendoredColors('dev', root, () => assert.fail('must not fetch')), /commit SHA/);
  assert.deepEqual(await readdir(root), []);
});
test('copies source, license and optional notices exactly and locks their checksums', async (t) => {
  const root = await directory(t);
  const notice = 'Home Assistant attribution\r\n';
  const manifest = await updateVendoredColors(revision, root, fetchFixture({ NOTICE: notice }));
  assert.equal(manifest.files.length, 3);
  assert.equal(await readFile(new URL('compute-color.ts', root), 'utf8'), source);
  assert.equal(await readFile(new URL('LICENSE', root), 'utf8'), license);
  assert.equal(await readFile(new URL('NOTICE', root), 'utf8'), notice);
  assert.equal((await verifyVendoredColors(root)).contents.get('NOTICE'), notice);
});
for (const file of ['compute-color.ts', 'LICENSE']) {
  test(`rejects checksum drift in ${file}`, async (t) => {
    const root = await directory(t);
    await updateVendoredColors(revision, root, fetchFixture());
    await writeFile(new URL(file, root), 'tampered');
    await assert.rejects(verifyVendoredColors(root), /checksum mismatch/);
  });
}
test('does not overwrite any files when a required download fails', async (t) => {
  const root = await directory(t);
  await writeFile(new URL('sentinel', root), 'keep');
  await assert.rejects(updateVendoredColors(revision, root, async () => ({ ok: false, status: 503 })), /HTTP 503/);
  assert.deepEqual(await readdir(root), ['sentinel']);
});
test('requires review if upstream adds imports or changes its license', async (t) => {
  const root = await directory(t);
  await assert.rejects(updateVendoredColors(revision, root, fetchFixture({ 'src/common/color/compute-color.ts': `import './dependency';\n${source}` })), /self-contained helpers/);
  await assert.rejects(updateVendoredColors(revision, root, fetchFixture({ 'LICENSE.md': 'Different license' })), /license changed/);
  assert.deepEqual(await readdir(root), []);
});
test('rejects missing required files and path traversal in a lockfile', async (t) => {
  const root = await directory(t);
  const manifest = await updateVendoredColors(revision, root, fetchFixture());
  await writeFile(new URL('upstream.json', root), JSON.stringify({ ...manifest, files: [] }));
  await assert.rejects(verifyVendoredColors(root), /missing its source or license/);
  manifest.files[0].localPath = '../escape.ts';
  await writeFile(new URL('upstream.json', root), JSON.stringify(manifest));
  await assert.rejects(verifyVendoredColors(root), /Invalid vendored file path/);
});
