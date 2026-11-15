import { afterEach, expect, it } from 'vitest';
import { EnergyOverviewCard } from '../src/energy-overview-card';
import { EnergyOverviewEntityEditor } from '../src/energy-overview-entity-editor';
import { ENTITY_VISUALS_SCHEMA, THRESHOLD_COLOR_SCHEMA } from '../src/schemas';
import { DEFAULT_LINE_COLOR, lineColor, uiColorValue } from '../src/helper/color';

afterEach(() => document.body.replaceChildren());
const hass = { states: { 'sensor.power': { state: '500', attributes: { unit_of_measurement: 'W' } } }, locale: { language: 'en' }, localize: () => '' };
async function editor() {
  if (!customElements.get('ha-form')) customElements.define('ha-form', class extends HTMLElement {});
  const element = new EnergyOverviewEntityEditor();
  element.hass = hass;
  element.config = { power: 'sensor.power', color: '#488fc2', animation: { inverted: true }, color_thresholds: [{ value: 1000, color: 'var(--primary-color)' }] };
  document.body.append(element); await element.updateComplete;
  return element;
}
function select(form: Element, color?: string) {
  form.dispatchEvent(new CustomEvent('value-changed', { detail: { value: { color } }, bubbles: true, composed: true }));
}
it('uses the Distribution card ui_color selector for default and threshold colors', async () => {
  expect(ENTITY_VISUALS_SCHEMA.find((field) => field.name === 'color')!.selector).toEqual({ ui_color: {} });
  expect(THRESHOLD_COLOR_SCHEMA[0].selector).toEqual({ ui_color: {} });
  const element = await editor();
  const form = element.shadowRoot!.querySelector('ha-form.color-control') as any;
  expect(form.schema).toBe(THRESHOLD_COLOR_SCHEMA);
  expect(form.data.color).toBe('var(--primary-color)');
  expect(element.shadowRoot!.querySelector('input[type=color], input[type=text]')).toBeNull();
});
it.each(['amber', '#123456', 'rgba(12, 34, 56, 0.5)', 'var(--primary-color)'])('stores %s unchanged as a string when selecting a threshold color', async (color) => {
  const element = await editor();
  let leakedEvents = 0;
  element.addEventListener('value-changed', () => leakedEvents++);
  select(element.shadowRoot!.querySelector('ha-form.color-control')!, color);
  await element.updateComplete;
  expect(element.config).toEqual({ power: 'sensor.power', color: '#488fc2', animation: { inverted: true }, color_thresholds: [{ value: 1000, color }] });
  expect(leakedEvents).toBe(0);
  const reopened = await editor();
  reopened.config = element.config; await reopened.updateComplete;
  expect((reopened.shadowRoot!.querySelector('ha-form.color-control') as any).data.color).toBe(color);
});
it('saves and clears the default color without losing other row options', async () => {
  const element = await editor();
  const form = element.shadowRoot!.querySelectorAll('ha-form')[1];
  select(form, 'deep-orange');
  expect(element.config!.color).toBe('deep-orange');
  select(form);
  expect(element.config).not.toHaveProperty('color');
  expect(element.config!.power).toBe('sensor.power');
  expect(element.config!.animation).toEqual({ inverted: true });
  expect(element.config!.color_thresholds![0].color).toBe('var(--primary-color)');
});
it('keeps a cleared threshold inactive and preserves its power bound', async () => {
  const element = await editor();
  select(element.shadowRoot!.querySelector('ha-form.color-control')!);
  expect(element.config!.color_thresholds).toEqual([{ value: 1000, color: '' }]);
  expect(lineColor({ value: 2000, unit: 'W', display: '2000' }, element.config!)).toBe('#488fc2');
});
it('resolves HA palette tokens while preserving custom CSS values', () => {
  for (const name of ['amber', 'deep-orange', 'primary', 'accent', 'blue-grey', 'primary-text']) {
    expect(uiColorValue(name)).toBe(`var(--${name}-color, ${DEFAULT_LINE_COLOR})`);
  }
  expect(uiColorValue('red')).toBe('var(--red-color, red)');
  for (const value of ['#abc', 'rgb(12, 34, 56)', 'rgba(12, 34, 56, 0.5)', 'var(--primary-color)']) expect(uiColorValue(value)).toBe(value);
  for (const value of [undefined, '', 'invalid-color', 'red; display: none']) expect(uiColorValue(value)).toBeUndefined();
});
it('renders default and threshold colors from live theme variables', async () => {
  const card = new EnergyOverviewCard();
  card.hass = hass;
  card.style.setProperty('--amber-color', '#ff9800');
  card.style.setProperty('--deep-purple-color', '#673ab7');
  card.setConfig({ type: 'custom:energy-overview-card', entities: [{ power: 'sensor.power', color: 'amber', color_thresholds: [{ value: 1000, color: 'deep-purple' }] }] });
  document.body.append(card); await card.updateComplete;
  const line = card.shadowRoot!.querySelector('.grid')!;
  const dot = card.shadowRoot!.querySelector('.flow-dot')!;
  expect(getComputedStyle(line).stroke).toBe('rgb(255, 152, 0)');
  card.hass = { ...hass, states: { 'sensor.power': { state: '1500', attributes: { unit_of_measurement: 'W' } } } };
  await card.updateComplete;
  expect(getComputedStyle(line).stroke).toBe('rgb(103, 58, 183)');
  expect(getComputedStyle(dot).stroke).toBe('rgb(103, 58, 183)');
  card.style.setProperty('--deep-purple-color', '#123456');
  expect(getComputedStyle(line).stroke).toBe('rgb(18, 52, 86)');
  expect(card.shadowRoot!.querySelector('.flow-dot')).toBe(dot);
});
