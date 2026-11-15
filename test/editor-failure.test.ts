import { expect, it } from 'vitest';
import { EnergyOverviewCardEditor } from '../src/energy-overview-card-editor';

it('shows a recoverable error when helpers fail and retries without unhandled rejections', async () => {
  delete window.loadCardHelpers;
  const editor = new EnergyOverviewCardEditor();
  editor.hass = { states: {}, locale: { language: 'en' }, localize: () => '' };
  editor.setConfig({ type: 'custom:energy-overview-card', entities: [] });
  document.body.append(editor);
  await expect.poll(() => editor.shadowRoot?.querySelector('[role="alert"]')?.textContent).toContain('Unable to load');
  class ButtonCard extends HTMLElement {
    static async getConfigElement() {
      customElements.define('ha-form', class extends HTMLElement {});
      return document.createElement('div');
    }
  }
  customElements.define('retry-button-card', ButtonCard);
  window.loadCardHelpers = async () => ({ createCardElement: () => document.createElement('retry-button-card') });
  editor.shadowRoot!.querySelector<HTMLButtonElement>('button')!.click();
  await expect.poll(() => editor.shadowRoot!.querySelector('#add-card')?.textContent).toBe('Add entity');
  expect(editor.shadowRoot!.querySelector('[role="alert"]')).toBeNull();
  editor.remove();
});
