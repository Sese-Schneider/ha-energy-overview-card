import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Validate the release package produced by this checkout, not a remote branch.
const root = new URL("../", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("hacs.json", root), "utf8"));
const pkg = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
assert.equal(manifest.name, "Energy Overview Card", "Unexpected HACS card name");
assert.equal(manifest.filename, "energy-overview-card.js", "Keep the public asset filename");
assert.equal(pkg.module, manifest.filename, "Package and HACS filenames must agree");
assert.equal(manifest.render_readme, true, "HACS must render the maintained README");
assert.ok(!manifest.content_in_root, "This repository distributes release assets");
const artifact = new URL(`dist/${manifest.filename}`, root);
assert.ok((await stat(artifact)).isFile(), "Build must produce the release asset");
assert.ok((await readFile(artifact, "utf8")).trim().length > 0, "Release asset must not be empty");
console.log(`HACS package validated: ${fileURLToPath(artifact)}`);
console.log("Remote HACS installation validation runs after release asset upload.");
