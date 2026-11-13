# Compatibility verification

## Mobile animation follow-up (#10)

The development bundle now uses CSS transform keyframes instead of SVG SMIL.
Automated Chromium and Playwright WebKit checks verify actual dot positions at
320/768/1280 px, forward/reverse flow, zero-power removal and restart, independent
instances, and motion in the production bundle. `npm test` runs both engines;
`npm run test:coverage` retains Chromium-only V8 coverage. Install browsers using
`npx --no-install playwright install --with-deps chromium webkit`.

These are desktop browser engines, not physical iOS/Android tests. The reported
mobile failure has not been reproduced on a device, so its root cause remains
unconfirmed. SMIL is supported by modern browsers; prior claims of Chrome SMIL
deprecation or confirmed power-saving/container-query causes were not established.
Reduced Motion intentionally hides the dot and remains respected.

For device verification, load the new development `dist/energy-overview-card.js`
instead of the v3.0.0 release asset, refresh cached dashboard resources, and check
nonzero positive/negative power, zero/unavailable power, multiple cards, scrolling,
background/foreground return, and Reduce Motion on/off. Do not install both bundles
at once (they register the same custom element). Record browser/OS/app versions.

## Development changes

The compatibility branch replaces obsolete Polymer editor controls, awaits HA form loading through `window.loadCardHelpers()`, handles missing/unavailable measurements, bounds animation inputs (durations from 1 ms to one day to keep SMIL clock syntax valid), removes shared SVG path IDs and unsafe HTML construction, wraps narrow layouts and adds Masonry/Sections sizing. Existing card type, filename, options and common entity/measurement CSS class hooks are retained. No fork release has been published.

## Automated regression checks

Real headless Chromium runs source tests with mocked HA data/form contracts. Tests cover sensor state/precision/locale handling, W/mW/kW/MW/BTU conversion, power factor, signed/inverted/stopped motion, tiny nonzero readings, multiple cards, HTML escaping, empty/add/select/move/delete/reopen editor behavior, translated controls, keyboard navigation, form schemas, bounded cold loading/retry and text/container overflow at widths from 180 to 1280 pixels. Coverage is source-mapped V8 coverage in `coverage/lcov.info`.

The production ES module is separately built and checked for HACS manifest/asset agreement and JavaScript module syntax. Runtime and development dependencies are audited together. A clean audit alone does not establish frontend compatibility.

## Isolated Home Assistant verification — 2026-11-03

The built module was manually installed under `www/` in two independent, temporary, localhost-only Home Assistant containers. Each had synthetic sensors and a fresh browser/test account. No existing Home Assistant deployment or dashboard was used or changed.

| Core        | Frontend package | Result                  |
| ----------- | ---------------- | ----------------------- |
| 2026.10.4   | 20260930.5       | Passed the checks below |
| 2026.11.0b4 | 20261028.3       | Passed the checks below |

The subsequent build-only review fix prepends the full MIT license notice. Removing that comment yields the identical module hash recorded below; no executable code changed.

Browser: Playwright Chromium 156.0.8078.4. Tested module SHA-256: `b5af0b8ae1101a5bc2d5d4d8d072ac6d8a552862941e23ae33d8edf3d758f93a`.

Checks performed on both versions:

- Load the exact built module as a JavaScript dashboard resource; render a configured power/voltage/current row and a missing sensor without page errors.
- Exercise the actual card-helper/button-editor loading contract. `ha-form` was already registered by the fresh frontend, so the truly unregistered/stalled path is covered by the separate regression tests.
- Render real HA entity, icon, number, boolean and select components. Edit number and boolean inputs through the actual UI and verify their configuration events.
- Add/select/reorder/delete entities and reopen saved configuration with the real HA form components.
- Receive synthetic power updates through HA's actual API/websocket flow: zero stops motion, negative power reverses it and positive power restores forward motion.
- Check real Masonry and Sections views at 320, 768 and 1280 px browser widths, including HA's actual light/dark modes. No name/label text overflow or browser page errors was observed; settled screenshots were inspected.

These are desktop Chromium checks with emulated viewport/color-scheme changes. They do not establish physical touch-device behavior or every entity/icon/select picker interaction. The test containers were disposable; credentials and browser captures were kept out of the repository.

## Release verification still needed (issue #7)

- Complete actual entity/icon/select picker-choice interactions and YAML/GUI switching through the normal dashboard editing UI.
- Check physical phone/tablet touch behavior and additional browsers as appropriate.
- Publish only with explicit maintainer authorization, then download and verify the release asset and install through HACS as a custom repository.
- Keep prerelease local/package validation separate from stable remote HACS validation.

SonarCloud currently uses automatic analysis. CI produces LCOV, but automatic analysis does not import it; CI coverage import remains tracked in issue #6.
