import { afterEach, beforeAll, expect, it } from 'vitest';
import { EnergyOverviewCardEditor } from '../src/energy-overview-card-editor';
import type { EnergyOverviewConfig } from '../src/types';
import { EnergyOverviewEntityEditor } from '../src/energy-overview-entity-editor';
import { userEvent } from 'vitest/browser';
import { ANIMATION_SCHEMA, ENTITY_DATA_SCHEMA, ENTITY_VISUALS_SCHEMA, TITLE_SCHEMA, ORDER_BY_SCHEMA } from '../src/schemas';
type Form = HTMLElement & { schema: unknown };


beforeAll(() => {
  customElements.define('ha-form', class extends HTMLElement {});
});
afterEach(() => { document.body.replaceChildren(); });
const initial: EnergyOverviewConfig = {
  type: 'custom:energy-overview-card', title: 'Original',
  animation: { power: 1000, max_duration: 10 },
  entities: [{ power: 'sensor.first', name: 'First', color: '#123456', animation: { inverted: true } }, { power: 'sensor.second', name: 'Second' }],
};
async function editor(config = initial) {
  const element = new EnergyOverviewCardEditor();
  element.hass = { states: {}, locale: { language: 'en' }, localize: () => '' };
  element.setConfig(config);
  document.body.append(element);
  await element.updateComplete;
  await element.updateComplete;
  return element;
}
function change(element: HTMLElement, value: unknown) {
  element.dispatchEvent(new CustomEvent('value-changed', { detail: { value }, bubbles: true, composed: true }));
}
it('adds, selects, moves, deletes all rows and creates a replacement with native controls', async () => {
  const element = await editor();
  let latest = initial;
  element.addEventListener('config-changed', (event) => { latest = (event as CustomEvent).detail.config; });
  const click = async (selector: string) => {
    element.shadowRoot!.querySelector<HTMLButtonElement>(selector)!.click();
    await element.updateComplete;
  };
  await click('#add-card');
  expect(latest.entities).toHaveLength(3);
  expect(element.shadowRoot!.querySelector('[aria-label="Entity 3"]')?.getAttribute('aria-pressed')).toBe('true');
  await click('[aria-label="Entity 2"]');
  await click('[aria-label="Move entity before"]');
  expect(latest.entities[0].power).toBe('sensor.second');
  await click('[aria-label="Move entity after"]');
  expect(latest.entities[1].power).toBe('sensor.second');
  for (let index = 0; index < 3; index++) await click('[aria-label="Delete entity"]');
  expect(latest.entities).toEqual([]);
  expect(element.shadowRoot!.textContent).toContain('No entities configured');
  await click('#add-card');
  expect(latest.entities).toEqual([{ power: '' }]);
  expect(initial.entities).toHaveLength(2);
});
it('retains global and per-entity settings during edits, then reopens saved config', async () => {
  const element = await editor();
  let latest = initial;
  element.addEventListener('config-changed', (event) => { latest = (event as CustomEvent).detail.config; });
  const child = element.shadowRoot!.querySelector<EnergyOverviewEntityEditor>('energy-overview-entity-editor')!;
  await child.updateComplete;
  const childForms = child.shadowRoot!.querySelectorAll<Form>('ha-form');
  expect([...childForms].map((form) => form.schema)).toEqual([ENTITY_DATA_SCHEMA, ENTITY_VISUALS_SCHEMA, ANIMATION_SCHEMA]);
  change(child.shadowRoot!.querySelector('ha-form')!, { power: 'sensor.changed' });
  change(child.shadowRoot!.querySelectorAll('ha-form')[2] as HTMLElement, { inverted: false, power: 300 });
  await element.updateComplete;
  expect(latest.entities[0]).toEqual({ ...initial.entities[0], power: 'sensor.changed', animation: { inverted: false, power: 300 } });
  const forms = element.shadowRoot!.querySelectorAll<Form>('ha-form');
  expect([...forms].map((form) => form.schema)).toEqual([TITLE_SCHEMA, ORDER_BY_SCHEMA, ANIMATION_SCHEMA]);
  change(forms[0], { title: 'New title' });
  change(forms[1], { order_by: 'power' });
  expect(latest.title).toBe('New title');
  expect(latest.order_by).toBe('power');
  expect(latest.animation).toEqual(initial.animation);
  const reopened = await editor(latest);
  const reopenedChild = reopened.shadowRoot!.querySelector<EnergyOverviewEntityEditor>('energy-overview-entity-editor')!;
  expect(reopenedChild.config).toEqual(latest.entities[0]);
});
it('supports keyboard selection and clamps selection when YAML removes rows', async () => {
  const element = await editor();
  const first = element.shadowRoot!.querySelector<HTMLButtonElement>('.entity-select')!;
  first.focus();
  await userEvent.keyboard('{ArrowRight}');
  await element.updateComplete;
  expect(element.shadowRoot!.activeElement?.getAttribute('aria-label')).toBe('Entity 2');
  expect(element.shadowRoot!.querySelector('[aria-label="Entity 2"]')?.getAttribute('aria-pressed')).toBe('true');
  for (const [key, expected] of [['ArrowRight', 'Entity 1'], ['End', 'Entity 2'], ['Home', 'Entity 1'], ['ArrowLeft', 'Entity 2']]) {
    await userEvent.keyboard(`{${key}}`);
    await element.updateComplete;
    expect(element.shadowRoot!.activeElement?.getAttribute('aria-label')).toBe(expected);
  }
  element.setConfig({ ...initial, entities: [initial.entities[0]] });
  await element.updateComplete;
  expect(element.shadowRoot!.querySelector('[aria-label="Entity 1"]')?.getAttribute('aria-pressed')).toBe('true');
});
it('keeps touch controls usable and within narrow editor bounds', async () => {
  const element = await editor();
  element.style.width = '280px';
  for (const button of element.shadowRoot!.querySelectorAll('button')) {
    expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    expect(button.getBoundingClientRect().width).toBeGreaterThanOrEqual(44);
  }
  const right = element.getBoundingClientRect().right;
  expect(element.shadowRoot!.querySelector('.toolbar')!.getBoundingClientRect().right).toBeLessThanOrEqual(right);
});

it('uses Home Assistant translations for native controls and accessible entity labels', async () => {
  const element = await editor();
  const translations: Record<string, string> = {
    'ui.panel.lovelace.editor.entities.add': 'Entität hinzufügen',
    'ui.panel.lovelace.editor.edit_card.move_before': 'Nach vorne',
    'ui.panel.lovelace.editor.edit_card.move_after': 'Nach hinten',
    'ui.panel.lovelace.editor.edit_card.delete': 'Löschen',
    'ui.panel.lovelace.editor.card.generic.entity': 'Entität',
  };
  element.hass = { ...element.hass!, localize: (key) => translations[key] ?? '' };
  await element.updateComplete;
  expect(element.shadowRoot!.querySelector('#add-card')?.textContent).toBe('Entität hinzufügen');
  expect(element.shadowRoot!.querySelector('[aria-label="Nach vorne"]')).not.toBeNull();
  expect(element.shadowRoot!.querySelector('[aria-label="Nach hinten"]')).not.toBeNull();
  expect(element.shadowRoot!.querySelector('[aria-label="Löschen"]')?.textContent).toBe('Löschen');
  expect(element.shadowRoot!.querySelector('[aria-label="Entität 1"]')).not.toBeNull();
});
