// noinspection JSUnusedGlobalSymbols,CssInvalidHtmlTagReference

import { css, html, LitElement, nothing, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { capitalize, fireEvent } from "./helper/util";
import type { HomeAssistant } from "./ha-types";
import { ENTITY_EDITOR_NAME } from "./const";
import { EnergyOverviewEntity } from "./types";
import { ANIMATION_SCHEMA, ENTITY_DATA_SCHEMA, ENTITY_VISUALS_SCHEMA } from "./schemas";
import { colorPickerValue, DEFAULT_LINE_COLOR } from './helper/color';

@customElement(ENTITY_EDITOR_NAME)
export class EnergyOverviewEntityEditor extends LitElement {
  static readonly styles = css`
    .threshold { display: flex; flex-wrap: wrap; gap: 8px; align-items: end; margin-bottom: 8px; }
    .threshold label { flex: 1 1 120px; min-width: 0; }
    .threshold .color-picker { flex: 0 0 56px; }
    .threshold input { display: block; width: 100%; box-sizing: border-box; min-height: 44px; font: inherit; }
    button { min-height: 44px; font: inherit; cursor: pointer; }
    .threshold input, button { color: var(--primary-text-color); background: var(--card-background-color); border: 1px solid var(--divider-color, #888); border-radius: 4px; }
  `;
  @property({ attribute: false }) hass?: HomeAssistant;

  @property({ attribute: false }) lovelace?: unknown;

  @property({ attribute: false }) config?: EnergyOverviewEntity;

  private readonly _computeLabel = (schema) => {
    if (schema.label) return schema.label;
    let label = `${capitalize(schema.name.replaceAll('_', ' '))}`;
    if (schema.selector?.entity) label += ` ${this.hass!.localize(`ui.panel.lovelace.editor.card.generic.entity`)}`;
    return label;
  };

  private _publish(config: EnergyOverviewEntity): void {
    this.config = config;
    fireEvent(this, "config-changed", { config });
  }

  _valueChanged(ev) {
    ev.stopPropagation();
    if (!this.config) return;
    this._publish({ ...this.config, ...ev.detail.value });
  }

  _animationChanged(ev) {
    ev.stopPropagation();
    if (!this.config) return;
    this._publish({ ...this.config, animation: ev.detail.value });
  }

  private _thresholds(): NonNullable<EnergyOverviewEntity['color_thresholds']> {
    return Array.isArray(this.config?.color_thresholds) ? this.config.color_thresholds : [];
  }

  private _changeThreshold(index: number, field: 'value' | 'color', value: number | string): void {
    if (!this.config) return;
    const thresholds = [...this._thresholds()];
    thresholds[index] = { ...thresholds[index], [field]: value };
    this._publish({ ...this.config, color_thresholds: thresholds });
  }

  private _addThreshold(): void {
    if (this.config) this._publish({ ...this.config, color_thresholds: [...this._thresholds(), { value: 0, color: this.config.color || DEFAULT_LINE_COLOR }] });
  }

  private _removeThreshold(index: number): void {
    if (this.config) this._publish({ ...this.config, color_thresholds: this._thresholds().filter((_threshold, key) => key !== index) });
  }

  render(): TemplateResult | symbol {
    if (!this.hass || !this.config) {
      return nothing;
    }

    return html`
      <h3>Data</h3>
      <ha-form
        .hass="${this.hass}"
        .data="${this.config}"
        .schema="${ENTITY_DATA_SCHEMA}"
        .computeLabel="${this._computeLabel}"
        @value-changed="${this._valueChanged}">
      </ha-form>
      <h3>Visuals</h3>
      <ha-form
        .hass="${this.hass}"
        .data="${this.config}"
        .schema="${ENTITY_VISUALS_SCHEMA}"
        .computeLabel="${this._computeLabel}"
        @value-changed="${this._valueChanged}">
      </ha-form>
      <h3>Animation Overwrite</h3>
      <ha-form
        .hass="${this.hass}"
        .data="${this.config.animation ?? {}}"
        .schema="${ANIMATION_SCHEMA}"
        .computeLabel="${this._computeLabel}"
        @value-changed="${this._animationChanged}">
      </ha-form>
      <h3>Color thresholds</h3>
      <p>Minimum absolute power in watts. The highest matching threshold wins.</p>
      <p>Choose a color with the picker, or enter a CSS color or variable. Custom CSS values stay unchanged until you choose a color.</p>
      ${this._thresholds().map((threshold, index) => {
        const pickerColor = colorPickerValue(threshold?.color);
        return html`
        <div class="threshold">
          <label>Minimum power (W)
            <input type="number" min="0" step="any" aria-label=${`Threshold ${index + 1} minimum power (W)`}
              .value=${String(threshold?.value ?? '')}
              @change=${(event: Event) => this._changeThreshold(index, 'value', (event.target as HTMLInputElement).valueAsNumber)}>
          </label>
          <label class="color-picker">Color
            <input type="color" aria-label=${`Threshold ${index + 1} color picker`}
              title=${pickerColor ? 'Choose a color' : 'Choose an opaque color; the swatch is a placeholder for the current custom CSS value'}
              .value=${pickerColor ?? '#03a9f4'}
              @input=${(event: Event) => this._changeThreshold(index, 'color', (event.target as HTMLInputElement).value)}>
          </label>
          <label>CSS color
            <input type="text" aria-label=${`Threshold ${index + 1} color`} .value=${threshold?.color ?? ''}
              @change=${(event: Event) => this._changeThreshold(index, 'color', (event.target as HTMLInputElement).value)}>
          </label>
          <button type="button" aria-label=${`Remove threshold ${index + 1}`} @click=${() => this._removeThreshold(index)}>Remove</button>
        </div>`;
      })}
      <button type="button" id="add-threshold" @click=${this._addThreshold}>Add color threshold</button>
    `;
  }

}
