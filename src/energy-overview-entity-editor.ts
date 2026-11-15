// noinspection JSUnusedGlobalSymbols,CssInvalidHtmlTagReference

import { html, LitElement, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { capitalize, fireEvent } from "./helper/util";
import type { HomeAssistant } from "./ha-types";
import { ENTITY_EDITOR_NAME } from "./const";
import { EnergyOverviewEntity } from "./types";
import { ANIMATION_SCHEMA, entityDataSchema, ENTITY_VISUALS_SCHEMA } from "./schemas";

@customElement(ENTITY_EDITOR_NAME)
export class EnergyOverviewEntityEditor extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;

  @property({ attribute: false }) lovelace?: unknown;

  @property({ attribute: false }) config?: EnergyOverviewEntity;
  @state() private _showAll = false;

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

  render(): TemplateResult | symbol {
    if (!this.hass || !this.config) {
      return nothing;
    }

    return html`
      <h3>Data</h3>
      <label style="display: flex; align-items: center; min-height: 44px; gap: 8px;">
        <input type="checkbox" .checked=${this._showAll} @change=${(ev: Event) => { this._showAll = (ev.target as HTMLInputElement).checked; }}>
        Show all sensors and numeric helpers
      </label>
      <ha-form
        .hass="${this.hass}"
        .data="${this.config}"
        .schema="${entityDataSchema(this.hass, this.config, this._showAll)}"
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
    `;
  }

}
