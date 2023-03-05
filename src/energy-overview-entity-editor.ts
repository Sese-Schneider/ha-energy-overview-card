// noinspection JSUnusedGlobalSymbols,CssInvalidHtmlTagReference

import {css, CSSResultGroup, html, LitElement, nothing} from "lit";
import {customElement, property} from "lit/decorators";
import {TemplateResult} from "lit/development";
import {fireEvent} from "custom-card-helpers";
import {ENTITY_EDITOR_NAME} from "./const";
import {loadHaComponents} from "./util";
import {EnergyOverviewEntity} from "./types";

@customElement(ENTITY_EDITOR_NAME)
export class EnergyOverviewEntityEditor extends LitElement {
    @property() hass;

    @property() lovelace;

    @property() config?: EnergyOverviewEntity;

    static get styles(): CSSResultGroup {
        return css`
          .card-config {
            /* Cancels overlapping Margins for HAForm + Card Config options */
            overflow: auto;
          }

          ha-switch {
            padding: 16px 6px;
          }

          .side-by-side {
            display: flex;
            align-items: flex-end;
          }

          .side-by-side > * {
            flex: 1;
            padding-right: 8px;
          }

          .side-by-side > *:last-child {
            flex: 1;
            padding-right: 0;
          }

          .suffix {
            margin: 0 8px;
          }

          ha-entity-picker,
          ha-icon-picker {
            margin-top: 8px;
            display: block;
          }
        `;
    }

    _valueChanged(ev) {
        if (!this.config) return;
        const newConfig = {...this.config};
        newConfig[ev.target.configValue] = ev.target.value;
        this.config = newConfig;

        fireEvent(this, "config-changed", {config: this.config});
    }

    render(): TemplateResult | symbol {
        if (!this.hass || !this.config) {
            return nothing;
        }

        const entity = this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.entity",
        );

        return html`
            <h3>Data</h3>
            <ha-entity-picker
                    .label="Power ${entity} (${this.hass.localize(
                            "ui.panel.lovelace.editor.card.config.required",
                    )})"
                    .hass=${this.hass}
                    .value=${this.config.power}
                    .configValue=${"power"}
                    @value-changed=${this._valueChanged}
                    allow-custom-entity>
            </ha-entity-picker>
            <div class="side-by-side">
                <ha-entity-picker
                        .label="Voltage ${entity}"
                        .hass=${this.hass}
                        .value=${this.config.voltage}
                        .configValue=${"voltage"}
                        @value-changed=${this._valueChanged}
                        allow-custom-entity>
                </ha-entity-picker>
                <ha-entity-picker
                        .label="Current ${entity}"
                        .hass=${this.hass}
                        .value=${this.config.current}
                        .configValue=${"current"}
                        @value-changed=${this._valueChanged}
                        allow-custom-entity>
                </ha-entity-picker>
            </div>
            <div class="side-by-side">
                <ha-entity-picker
                        .label="Frequency ${entity}"
                        .hass=${this.hass}
                        .value=${this.config.frequency}
                        .configValue=${"frequency"}
                        @value-changed=${this._valueChanged}
                        allow-custom-entity>
                </ha-entity-picker>
                <ha-entity-picker
                        .label="Power Factor ${entity}"
                        .hass=${this.hass}
                        .value=${this.config.power_factor}
                        .configValue=${"power_factor"}
                        @value-changed=${this._valueChanged}
                        allow-custom-entity>
                </ha-entity-picker>
            </div>
            <br />
            <h3>Visuals</h3>
            <div class="side-by-side">
                <ha-icon-picker
                        .label="Icon Leading"
                        .hass=${this.hass}
                        .value=${this.config.icon_leading}
                        .configValue=${"icon_leading"}
                        @value-changed=${this._valueChanged}>
                </ha-icon-picker>
                <ha-icon-picker
                        .label="Icon Trailing"
                        .hass=${this.hass}
                        .value=${this.config.icon_trailing}
                        .configValue=${"icon_trailing"}
                        @value-changed=${this._valueChanged}>
                </ha-icon-picker>
            </div>
        `;
    }

    connectedCallback() {
        super.connectedCallback();
        loadHaComponents();
    }
}
