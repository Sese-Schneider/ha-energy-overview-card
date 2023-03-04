/* eslint-disable import/no-duplicates */
// noinspection JSUnusedGlobalSymbols,CssInvalidHtmlTagReference

// https://github.com/home-assistant/frontend/blob/dev/src/panels/lovelace/editor/config-elements/hui-stack-card-editor.ts

import {mdiArrowLeft, mdiArrowRight, mdiDelete, mdiPlus} from "@mdi/js";
import {fireEvent, LovelaceCardEditor} from "custom-card-helpers";
import {css, CSSResultGroup, html, LitElement, nothing} from "lit";
import {customElement, property, query, state} from "lit/decorators";
import {TemplateResult} from "lit/development";
import {CARD_EDITOR_NAME, CARD_NAME, ENTITY_EDITOR_NAME, NAME} from "./const";
import {EnergyOverviewConfig, EnergyOverviewEntity} from "./types";
import {EnergyOverviewEntityEditor} from "./energy-overview-entity-editor";
import "./energy-overview-entity-editor";

@customElement(CARD_EDITOR_NAME)
export class EnergyOverviewCardEditor extends LitElement implements LovelaceCardEditor {
    @property() hass;

    @property() lovelace;

    @state() _config?: EnergyOverviewConfig;

    @state() _selectedCard = 0;

    @state() _GUImode = true;

    @state() _guiModeAvailable? = true;

    @query(ENTITY_EDITOR_NAME)
    _entityEditorEl?: EnergyOverviewEntityEditor;

    static get styles(): CSSResultGroup {
        return css`
          .toolbar {
            display: flex;
            --paper-tabs-selection-bar-color: var(--primary-color);
            --paper-tab-ink: var(--primary-color);
          }

          .card-config {
            overflow: auto;
          }

          paper-tabs {
            display: flex;
            font-size: 14px;
            flex-grow: 1;
          }

          #add-card {
            max-width: 32px;
            padding: 0;
          }

          #card-options {
            display: flex;
            justify-content: flex-end;
            width: 100%;
          }

          #editor {
            border: 1px solid var(--divider-color);
            padding: 12px;
          }

          @media (max-width: 450px) {
            #editor {
              margin: 0 -12px;
            }
          }

          .gui-mode-button {
            margin-right: auto;
          }
        `;
    }

    setConfig(config: EnergyOverviewConfig) {
        this._config = config;
    }

    _handleConfigChanged(ev) {
        ev.stopPropagation();
        if (!this._config) {
            return;
        }
        const entities = [...this._config.entities];
        entities[this._selectedCard] = ev.detail.config as EnergyOverviewEntity;
        this._config = {...this._config, entities};
        console.debug("new config", this._config);
        this._guiModeAvailable = ev.detail.guiModeAvailable;
        fireEvent(this, "config-changed", {config: this._config});
    }

    _handleSelectedCard(ev) {
        if (ev.target.id === "add-card") {
            this._selectedCard = this._config!.entities.length;
            return;
        }
        this._setMode(true);
        this._guiModeAvailable = true;
        this._selectedCard = parseInt(ev.detail.selected, 10);
    }

    _handleDeleteCard() {
        if (!this._config) {
            return;
        }
        const entities = [...this._config.entities];
        entities.splice(this._selectedCard, 1);
        this._config = {...this._config, entities};
        this._selectedCard = Math.max(0, this._selectedCard - 1);
        fireEvent(this, "config-changed", {config: this._config});
    }

    _handleMove(ev: Event) {
        if (!this._config) {
            return;
        }
        const {move} = ev.currentTarget as any;
        const source = this._selectedCard;
        const target = source + move;
        const entities = [...this._config.entities];
        const card = entities.splice(this._selectedCard, 1)[0];
        entities.splice(target, 0, card);
        this._config = {
            ...this._config,
            entities,
        };
        this._selectedCard = target;
        fireEvent(this, "config-changed", {config: this._config});
    }

    _setMode(value: boolean): void {
        this._GUImode = value;
        if (this._entityEditorEl) {
            this._entityEditorEl!.GUImode = value;
        }
    }

    _toggleMode(): void {
        this._entityEditorEl?.toggleMode();
    }

    _handleGUIModeChanged(ev): void {
        ev.stopPropagation();
        this._GUImode = ev.detail.guiMode;
        this._guiModeAvailable = ev.detail.guiModeAvailable;
    }

    render(): TemplateResult | symbol {
        if (!this.hass || !this._config) {
            return nothing;
        }

        const selected = this._selectedCard!;
        const numcards = this._config.entities.length;

        return html`
            <div class="card-config">
                <div class="toolbar">
                    <paper-tabs
                            .selected=${selected}
                            scrollable
                            @iron-activate=${this._handleSelectedCard}>
                        ${this._config.entities.map(
                                (_card, i) => html`
                                    <paper-tab> ${i + 1}</paper-tab> `,
                        )}
                    </paper-tabs>
                    <paper-tabs
                            id="add-card"
                            .selected=${selected === numcards ? "0" : undefined}
                            @iron-activate=${this._handleSelectedCard}>
                        <paper-tab>
                            <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
                        </paper-tab>
                    </paper-tabs>
                </div>
            </div>
            <div id="editor">
                <div id="card-options">
                    <mwc-button
                            @click=${this._toggleMode}
                            .disabled=${!this._guiModeAvailable}
                            class="gui-mode-button">
                        ${this.hass!.localize(
                                this._GUImode
                                        ? "ui.panel.lovelace.editor.edit_card.show_code_editor"
                                        : "ui.panel.lovelace.editor.edit_card.show_visual_editor",
                        )}
                    </mwc-button>
                    <ha-icon-button
                            .disabled=${selected === 0}
                            .label=${this.hass!.localize(
                                    "ui.panel.lovelace.editor.edit_card.move_before",
                            )}
                            .path=${mdiArrowLeft}
                            @click=${this._handleMove}
                            .move=${-1}></ha-icon-button>
                    <ha-icon-button
                            .label=${this.hass!.localize(
                                    "ui.panel.lovelace.editor.edit_card.move_after",
                            )}
                            .path=${mdiArrowRight}
                            .disabled=${selected === numcards - 1}
                            @click=${this._handleMove}
                            .move=${1}></ha-icon-button>
                    <ha-icon-button
                            .label=${this.hass!.localize(
                                    "ui.panel.lovelace.editor.edit_card.delete",
                            )}
                            .path=${mdiDelete}
                            @click=${this._handleDeleteCard}></ha-icon-button>
                </div>

                <energy-overview-entity-editor
                        .hass=${this.hass}
                        .config=${this._config.entities[selected]}
                        .lovelace=${this.lovelace}
                        @config-changed=${this._handleConfigChanged}
                        @GUImode-changed=${this._handleGUIModeChanged}>
                </energy-overview-entity-editor>
            </div>
        `;
    }
}

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
    type: CARD_NAME,
    name: NAME,
    description: "Card to displays energy usage details of one or multiple entities.",
});
