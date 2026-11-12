import { expect, it, vi } from 'vitest';
import { EDITOR_LOAD_TIMEOUT_MS, loadHaComponents } from '../src/helper/util';

it('reports failures, retries and awaits the shared cold-start form loader', async () => {
  delete window.loadCardHelpers;
  await expect(loadHaComponents()).rejects.toThrow('helpers are unavailable');
  window.loadCardHelpers = vi.fn(async () => { throw new Error('Network failure'); });
  await expect(loadHaComponents()).rejects.toThrow('Network failure');
  vi.useFakeTimers();
  try {
    window.loadCardHelpers = () => new Promise(() => {});
    const timedOut = expect(loadHaComponents()).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(EDITOR_LOAD_TIMEOUT_MS);
    await timedOut;
  } finally {
    vi.useRealTimers();
  }
  let finish: () => void = () => {};
  const loaded = new Promise<void>((resolve) => { finish = resolve; });
  class ButtonCard extends HTMLElement {
    static async getConfigElement() {
      await loaded;
      customElements.define('ha-form', class extends HTMLElement {});
      return document.createElement('div');
    }
  }
  customElements.define('loader-button-card', ButtonCard);
  window.loadCardHelpers = vi.fn(async () => ({ createCardElement: () => document.createElement('loader-button-card') }));
  const first = loadHaComponents();
  const second = loadHaComponents();
  expect(customElements.get('ha-form')).toBeUndefined();
  finish();
  await Promise.all([first, second]);
  expect(window.loadCardHelpers).toHaveBeenCalledTimes(1);
  expect(customElements.get('ha-form')).toBeDefined();
  await loadHaComponents();
  expect(window.loadCardHelpers).toHaveBeenCalledTimes(1);
});
