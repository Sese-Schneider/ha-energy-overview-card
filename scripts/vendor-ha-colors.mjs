import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const repository = 'home-assistant/frontend';
const vendorDirectory = new URL('../src/vendor/home-assistant/', import.meta.url);
const specifications = [
  { upstreamPath: 'src/common/color/compute-color.ts', localPath: 'compute-color.ts' },
  { upstreamPath: 'LICENSE.md', localPath: 'LICENSE' },
  { upstreamPath: 'NOTICE', localPath: 'NOTICE', optional: true },
  { upstreamPath: 'NOTICE.md', localPath: 'NOTICE.md', optional: true },
];
const checksum = (bytes) => createHash('sha256').update(bytes).digest('hex');

function validateManifest(manifest) {
  if (manifest.version !== 1 || manifest.repository !== repository || !/^[a-f0-9]{40}$/.test(manifest.revision) || !Array.isArray(manifest.files)) {
    throw new Error('Invalid Home Assistant color dependency manifest.');
  }
  const seen = new Set();
  for (const file of manifest.files) {
    const specification = specifications.find((entry) => entry.upstreamPath === file.upstreamPath && entry.localPath === file.localPath);
    if (!specification || seen.has(file.localPath) || !/^[a-f0-9]{64}$/.test(file.sha256)) {
      throw new Error('Invalid vendored file path or checksum.');
    }
    seen.add(file.localPath);
  }
  if (specifications.some((entry) => !entry.optional && !seen.has(entry.localPath))) {
    throw new Error('The color dependency manifest is missing its source or license.');
  }
}

/** Offline verification: a normal build never fetches upstream code. */
export async function verifyVendoredColors(directory = vendorDirectory) {
  const manifest = JSON.parse(await readFile(new URL('upstream.json', directory), 'utf8'));
  validateManifest(manifest);
  const contents = new Map();
  for (const file of manifest.files) {
    const bytes = await readFile(new URL(file.localPath, directory));
    if (checksum(bytes) !== file.sha256) {
      throw new Error(`Vendored checksum mismatch: ${file.localPath}. Restore the locked copy or explicitly update the dependency.`);
    }
    contents.set(file.localPath, bytes.toString('utf8'));
  }
  return { manifest, contents };
}

/** Explicit refresh from an immutable revision; verify all downloads before writing. */
export async function updateVendoredColors(revision, directory = vendorDirectory, fetchFile = globalThis.fetch) {
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error('Use a full 40-character upstream commit SHA, not a branch or tag.');
  const downloads = [];
  for (const specification of specifications) {
    const url = `https://raw.githubusercontent.com/${repository}/${revision}/${specification.upstreamPath}`;
    const response = await fetchFile(url);
    if (response.status === 404 && specification.optional) continue;
    if (!response.ok) throw new Error(`Unable to fetch ${specification.upstreamPath}: HTTP ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > 1_000_000) throw new Error(`Unexpectedly large upstream file: ${specification.upstreamPath}`);
    downloads.push({ ...specification, bytes });
  }
  const source = Buffer.from(downloads.find((file) => file.localPath === 'compute-color.ts').bytes).toString('utf8');
  if (!/export function computeCssColor\(/.test(source) || !/export function computeCssVariableName\(/.test(source) || /^\s*import\b/m.test(source)) {
    throw new Error('The upstream module no longer has the expected self-contained helpers; review its dependencies before updating.');
  }
  const license = Buffer.from(downloads.find((file) => file.localPath === 'LICENSE').bytes).toString('utf8');
  if (!license.includes('Apache License') || !/Version 2\.0/i.test(license)) {
    throw new Error('The upstream license changed; review licensing before updating.');
  }
  const manifest = {
    version: 1,
    repository,
    revision,
    files: downloads.map(({ upstreamPath, localPath, bytes }) => ({ upstreamPath, localPath, sha256: checksum(bytes) })),
  };
  validateManifest(manifest);
  await mkdir(directory, { recursive: true });
  for (const file of downloads) await writeFile(new URL(file.localPath, directory), file.bytes);
  await writeFile(new URL('upstream.json', directory), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const args = process.argv.slice(2);
  if (args.length === 2 && args[0] === '--update') {
    const manifest = await updateVendoredColors(args[1]);
    console.info(`Updated Home Assistant color helpers to ${manifest.revision}. Review the source, license, notices and tests before committing.`);
  } else if (args.length === 0 || (args.length === 1 && args[0] === '--verify')) {
    const { manifest } = await verifyVendoredColors();
    console.info(`Verified ${manifest.files.length} vendored files at ${manifest.revision}.`);
  } else {
    throw new Error('Usage: node scripts/vendor-ha-colors.mjs [--verify | --update <full-commit-sha>]');
  }
}
