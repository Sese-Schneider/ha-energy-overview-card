import { afterEach, expect, it } from 'vitest';
import { entityDataSchema, ENTITY_DATA_SCHEMA } from '../src/schemas';
import { EnergyOverviewEntityEditor } from '../src/energy-overview-entity-editor';
import type { HomeAssistant } from '../src/ha-types';

const hass: HomeAssistant = {
  locale: { language: 'en' }, localize: () => '',
  states: {
    'sensor.power': { state: 'unavailable', attributes: { device_class: 'power' } },
    'sensor.kw': { state: '2', attributes: { unit_of_measurement: 'kW' } },
    'sensor.voltage': { state: '230', attributes: { device_class: 'voltage', unit_of_measurement: 'V' } },
    'sensor.current': { state: '2', attributes: { device_class: 'current' } },
    'sensor.frequency': { state: '50', attributes: { device_class: 'frequency' } },
    'input_number.frequency': { state: '50', attributes: { unit_of_measurement: 'Hz' } },
    'sensor.pf': { state: '0.9', attributes: { device_class: 'power_factor' } },
    'sensor.temperature': { state: '25', attributes: { device_class: 'temperature', unit_of_measurement: 'W' } },
    'sensor.humidity': { state: '50', attributes: { device_class: 'humidity', unit_of_measurement: '%' } },
    'sensor.unknown': { state: '1', attributes: {} },
    'light.power': { state: 'on', attributes: { device_class: 'power' } },
  },
};
afterEach(() => document.body.replaceChildren());
it('matches device classes regardless of units, without including unrelated or unclassified entities', () => {
  const schema = entityDataSchema(hass, { power: '' });
  const fields = [schema[0], ...(schema[1] as typeof ENTITY_DATA_SCHEMA[1]).schema!];
  const ids = (name: string) => (fields.find((field) => field.name === name) as any).selector.entity.include_entities;
  expect(ids('power')).toEqual(['sensor.power']);
  expect(ids('voltage')).toEqual(['sensor.voltage']);
  expect(ids('current')).toEqual(['sensor.current']);
  expect(ids('frequency')).toEqual(['sensor.frequency']);
  expect(ids('power_factor')).toEqual(['sensor.pf']);
});
it.each([
  ['power', 'kW'], ['voltage', 'V'], ['current', 'A'], ['frequency', 'Hz'], ['power_factor', '%'],
])('does not infer the %s device class from a %s unit', (field, unit) => {
  const schema = entityDataSchema({ ...hass, states: {
    'sensor.units_only': { state: '1', attributes: { unit_of_measurement: unit } },
  } }, { power: '' });
  const fields = [schema[0], ...(schema[1] as typeof ENTITY_DATA_SCHEMA[1]).schema!];
  expect((fields.find((entry) => entry.name === field) as any).selector.entity.include_entities).toEqual([]);
});
it('preserves missing or unconventional selections and exposes an unfiltered fallback', () => {
  expect((entityDataSchema(hass, { power: 'sensor.deleted' })[0] as any).selector.entity.include_entities).toContain('sensor.deleted');
  expect((entityDataSchema(hass, { power: 'sensor.kw' })[0] as any).selector.entity.include_entities).toContain('sensor.kw');
  expect(entityDataSchema(hass, { power: '' }, true)).toBe(ENTITY_DATA_SCHEMA);
});
it('toggles filtering without publishing or modifying configuration', async () => {
  if (!customElements.get('ha-form')) customElements.define('ha-form', class extends HTMLElement {});
  const element = new EnergyOverviewEntityEditor();
  element.hass = hass;
  element.config = { power: 'sensor.unknown' };
  let changes = 0;
  element.addEventListener('config-changed', () => changes++);
  document.body.append(element);
  await element.updateComplete;
  element.shadowRoot!.querySelector<HTMLInputElement>('input')!.click();
  await element.updateComplete;
  expect((element.shadowRoot!.querySelector('ha-form') as any).schema).toBe(ENTITY_DATA_SCHEMA);
  expect(element.config).toEqual({ power: 'sensor.unknown' });
  expect(changes).toBe(0);
});
