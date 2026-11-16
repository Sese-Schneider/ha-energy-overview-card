import { beforeEach, expect, it, vi } from 'vitest';
import { commands } from 'vitest/browser';
import type { EnergyOverviewCard } from '../src/energy-overview-card';
import type { EnergyOverviewCardEditor } from '../src/energy-overview-card-editor';

beforeEach(async () => {
  await commands.setReducedMotion('no-preference');
  await expect.poll(() => matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(false);
});

it('loads the exact release bundle, reacts to state updates and opens its bundled editor', async () => {
  await import(/* @vite-ignore */ `${location.origin}/dist/energy-overview-card.js`);
  const card = document.createElement('energy-overview-card') as EnergyOverviewCard;
  card.hass = { states: { 'sensor.power': { state: '1000', attributes: {} } }, locale: { language: 'en' }, localize: () => '' };
  card.setConfig({ type: 'custom:energy-overview-card', entities: [{ power: 'sensor.power' }] });
  document.body.append(card);
  await card.updateComplete;
  expect(getComputedStyle(card.shadowRoot!.querySelector('.flow-dot')!).animationDuration).toBe('1s');
  card.hass = { ...card.hass, states: { 'sensor.power': { state: '0', attributes: {} } } };
  await card.updateComplete;
  expect(card.shadowRoot!.querySelector('.flow-dot')).toBeNull();
  customElements.define('ha-form', class extends HTMLElement {});
  const constructor = card.constructor as typeof EnergyOverviewCard;
  const editor = await constructor.getConfigElement() as EnergyOverviewCardEditor;
  editor.hass = card.hass;
  editor.setConfig({ type: 'custom:energy-overview-card', entities: [] });
  document.body.append(editor);
  await expect.poll(() => editor.shadowRoot?.querySelector('#add-card')?.textContent).toBe('Add entity');
  editor.remove();
  card.remove();
});

it('uses HA native color helpers in the exact production bundle', async () => {
  const previous = window.loadCardHelpers;
  window.loadCardHelpers = vi.fn(async () => ({
    createCardElement: () => document.createElement('div'),
    computeCssColor: (color: string) => color === 'future-color' ? 'var(--future-color)' : color,
    computeCssVariableName: (color: string) => color === 'future-color' ? '--future-color' : color,
  }));
  let card: EnergyOverviewCard | undefined;
  try {
    await import(/* @vite-ignore */ `${location.origin}/dist/energy-overview-card.js`);
    card = document.createElement('energy-overview-card') as EnergyOverviewCard;
    card.hass = { states: { 'sensor.power': { state: '500', attributes: {} } }, locale: { language: 'en' }, localize: () => '' };
    card.style.setProperty('--future-color', '#123456');
    card.setConfig({ type: 'custom:energy-overview-card', entities: [{ power: 'sensor.power', color: 'future-color' }] });
    document.body.append(card);
    await expect.poll(() => getComputedStyle(card!.shadowRoot!.querySelector('.grid')!).stroke).toBe('rgb(18, 52, 86)');
    expect(window.loadCardHelpers).toHaveBeenCalledTimes(1);
  } finally {
    card?.remove();
    if (previous) window.loadCardHelpers = previous;
    else delete window.loadCardHelpers;
  }
});
