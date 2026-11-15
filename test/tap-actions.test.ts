import { afterEach, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { EnergyOverviewCard } from '../src/energy-overview-card';
import { EnergyOverviewEntityEditor } from '../src/energy-overview-entity-editor';
import type { EnergyOverviewEntity } from '../src/types';

afterEach(() => document.body.replaceChildren());
const hass = { states: { 'sensor.power': { state: '500', attributes: {} }, 'sensor.other': { state: '900', attributes: {} }, 'sensor.voltage': { state: '230', attributes: { unit_of_measurement: 'V' } } }, locale: { language: 'en' }, localize: () => '' };
async function setup(entities: EnergyOverviewEntity[]) {
  const card = new EnergyOverviewCard();
  card.hass = hass;
  card.setConfig({ type: 'custom:energy-overview-card', order_by: 'power', entities });
  document.body.append(card);
  await card.updateComplete;
  const events: CustomEvent[] = [];
  document.body.addEventListener('hass-action', (event) => events.push(event as CustomEvent), { signal: controller.signal });
  return { card, events };
}
let controller = new AbortController();
afterEach(() => { controller.abort(); controller = new AbortController(); });
it('dispatches a composed bubbling HA tap action for the correct sorted row', async () => {
  const { card, events } = await setup([
    { power: 'sensor.power', tap_action: { action: 'more-info' } },
    { power: 'sensor.other', tap_action: { action: 'more-info', entity: 'sensor.power' } },
  ]);
  card.shadowRoot!.querySelector<HTMLElement>('.entity')!.click();
  expect(events).toHaveLength(1);
  expect(events[0].composed).toBe(true);
  expect(events[0].detail).toEqual({ action: 'tap', config: { entity: 'sensor.power', tap_action: { action: 'more-info', entity: 'sensor.power' } } });
});
it('supports Enter and Space, and emits navigation through HA', async () => {
  const { card, events } = await setup([{ power: 'sensor.power', voltage: 'sensor.voltage', name: 'Home', tap_action: { action: 'navigate', navigation_path: '/lovelace/home' } }]);
  const row = card.shadowRoot!.querySelector<HTMLElement>('.entity')!;
  expect(row.getAttribute('role')).toBe('button');
  await expect.element(row).toHaveAccessibleName(/Home.*230.*V.*500.*W/);
  row.focus();
  await userEvent.keyboard('{Enter}');
  await userEvent.keyboard(' ');
  expect(events).toHaveLength(2);
  expect(events[0].detail.config.tap_action.navigation_path).toBe('/lovelace/home');
  const repeated = new KeyboardEvent('keydown', { key: ' ', repeat: true, cancelable: true });
  row.dispatchEvent(repeated);
  expect(repeated.defaultPrevented).toBe(true);
  expect(events).toHaveLength(2);
});
it('leaves default, disabled, missing-entity and incomplete actions inert', async () => {
  const { card, events } = await setup([
    { power: 'sensor.power' }, { power: 'sensor.power', tap_action: { action: 'none' } },
    { power: 'sensor.missing', tap_action: { action: 'more-info' } },
    { power: 'sensor.power', tap_action: { action: 'navigate', navigation_path: '' } },
  ]);
  for (const row of card.shadowRoot!.querySelectorAll<HTMLElement>('.entity')) {
    expect(row.hasAttribute('tabindex')).toBe(false);
    row.click();
  }
  expect(events).toHaveLength(0);
});
it('saves tap action edits without losing other row settings', async () => {
  if (!customElements.get('ha-form')) customElements.define('ha-form', class extends HTMLElement {});
  const editor = new EnergyOverviewEntityEditor();
  editor.hass = hass;
  editor.config = { power: 'sensor.power', color: 'red', animation: { inverted: true } };
  document.body.append(editor);
  await editor.updateComplete;
  editor.shadowRoot!.querySelectorAll('ha-form')[3].dispatchEvent(new CustomEvent('value-changed', { detail: { value: { action: 'more-info' } } }));
  expect(editor.config).toEqual({ power: 'sensor.power', color: 'red', animation: { inverted: true }, tap_action: { action: 'more-info' } });
});
