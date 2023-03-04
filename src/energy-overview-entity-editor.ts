// noinspection JSUnusedGlobalSymbols,CssInvalidHtmlTagReference

import {css, CSSResultGroup, html, LitElement, nothing} from "lit";
import {customElement, property, state} from "lit/decorators";
import {TemplateResult} from "lit/development";
import {ENTITY_EDITOR_NAME} from "./const";
import {loadHaComponents} from "./util";
import {EnergyOverviewEntity} from "./types";

@customElement(ENTITY_EDITOR_NAME)
export class EnergyOverviewEntityEditor extends LitElement {
    @property() hass;

    @property() lovelace;

    @property() config?: EnergyOverviewEntity;

    @state() GUImode = true;

    @state() _guiModeAvailable? = true;

    static get styles(): CSSResultGroup {
        return css`
        `;
    }

    _setMode(value: boolean): void {
        this.GUImode = value;
    }

    // eslint-disable-next-line class-methods-use-this
    toggleMode(): void {
        this.GUImode = !this.GUImode;
    }

    render(): TemplateResult | symbol {
        if (!this.hass || !this.config) {
            return nothing;
        }

        const entity = this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.entity",
        );

        return html`
            <ha-entity-picker
                    .label="Power ${entity} (${this.hass.localize(
                            "ui.panel.lovelace.editor.card.config.required",
                    )})"
                    .hass=${this.hass}
                    .value=${this.config.power}
                    .configValue=${"power"}
                    allow-custom-entity>
            </ha-entity-picker>
            <ha-entity-picker
                    .label="Voltage ${entity}"
                    .hass=${this.hass}
                    .value=${this.config.voltage}
                    .configValue=${"voltage"}
                    allow-custom-entity>
            </ha-entity-picker>
        `;
    }

    connectedCallback() {
        super.connectedCallback();
        loadHaComponents();
    }
}
