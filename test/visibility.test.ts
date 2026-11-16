import { afterEach, expect, it } from 'vitest';
import { rowVisible } from '../src/helper/visibility';
import { EnergyOverviewCard } from '../src/energy-overview-card';
import { EnergyOverviewEntityEditor } from '../src/energy-overview-entity-editor';

afterEach(() => document.body.replaceChildren());
const power = (value: number | undefined, unit = 'W') => ({ value, unit, display: String(value) });
it('uses normalized absolute power by default, including exports and equality', () => {
  expect(rowVisible(power(0), { hide_below: 1 })).toBe(false);
  expect(rowVisible(power(0.01, 'kW'), { hide_below: 10 })).toBe(true);
  expect(rowVisible(power(-20), { hide_below: 10 })).toBe(true);
  expect(rowVisible(power(-20), { hide_below: 10, hide_below_signed: true })).toBe(false);
  expect(rowVisible(power(500, 'mW'), { hide_below: 1 })).toBe(false);
});
it('keeps unavailable readings and invalid or omitted thresholds visible', () => {
  for (const hide_below of [undefined, -1, NaN, Infinity, '10' as any]) expect(rowVisible(power(0), { hide_below })).toBe(true);
  for (const value of [undefined, NaN, Infinity]) expect(rowVisible(power(value), { hide_below: 10 })).toBe(true);
  expect(rowVisible(power(0), { hide_below: 0 })).toBe(true);
});
it.each([{ value: 1.001, signed: false }, { value: -1.001, signed: false }, { value: 1.001, signed: true }])('retains converted boundary equality for $value kW with signed mode $signed', ({ value, signed }) => {
  expect(rowVisible(power(value, 'kW'), { hide_below: 1001, hide_below_signed: signed })).toBe(true);
});
it('keeps genuinely lower, tiny and signed-negative readings below the threshold', () => {
  expect(rowVisible(power(1.00099, 'kW'), { hide_below: 1001 })).toBe(false);
  expect(rowVisible(power(-1.001, 'kW'), { hide_below: 1001, hide_below_signed: true })).toBe(false);
  expect(rowVisible(power(5e-13), { hide_below: 1e-12 })).toBe(false);
  expect(rowVisible(power(0), { hide_below: Number.MIN_VALUE })).toBe(false);
  expect(rowVisible(power(-Number.MIN_VALUE), { hide_below: 0, hide_below_signed: true })).toBe(false);
});
const hass = { states: { 'sensor.power': { state: '0', attributes: { unit_of_measurement: 'W' } } }, locale: { language: 'en' }, localize: () => '' };
it('filters before sorting, retains original row keys and restores rows on state changes', async () => {
  const card = new EnergyOverviewCard();
  card.hass = hass;
  const entities = [{ power: 'sensor.power', name: 'Power', hide_below: 10 }, { power: 'sensor.missing', name: 'Missing', hide_below: 10 }];
  card.setConfig({ type: 'custom:energy-overview-card', order_by: 'power', entities });
  document.body.append(card);
  await card.updateComplete;
  expect(card.shadowRoot!.querySelector('.entity-0')).toBeNull();
  expect(card.shadowRoot!.querySelector('.entity-1 .name')!.textContent).toBe('Missing');
  card.hass = { ...hass, states: { 'sensor.power': { state: '-20', attributes: { unit_of_measurement: 'W' } } } };
  await card.updateComplete;
  expect(card.shadowRoot!.querySelector('.entity-0 .name')!.textContent).toBe('Power');
  expect(entities).toHaveLength(2);
});
it('distinguishes all-hidden rows from an unconfigured card', async () => {
  const card = new EnergyOverviewCard();
  card.hass = hass;
  card.setConfig({ type: 'custom:energy-overview-card', entities: [{ power: 'sensor.power', hide_below: 1 }] });
  document.body.append(card);
  await card.updateComplete;
  expect(card.shadowRoot!.textContent).toContain('No entities above');
});
it('renders a row at a converted equality boundary and hides it after a real decrease', async () => {
  const card = new EnergyOverviewCard();
  card.hass = { ...hass, states: { 'sensor.power': { state: '1.001', attributes: { unit_of_measurement: 'kW' } } } };
  card.setConfig({ type: 'custom:energy-overview-card', entities: [{ power: 'sensor.power', hide_below: 1001 }] });
  document.body.append(card); await card.updateComplete;
  expect(card.shadowRoot!.querySelector('.entity-0')).not.toBeNull();
  card.hass = { ...hass, states: { 'sensor.power': { state: '1.00099', attributes: { unit_of_measurement: 'kW' } } } };
  await card.updateComplete;
  expect(card.shadowRoot!.querySelector('.entity-0')).toBeNull();
});
it('preserves visibility options through visual edits', async () => {
  if (!customElements.get('ha-form')) customElements.define('ha-form', class extends HTMLElement {});
  const editor = new EnergyOverviewEntityEditor();
  editor.hass = hass;
  editor.config = { power: 'sensor.power', color: 'red' };
  document.body.append(editor);
  await editor.updateComplete;
  editor.shadowRoot!.querySelectorAll('ha-form')[1].dispatchEvent(new CustomEvent('value-changed', { detail: { value: { hide_below: 10, hide_below_signed: true } } }));
  expect(editor.config).toEqual({ power: 'sensor.power', color: 'red', hide_below: 10, hide_below_signed: true });
});
