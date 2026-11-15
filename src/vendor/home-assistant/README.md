# Home Assistant color helpers (build-time dependency)

`compute-color.ts` is an unmodified upstream source file from
[`home-assistant/frontend`](https://github.com/home-assistant/frontend).
`upstream.json` locks the full revision and SHA-256 of every copied file.
The source is Apache-2.0 licensed; the upstream license and any upstream notices
are copied alongside it. The card's other source remains under its existing license.

Normal builds verify the checked-in source, license and notices **offline**.
esbuild bundles the imported helpers and their palette data, tree-shakes unused
exports, and includes the attribution and complete upstream license in the release
JavaScript. There is no runtime network request or dependency on HA's private chunks.
This dependency is a pinned snapshot, not the installed HA frontend's live version.

Refresh explicitly using a reviewed upstream commit:

```sh
npm run vendor:ha-colors -- --update <full-40-character-commit-sha>
npm test
npm run test:coverage
```

Review all downloaded changes and the lockfile before committing. The updater
rejects mutable branch/tag names, changed licensing and new source imports that
would need additional vendoring. It also includes root `NOTICE` / `NOTICE.md`
files if present. Restart a watch build after updating this dependency so its
license banner is regenerated. Do not hand-edit the copied source.
