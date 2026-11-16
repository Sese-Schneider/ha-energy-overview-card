import { afterEach, expect, it } from 'vitest';
import { uiColorValue, lineColor, DEFAULT_LINE_COLOR } from '../src/helper/color';
import { EnergyOverviewCard } from '../src/energy-overview-card';
import { EnergyOverviewEntityEditor } from '../src/energy-overview-entity-editor';

afterEach(() => document.body.replaceChildren());
const power = (value: number | undefined, unit = 'W') => ({ value, unit, display: String(value) });
const config = { color: 'blue', color_thresholds: [{ value: 1000, color: 'red' }, { value: 100, color: 'orange' }] };
it('uses absolute normalized watts and the greatest matching lower bound', () => {
  expect(lineColor(power(99), config)).toBe(uiColorValue('blue'));
  expect(lineColor(power(100), config)).toBe(uiColorValue('orange'));
  expect(lineColor(power(-1, 'kW'), config)).toBe(uiColorValue('red'));
  expect(lineColor(power(100000, 'mW'), config)).toBe(uiColorValue('orange'));
  expect(lineColor(power(0), {})).toBe(DEFAULT_LINE_COLOR);
  expect(lineColor(power(undefined), config)).toBe(uiColorValue('blue'));
});
it('ignores invalid thresholds and gives the last equal threshold precedence', () => {
  const invalid = [null, { value: NaN, color: 'red' }, { value: -1, color: 'red' }, { value: Infinity, color: 'red' },
    { value: 0, color: '' }, { value: 0, color: 'invalid-color' }, { value: 0, color: 'red; display: none' }];
  expect(lineColor(power(10), { color: 'blue', color_thresholds: invalid as any })).toBe(uiColorValue('blue'));
  expect(lineColor(power(10), { color_thresholds: 'bad' as any })).toBe(DEFAULT_LINE_COLOR);
  expect(lineColor(power(10), { color_thresholds: [{ value: 0, color: 'red' }, { value: 0, color: 'var(--primary-color)' }] })).toBe('var(--primary-color)');
});
const hass = { states: { 'sensor.power': { state: '500', attributes: { unit_of_measurement: 'W' } } }, locale: { language: 'en' }, localize: () => '' };
it('updates both line and dot color while retaining the existing motion node', async () => {
  const card = new EnergyOverviewCard();
  card.hass = hass;
  card.setConfig({ type: 'custom:energy-overview-card', entities: [{ power: 'sensor.power', ...config }] });
  document.body.append(card);
  await card.updateComplete;
  const line = card.shadowRoot!.querySelector('.grid')!;
  const dot = card.shadowRoot!.querySelector('.flow-dot')!;
  expect(getComputedStyle(line).stroke).toBe('rgb(255, 165, 0)');
  card.hass = { ...hass, states: { 'sensor.power': { state: '-2000', attributes: { unit_of_measurement: 'W' } } } };
  await card.updateComplete;
  expect(card.shadowRoot!.querySelector('.flow-dot')).toBe(dot);
  expect(getComputedStyle(line).stroke).toBe('rgb(255, 0, 0)');
  expect(getComputedStyle(dot).stroke).toBe('rgb(255, 0, 0)');
});
it('adds, edits, removes and reopens thresholds without losing row options', async () => {
  if (!customElements.get('ha-form')) customElements.define('ha-form', class extends HTMLElement {});
  const editor = new EnergyOverviewEntityEditor();
  editor.hass = hass;
  editor.config = { power: 'sensor.power', color: 'blue', animation: { inverted: true } };
  document.body.append(editor);
  await editor.updateComplete;
  editor.shadowRoot!.querySelector<HTMLButtonElement>('#add-threshold')!.click();
  await editor.updateComplete;
  const value = editor.shadowRoot!.querySelector<HTMLInputElement>('input[type=number]')!;
  value.value = '100'; value.dispatchEvent(new Event('change'));
  const color = editor.shadowRoot!.querySelector('ha-form.color-control')!;
  color.dispatchEvent(new CustomEvent('value-changed', { detail: { value: { color: 'red' } } }));
  await editor.updateComplete;
  expect(editor.config).toEqual({ power: 'sensor.power', color: 'blue', animation: { inverted: true }, color_thresholds: [{ value: 100, color: 'red' }] });
  const reopened = new EnergyOverviewEntityEditor();
  reopened.hass = hass; reopened.config = editor.config;
  document.body.append(reopened); await reopened.updateComplete;
  expect(reopened.shadowRoot!.querySelector<HTMLInputElement>('input[type=number]')!.value).toBe('100');
  reopened.shadowRoot!.querySelector<HTMLButtonElement>('[aria-label="Remove threshold 1"]')!.click();
  expect(reopened.config!.color_thresholds).toEqual([]);
});
it('preserves CSS variables on opening and rerendering without emitting configuration changes', async () => {
  if (!customElements.get('ha-form')) customElements.define('ha-form', class extends HTMLElement {});
  const editor = new EnergyOverviewEntityEditor();
  editor.hass = hass;
  editor.config = { power: 'sensor.power', color_thresholds: [{ value: 0, color: 'var(--primary-color)' }] };
  let changes = 0;
  editor.addEventListener('config-changed', () => changes++);
  document.body.append(editor); await editor.updateComplete;
  editor.requestUpdate(); await editor.updateComplete;
  expect((editor.shadowRoot!.querySelector('ha-form.color-control') as any).data.color).toBe('var(--primary-color)');
  expect(editor.config.color_thresholds![0].color).toBe('var(--primary-color)');
  expect(changes).toBe(0);
});
it.each([180, 280])('keeps threshold color controls within a %s px editor', async (width) => {
  if (!customElements.get('ha-form')) customElements.define('ha-form', class extends HTMLElement {});
  const editor = new EnergyOverviewEntityEditor();
  editor.hass = hass;
  editor.config = { power: 'sensor.power', color_thresholds: [{ value: 100, color: 'red' }] };
  editor.style.display = 'block'; editor.style.width = `${width}px`;
  document.body.append(editor); await editor.updateComplete;
  const bounds = editor.getBoundingClientRect();
  for (const control of editor.shadowRoot!.querySelectorAll('.threshold input, .threshold ha-form, .threshold button')) {
    const box = control.getBoundingClientRect();
    expect(box.left).toBeGreaterThanOrEqual(bounds.left - 1);
    expect(box.right).toBeLessThanOrEqual(bounds.right + 1);
    if (control.tagName !== 'HA-FORM') expect(box.height).toBeGreaterThanOrEqual(44);
  }
});
