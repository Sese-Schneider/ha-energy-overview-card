import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CARD_EDITOR_NAME } from './const';
import type { HomeAssistant } from './ha-types';
import type { EnergyOverviewConfig, EnergyOverviewEntity } from './types';
import './energy-overview-entity-editor';
import { ANIMATION_SCHEMA, ORDER_BY_SCHEMA, TITLE_SCHEMA } from './schemas';
import { capitalize, fireEvent, loadHaComponents } from './helper/util';

@customElement(CARD_EDITOR_NAME)
export class EnergyOverviewCardEditor extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ attribute: false }) lovelace?: unknown;
  @state() private _config?: EnergyOverviewConfig;
  @state() private _selectedCard = 0;
  @state() private _ready = false;
  @state() private _loadFailed = false;

  static readonly styles = css`
    :host { display: block; color: var(--primary-text-color); }
    .toolbar, .entity-list, .card-options { display: flex; gap: 4px; align-items: center; }
    .entity-list { flex: 1; min-width: 0; overflow-x: auto; }
    .toolbar { margin-bottom: 8px; }
    .card-options { flex-wrap: wrap; justify-content: flex-end; margin-bottom: 12px; }
    button {
      font: inherit; color: var(--primary-text-color); background: var(--card-background-color, transparent);
      border: 1px solid var(--divider-color, #888); border-radius: 6px;
      min-width: 44px; min-height: 44px; padding: 8px; cursor: pointer;
    }
    button[aria-pressed="true"] { border: 2px solid var(--primary-color, #03a9f4); font-weight: bold; }
    button:focus-visible { outline: 2px solid var(--primary-color, #03a9f4); outline-offset: 2px; }
    button:disabled { opacity: 0.45; cursor: default; }
    #editor { border: 1px solid var(--divider-color, #888); border-radius: 6px; padding: 12px; }
    .error { color: var(--error-color, #db4437); }
  `;

  setConfig(config: EnergyOverviewConfig): void {
    if (!Array.isArray(config?.entities)) throw new Error('Entities must be a list.');
    this._config = config;
    this._selectedCard = Math.min(this._selectedCard, Math.max(0, config.entities.length - 1));
  }

  connectedCallback(): void {
    super.connectedCallback();
    void this._loadEditor();
  }

  private async _loadEditor(): Promise<void> {
    this._loadFailed = false;
    try {
      await loadHaComponents();
      this._ready = true;
    } catch {
      this._ready = false;
      this._loadFailed = true;
    }
  }

  private _publish(config: EnergyOverviewConfig): void {
    this._config = config;
    fireEvent(this, 'config-changed', { config });
  }

  private _handleConfigChanged(ev: CustomEvent<{ config: EnergyOverviewEntity }>): void {
    ev.stopPropagation();
    if (!this._config?.entities[this._selectedCard]) return;
    const entities = [...this._config.entities];
    entities[this._selectedCard] = ev.detail.config;
    this._publish({ ...this._config, entities });
  }

  private _addEntity(): void {
    if (!this._config) return;
    const entities = [...this._config.entities, { power: '' }];
    this._selectedCard = entities.length - 1;
    this._publish({ ...this._config, entities });
  }

  private _deleteEntity(): void {
    if (!this._config?.entities.length) return;
    const entities = [...this._config.entities];
    entities.splice(this._selectedCard, 1);
    this._selectedCard = Math.max(0, this._selectedCard - 1);
    this._publish({ ...this._config, entities });
  }

  private _moveEntity(delta: number): void {
    if (!this._config) return;
    const target = this._selectedCard + delta;
    if (target < 0 || target >= this._config.entities.length) return;
    const entities = [...this._config.entities];
    const [entity] = entities.splice(this._selectedCard, 1);
    entities.splice(target, 0, entity);
    this._selectedCard = target;
    this._publish({ ...this._config, entities });
  }

  private _navigate(ev: KeyboardEvent): void {
    const count = this._config?.entities.length ?? 0;
    if (!count) return;
    const buttons = [...this.renderRoot.querySelectorAll<HTMLButtonElement>('.entity-select')];
    let selected = buttons.findIndex((button) => button === ev.target);
    if (selected < 0) return;
    if (ev.key === 'ArrowRight') selected = (selected + 1) % count;
    else if (ev.key === 'ArrowLeft') selected = (selected + count - 1) % count;
    else if (ev.key === 'Home') selected = 0;
    else if (ev.key === 'End') selected = count - 1;
    else return;
    ev.preventDefault();
    this._selectedCard = selected;
    buttons[selected]?.focus();
  }

  private _label(key: string, fallback: string): string {
    const translated = this.hass?.localize(key);
    return translated && translated !== key ? translated : fallback;
  }

  private readonly _computeLabel = (schema: any): string => schema.label || capitalize(schema.name.replaceAll('_', ' '));

  private _valueChanged(ev: CustomEvent<{ value: Partial<EnergyOverviewConfig> }>): void {
    ev.stopPropagation();
    if (this._config) this._publish({ ...this._config, ...ev.detail.value });
  }

  private _animationChanged(ev: CustomEvent<{ value: EnergyOverviewConfig['animation'] }>): void {
    ev.stopPropagation();
    if (this._config) this._publish({ ...this._config, animation: ev.detail.value });
  }

  render() {
    if (!this.hass || !this._config) return nothing;
    if (this._loadFailed) return html`<p class="error" role="alert">Unable to load the Home Assistant editor. Use YAML or retry.</p><button type="button" @click=${this._loadEditor}>${this._label('ui.panel.app.retry', 'Retry')}</button>`;
    if (!this._ready) return html`<p role="status">Loading editor…</p>`;
    const selected = this._selectedCard;
    const count = this._config.entities.length;
    return html`
      <h2>Entities</h2>
      <div class="toolbar">
        <div class="entity-list" role="group" aria-label=${this._label('ui.panel.lovelace.editor.card.entities.name', 'Entities')} @keydown=${this._navigate}>
          ${this._config.entities.map((_entity, index) => html`
            <button type="button" class="entity-select" aria-label=${`${this._label('ui.panel.lovelace.editor.card.generic.entity', 'Entity')} ${index + 1}`}
              aria-pressed=${index === selected ? 'true' : 'false'}
              @click=${() => { this._selectedCard = index; }}>${index + 1}</button>
          `)}
        </div>
        <button type="button" id="add-card" @click=${this._addEntity}>${this._label('ui.panel.lovelace.editor.entities.add', 'Add entity')}</button>
      </div>
      <div id="editor">
        ${count ? html`
          <div class="card-options">
            <button type="button" aria-label=${this._label('ui.panel.lovelace.editor.edit_card.move_before', 'Move entity before')} ?disabled=${selected === 0} @click=${() => this._moveEntity(-1)}>←</button>
            <button type="button" aria-label=${this._label('ui.panel.lovelace.editor.edit_card.move_after', 'Move entity after')} ?disabled=${selected === count - 1} @click=${() => this._moveEntity(1)}>→</button>
            <button type="button" aria-label=${this._label('ui.panel.lovelace.editor.edit_card.delete', 'Delete entity')} @click=${this._deleteEntity}>${this._label('ui.panel.lovelace.editor.edit_card.delete', 'Delete entity')}</button>
          </div>
          <energy-overview-entity-editor .hass=${this.hass} .config=${this._config.entities[selected]}
            .lovelace=${this.lovelace} @config-changed=${this._handleConfigChanged}></energy-overview-entity-editor>
        ` : html`<p>No entities configured. Add an entity to begin.</p>`}
      </div>
      <h2>Card options</h2>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${TITLE_SCHEMA}
        .computeLabel=${this._computeLabel} @value-changed=${this._valueChanged}></ha-form>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${ORDER_BY_SCHEMA}
        .computeLabel=${this._computeLabel} @value-changed=${this._valueChanged}></ha-form>
      <h2>Animation</h2>
      <ha-form .hass=${this.hass} .data=${this._config.animation ?? {}} .schema=${ANIMATION_SCHEMA}
        .computeLabel=${this._computeLabel} @value-changed=${this._animationChanged}></ha-form>
    `;
  }
}
