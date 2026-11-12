import { afterEach, beforeEach, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { EnergyOverviewCard } from '../src/energy-overview-card';
import type { HomeAssistant } from '../src/ha-types';

declare module 'vitest/browser' {
  interface BrowserCommands {
    setReducedMotion(preference: 'reduce' | 'no-preference' | null): Promise<void>;
  }
}

const hass: HomeAssistant = {
  states: { 'sensor.power': { state: '500', attributes: { unit_of_measurement: 'W' } } },
  locale: { language: 'en' }, localize: () => '',
};
beforeEach(async () => {
  // A null preference restores platform defaults, which can reduce motion in Linux WebKit.
  await commands.setReducedMotion('no-preference');
  await expect.poll(() => matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(false);
});
afterEach(() => { document.body.replaceChildren(); });
async function card(entities: any[] = [{ power: 'sensor.power' }]) {
  const element = new EnergyOverviewCard();
  element.hass = hass;
  element.setConfig({ type: 'custom:energy-overview-card', entities });
  document.body.append(element);
  await element.updateComplete;
  return element;
}
it('registers in the card picker before loading the editor', () => {
  expect(window.customCards?.some((entry) => entry.type === 'energy-overview-card')).toBe(true);
});
it('renders missing and unavailable states without a motion element', async () => {
  const element = await card([{ power: 'sensor.missing', voltage: 'sensor.missing' }, { power: '' }]);
  expect(element.shadowRoot!.textContent).toContain('Not found');
  expect(element.shadowRoot!.textContent).toContain('Not configured');
   expect(element.shadowRoot!.querySelector('circle')).toBeNull();
  element.hass = { ...hass, states: { 'sensor.missing': { state: 'unavailable', attributes: {} } } };
  await element.updateComplete;
  expect(element.shadowRoot!.textContent).toContain('unavailable');
});
it('renders sensor-derived markup as text', async () => {
  const element = await card([{ power: 'sensor.power', voltage: 'sensor.bad' }]);
  element.hass = { ...hass, states: { ...hass.states, 'sensor.bad': { state: '<img src=x onerror=alert(1)>', attributes: {} } } };
  await element.updateComplete;
  expect(element.shadowRoot!.querySelector('img')).toBeNull();
  expect(element.shadowRoot!.textContent).toContain('<img');
});
it('preserves motion nodes across updates and uses inline independent paths', async () => {
  const first = await card([{ power: 'sensor.power' }, { power: 'sensor.power' }]);
  const second = await card();
  const motion = first.shadowRoot!.querySelector('circle')!;
  expect(getComputedStyle(motion).animationDuration).toBe('5.5s');
  expect(motion?.namespaceURI).toBe('http://www.w3.org/2000/svg');
  expect(first.shadowRoot!.querySelector('[id="grid"]')).toBeNull();
  first.hass = { ...hass, states: { 'sensor.power': { state: '-250', attributes: {} } } };
  await first.updateComplete;
  expect(first.shadowRoot!.querySelector('circle')).toBe(motion);
  expect(getComputedStyle(motion).animationDirection).toBe('reverse');
  expect(getComputedStyle(second.shadowRoot!.querySelector('circle')!).animationDirection).toBe('normal');
  await expect.poll(() => second.shadowRoot!.querySelector('circle')!.getAnimations()[0]?.playState).toBe('running');
});
it('hides the flow dot and removes its animation when reduced motion is enabled', async () => {
  try {
    await commands.setReducedMotion('no-preference');
    const element = await card();
    const circle = element.shadowRoot!.querySelector('circle')!;
    await expect.poll(() => circle.getAnimations()[0]?.playState).toBe('running');
    await commands.setReducedMotion('reduce');
    await expect.poll(() => matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    await expect.poll(() => getComputedStyle(circle).display).toBe('none');
    await expect.poll(() => circle.getAnimations().length).toBe(0);
    await commands.setReducedMotion('no-preference');
    await expect.poll(() => getComputedStyle(circle).display).not.toBe('none');
    await expect.poll(() => circle.getAnimations()[0]?.playState).toBe('running');
  } finally {
    await commands.setReducedMotion('no-preference');
  }
});
it.each([180, 320, 768, 1280])('does not overflow a %s px card with long labels and optional metadata', async (width) => {
  const label = 'A very long label with words and unbrokencharacters'.repeat(2);
  const element = await card([{ power: 'sensor.power', name: label, voltage: 'sensor.power', current: 'sensor.power', frequency: 'sensor.power', power_factor: 'sensor.power', label_leading: label, label_trailing: label }]);
  element.style.width = `${width}px`;
  const box = element.getBoundingClientRect();
  for (const child of element.shadowRoot!.querySelectorAll('.entity, .metadata, .main, .line, svg')) {
    const bounds = child.getBoundingClientRect();
    expect(bounds.left).toBeGreaterThanOrEqual(box.left - 1);
    expect(bounds.right).toBeLessThanOrEqual(box.right + 1);
  }
  for (const text of element.shadowRoot!.querySelectorAll<HTMLElement>('.name, .label')) {
    expect(text.scrollWidth).toBeLessThanOrEqual(text.clientWidth + 1);
  }
});
it.each([320, 768, 1280])('moves across the full flow line at %s px and reverses direction', async (width) => {
  const element = await card();
  element.style.width = `${width}px`;
  const circle = element.shadowRoot!.querySelector('circle')!;
  const svg = element.shadowRoot!.querySelector('svg')!;
  const center = () => {
    const bounds = circle.getBoundingClientRect();
    return bounds.left + bounds.width / 2;
  };
  await expect.poll(() => circle.getAnimations().length).toBe(1);
  const animation = circle.getAnimations()[0];
  expect(animation).toBeDefined();
  // First prove the clock is running, then sample exact positions without timing races.
  await expect.poll(() => Number(animation.currentTime)).toBeGreaterThan(0);
  animation.pause();
  animation.currentTime = 1375; // 25% of the 5.5s cycle
  const bounds = svg.getBoundingClientRect();
  expect(center()).toBeCloseTo(bounds.left + bounds.width * 0.25, 0);
  animation.currentTime = 4125;
  expect(center()).toBeCloseTo(bounds.left + bounds.width * 0.75, 0);
  element.hass = { ...hass, states: { 'sensor.power': { state: '-500', attributes: {} } } };
  await element.updateComplete;
  await expect.poll(() => circle.getAnimations().length).toBe(1);
  const reversed = circle.getAnimations()[0];
  reversed.pause();
  reversed.currentTime = 1375;
  expect(center()).toBeCloseTo(bounds.left + bounds.width * 0.75, 0);
  element.hass = { ...hass, states: { 'sensor.power': { state: '0', attributes: {} } } };
  await element.updateComplete;
  expect(element.shadowRoot!.querySelector('circle')).toBeNull();
  element.hass = hass;
  await element.updateComplete;
  await expect.poll(() => element.shadowRoot!.querySelector('circle')!.getAnimations().length).toBe(1);
});
it('supports empty previews, validates shape, and sizes title/rows without clipping Sections', async () => {
  const element = await card([]);
  expect(element.shadowRoot!.textContent).toContain('No entities');
  const small = element.getCardSize();
  element.setConfig({ type: 'custom:energy-overview-card', title: 'Power', entities: [{ power: '', name: 'One' }, { power: '' }] });
  expect(element.getCardSize()).toBeGreaterThan(small);
  expect(element.getGridOptions()).toEqual({ columns: 12, min_columns: 6, rows: 'auto' });
  expect(() => element.setConfig({ entities: [null] } as any)).toThrow();
});
it('sorts by measurement without crashing on a missing value', async () => {
  const element = await card();
  element.setConfig({ type: 'custom:energy-overview-card', order_by: 'power', entities: [{ power: 'sensor.missing', name: 'Missing' }, { power: 'sensor.power', name: 'Active' }] });
  await element.updateComplete;
  expect(element.shadowRoot!.querySelector('.name')?.textContent).toBe('Active');
});
