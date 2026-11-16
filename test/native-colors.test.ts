import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { EnergyOverviewCard } from '../src/energy-overview-card';
import type { CardHelpers } from '../src/ha-types';
import { COLOR_HELPERS_TIMEOUT_MS, loadColorHelpers, uiColorValue, VENDORED_COLOR_HELPERS } from '../src/helper/color';

const originalLoader = window.loadCardHelpers;
const hass = { states: { 'sensor.power': { state: '500', attributes: { unit_of_measurement: 'W' } } }, locale: { language: 'en' }, localize: () => '' };
beforeEach(() => { delete window.loadCardHelpers; });
afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
  if (originalLoader) window.loadCardHelpers = originalLoader;
  else delete window.loadCardHelpers;
});
function native(prefix = 'native'): CardHelpers {
  const known = new Set(['future-color', 'future-threshold']);
  return {
    createCardElement: () => document.createElement('div'),
    computeCssColor: vi.fn((color) => known.has(color) ? `var(--${prefix}-${color})` : color),
    computeCssVariableName: vi.fn((color) => known.has(color) ? `--${prefix}-${color}` : color),
  };
}
function deferred() {
  let resolve: (value: CardHelpers) => void = () => {};
  const promise = new Promise<CardHelpers>((finish) => { resolve = finish; });
  return { promise, resolve };
}
async function card() {
  const element = new EnergyOverviewCard();
  element.hass = hass;
  element.style.setProperty('--native-future-color', '#123456');
  element.style.setProperty('--native-future-threshold', '#abcdef');
  element.setConfig({ type: 'custom:energy-overview-card', entities: [{ power: 'sensor.power', color: 'future-color', color_thresholds: [{ value: 1000, color: 'future-threshold' }] }] });
  document.body.append(element); await element.updateComplete;
  return element;
}
const stroke = (element: EnergyOverviewCard) => getComputedStyle(element.shadowRoot!.querySelector('.grid')!).stroke;

