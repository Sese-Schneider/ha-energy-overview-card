import { afterEach, expect, it } from 'vitest';
import { EnergyOverviewCard } from '../src/energy-overview-card';
import { EnergyOverviewEntityEditor } from '../src/energy-overview-entity-editor';
import type { EnergyOverviewEntity } from '../src/types';

afterEach(() => document.body.replaceChildren());
const hass = { states: {
  'sensor.solar': { state: '-500', attributes: {} },
  'sensor.large': { state: '1', attributes: { unit_of_measurement: 'kW' } },
  'sensor.small': { state: '20', attributes: {} },
}, locale: { language: 'en' }, localize: () => '' };
const entities: EnergyOverviewEntity[] = [
  { power: 'sensor.small', name: 'Small' },
  { power: 'sensor.solar', name: 'Solar', pinned: true },
  { power: 'sensor.large', name: 'Large' },
  { power: 'sensor.missing', name: 'Missing', pinned: true },
];
async function setup(order_by?: string, rows = entities) {
  const card = new EnergyOverviewCard();
  card.hass = hass;
  card.setConfig({ type: 'custom:energy-overview-card', order_by, entities: rows });
  document.body.append(card);
  await card.updateComplete;
  return card;
}
const names = (card: EnergyOverviewCard) => [...card.shadowRoot!.querySelectorAll('.name')].map((node) => node.textContent);
it('keeps pinned rows in config order and sorts only unpinned rows in normalized units', async () => {
  const card = await setup('power');
  expect(names(card)).toEqual(['Solar', 'Missing', 'Large', 'Small']);
  card.hass = { ...hass, states: { ...hass.states, 'sensor.small': { state: '2000', attributes: {} } } };
  await card.updateComplete;
  expect(names(card)).toEqual(['Solar', 'Missing', 'Small', 'Large']);
  expect(entities[0].name).toBe('Small');
});
it('preserves unpinned config order without sorting and legacy behavior without pins', async () => {
  expect(names(await setup())).toEqual(['Solar', 'Missing', 'Small', 'Large']);
  expect(names(await setup('power', entities.map((entity) => ({ ...entity, pinned: false }))))).toEqual(['Large', 'Small', 'Missing', 'Solar']);
});
it('saves pinning through the visual editor without changing existing settings', async () => {
  if (!customElements.get('ha-form')) customElements.define('ha-form', class extends HTMLElement {});
  const editor = new EnergyOverviewEntityEditor();
  editor.hass = hass;
  editor.config = { power: 'sensor.solar', name: 'Solar', animation: { inverted: true } };
  document.body.append(editor);
  await editor.updateComplete;
  editor.shadowRoot!.querySelectorAll('ha-form')[1].dispatchEvent(new CustomEvent('value-changed', { detail: { value: { pinned: true } } }));
  expect(editor.config).toEqual({ power: 'sensor.solar', name: 'Solar', animation: { inverted: true }, pinned: true });
});
