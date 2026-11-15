import { afterEach, beforeEach, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { EnergyOverviewCard } from '../src/energy-overview-card';
import type { HomeAssistant } from '../src/ha-types';

const hass: HomeAssistant = {
  states: { 'sensor.power': { state: '500', attributes: { unit_of_measurement: 'W' } } },
  locale: { language: 'en' }, localize: () => '',
};
beforeEach(() => commands.setReducedMotion('no-preference'));
afterEach(() => document.body.replaceChildren());
async function setup() {
  const card = new EnergyOverviewCard();
  card.hass = hass;
  card.setConfig({ type: 'custom:energy-overview-card', entities: [{ power: 'sensor.power', current: 'sensor.power' }] });
  document.body.append(card);
  await card.updateComplete;
  const dot = card.shadowRoot!.querySelector('.flow-dot')!;
  await expect.poll(() => dot.getAnimations().length).toBe(1);
  const animation = dot.getAnimations()[0];
  animation.pause();
  animation.currentTime = 1375;
  return { card, dot, animation };
}
const position = (dot: Element) => dot.getBoundingClientRect().left;
it.each(['250', '999', '-500', '-250'])('preserves dot position on an update to %s W', async (state) => {
  const { card, dot } = await setup();
  const before = position(dot);
  card.hass = { ...hass, states: { 'sensor.power': { state, attributes: { unit_of_measurement: 'W' } } } };
  await card.updateComplete;
  expect(card.shadowRoot!.querySelector('.flow-dot')).toBe(dot);
  expect(position(dot)).toBeCloseTo(before, 0);
});
it('preserves position during repeated speed changes and configuration updates', async () => {
  const { card, dot } = await setup();
  const before = position(dot);
  for (const state of ['9', '123', '-42', '450', '1']) {
    card.hass = { ...hass, states: { 'sensor.power': { state, attributes: { unit_of_measurement: 'W' } } } };
    await card.updateComplete;
    expect(position(dot)).toBeCloseTo(before, 0);
  }
  card.setConfig({ type: 'custom:energy-overview-card', animation: { min_duration: 2, max_duration: 20, inverted: true }, entities: [{ power: 'sensor.power' }] });
  await card.updateComplete;
  expect(position(dot)).toBeCloseTo(before, 0);
});
it('keeps independent animation phases when sorting moves rows', async () => {
  const { card } = await setup();
  card.hass = { ...hass, states: { ...hass.states, 'sensor.other': { state: '100', attributes: {} } } };
  card.setConfig({ type: 'custom:energy-overview-card', order_by: 'power', entities: [{ power: 'sensor.power' }, { power: 'sensor.other' }] });
  await card.updateComplete;
  const dots = [...card.shadowRoot!.querySelectorAll('.flow-dot')];
  for (const dot of dots) { dot.getAnimations()[0].pause(); dot.getAnimations()[0].currentTime = 1000; }
  const positions = dots.map(position);
  card.hass = { ...hass, states: { ...hass.states, 'sensor.other': { state: '900', attributes: {} } } };
  await card.updateComplete;
  expect([...card.shadowRoot!.querySelectorAll('.flow-dot')]).toEqual([dots[1], dots[0]]);
  dots.forEach((dot, index) => expect(position(dot)).toBeCloseTo(positions[index], 0));
});
it.each([['500', '-500'], ['-500', '500']])('preserves the starting endpoint when power changes from %s to %s', async (initial, state) => {
  const { card, dot, animation } = await setup();
  card.hass = { ...hass, states: { 'sensor.power': { state: initial, attributes: {} } } };
  await card.updateComplete;
  animation.currentTime = 0;
  const before = position(dot);
  card.hass = { ...hass, states: { 'sensor.power': { state, attributes: {} } } };
  await card.updateComplete;
  expect(position(dot)).toBeCloseTo(before, 0);
});
it('continues running after live speed and direction updates', async () => {
  const { card, dot, animation } = await setup();
  animation.play();
  await expect.poll(() => animation.playState).toBe('running');
  for (const state of ['250', '-250', '800']) {
    const before = position(dot);
    card.hass = { ...hass, states: { 'sensor.power': { state, attributes: {} } } };
    await card.updateComplete;
    expect(Math.abs(position(dot) - before)).toBeLessThan(10);
    expect(dot.getAnimations()[0].playState).toBe('running');
  }
});