it('uses local helpers immediately when the API is absent', async () => {
  expect(await loadColorHelpers()).toBe(VENDORED_COLOR_HELPERS);
  expect(await loadColorHelpers('invalid' as any)).toBe(VENDORED_COLOR_HELPERS);
  expect(uiColorValue('amber')).toContain('--amber-color');
  const element = await card();
  expect(element.shadowRoot!.querySelector('.entity')!.getAttribute('style')).toContain('--energy-grid-consumption-color');
});
it('caches a complete native pair and recognizes colors unknown to the vendored snapshot', async () => {
  const helpers = native();
  window.loadCardHelpers = vi.fn(async () => helpers);
  const [first, second] = await Promise.all([loadColorHelpers(), loadColorHelpers()]);
  expect(first).toBe(second);
  expect(window.loadCardHelpers).toHaveBeenCalledTimes(1);
  expect(uiColorValue('future-color')).toBeUndefined();
  expect(uiColorValue('future-color', first)).toContain('--native-future-color');
  expect(helpers.computeCssColor).toHaveBeenCalledWith('future-color');
  expect(helpers.computeCssVariableName).toHaveBeenCalledWith('future-color');
});
it.each(['neither', 'color-only', 'variable-only', 'not-functions'])('does not mix providers when exports are %s', async (kind) => {
  const helpers = native();
  if (kind === 'neither' || kind === 'variable-only') delete helpers.computeCssColor;
  if (kind === 'neither' || kind === 'color-only') delete helpers.computeCssVariableName;
  if (kind === 'not-functions') helpers.computeCssColor = 'invalid' as any;
  window.loadCardHelpers = vi.fn(async () => helpers);
  expect(await loadColorHelpers()).toBe(VENDORED_COLOR_HELPERS);
  expect(await loadColorHelpers()).toBe(VENDORED_COLOR_HELPERS);
  expect(window.loadCardHelpers).toHaveBeenCalledTimes(1);
});
it.each(['throws', 'rejects'])('falls back when helper loading %s and allows a later retry', async (kind) => {
  const loader = vi.fn<NonNullable<Window['loadCardHelpers']>>(() => {
    if (kind === 'throws') throw new Error('Synchronous failure');
    return Promise.reject(new Error('Network failure'));
  });
  window.loadCardHelpers = loader;
  expect(await loadColorHelpers()).toBe(VENDORED_COLOR_HELPERS);
  loader.mockResolvedValue(native());
  expect(await loadColorHelpers()).not.toBe(VENDORED_COLOR_HELPERS);
  expect(loader).toHaveBeenCalledTimes(2);
});
it('bounds stalled loading, ignores its late result, and allows retry', async () => {
  vi.useFakeTimers();
  const pending = deferred();
  window.loadCardHelpers = vi.fn(() => pending.promise);
  const first = loadColorHelpers();
  await vi.advanceTimersByTimeAsync(COLOR_HELPERS_TIMEOUT_MS);
  expect(await first).toBe(VENDORED_COLOR_HELPERS);
  pending.resolve(native());
  expect(await first).toBe(VENDORED_COLOR_HELPERS);
  expect(await loadColorHelpers()).not.toBe(VENDORED_COLOR_HELPERS);
  expect(window.loadCardHelpers).toHaveBeenCalledTimes(2);
});
it('renders before loading finishes and refreshes multiple cards without replacing motion nodes', async () => {
  const pending = deferred();
  window.loadCardHelpers = vi.fn(() => pending.promise);
  const first = await card();
  const second = await card();
  const dot = first.shadowRoot!.querySelector('.flow-dot');
  expect(first.shadowRoot!.querySelector('.entity')!.getAttribute('style')).not.toContain('--native-future-color');
  pending.resolve(native());
  await expect.poll(() => stroke(first)).toBe('rgb(18, 52, 86)');
  await expect.poll(() => stroke(second)).toBe('rgb(18, 52, 86)');
  first.hass = { ...hass, states: { 'sensor.power': { state: '1500', attributes: { unit_of_measurement: 'W' } } } };
  await first.updateComplete;
  expect(stroke(first)).toBe('rgb(171, 205, 239)');
  expect(first.shadowRoot!.querySelector('.flow-dot')).toBe(dot);
  expect(window.loadCardHelpers).toHaveBeenCalledTimes(1);
});
it('detects an API that appears after the first render', async () => {
  const element = await card();
  window.loadCardHelpers = vi.fn(async () => native());
  element.requestUpdate();
  await expect.poll(() => stroke(element)).toBe('rgb(18, 52, 86)');
});
it('rejects stale results after the loader changes', async () => {
  const old = deferred();
  const oldLoader = vi.fn(() => old.promise);
  window.loadCardHelpers = oldLoader;
  const element = await card();
  window.loadCardHelpers = vi.fn(async () => native());
  element.requestUpdate();
  await expect.poll(() => stroke(element)).toBe('rgb(18, 52, 86)');
  const stale = native('stale');
  old.resolve(stale);
  await loadColorHelpers(oldLoader);
  await element.updateComplete;
  expect(stale.computeCssColor).not.toHaveBeenCalled();
  expect(stroke(element)).toBe('rgb(18, 52, 86)');
});
it('retries failed loading on reconnection and falls back again when the API disappears', async () => {
  const loader = vi.fn<NonNullable<Window['loadCardHelpers']>>(async () => { throw new Error('Transient failure'); });
  window.loadCardHelpers = loader;
  const element = await card();
  // Ensure loading has failed before reconnecting with a recovered loader.
  expect(await loadColorHelpers(loader)).toBe(VENDORED_COLOR_HELPERS);
  loader.mockResolvedValue(native());
  element.remove(); document.body.append(element);
  await expect.poll(() => stroke(element)).toBe('rgb(18, 52, 86)');
  delete window.loadCardHelpers;
  element.remove(); document.body.append(element);
  await element.updateComplete;
  expect(element.shadowRoot!.querySelector('.entity')!.getAttribute('style')).not.toContain('--native-future-color');
});
