/* eslint-disable no-tabs,indent */
import {
 css, CSSResultGroup, html, LitElement, TemplateResult
} from "lit";
import { customElement, property } from "lit/decorators";
import { HomeAssistant } from "custom-card-helpers";

import { EnergyOverviewConfig } from "./types";

@customElement("energy-overview-card")
class EnergyOverviewCard extends LitElement {
  @property() public hass?: HomeAssistant;

  @property() private _config?: EnergyOverviewConfig;

  static get styles(): CSSResultGroup {
    return css`
      .primary {
        font-weight: bold;
        font-size: 14px;
        color: var(--primary-text-color);
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
      }

      .secondary {
        font-weight: bolder;
        font-size: 12px;
        color: var(--secondary-text-color);
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
      }
    `;
  }

  public setConfig(config: EnergyOverviewConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }

    this._config = config;
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this.hass) {
      return html``;
    }

    const data = [
      {
        name: 'A',
        color: '#488fc2',
        current: this.hass.states[this._config.a_current].state,
        power_factor: this.hass.states[this._config.a_power_factor].state,
        power: this.hass.states[this._config.a_power].state,
        voltage: this.hass.states[this._config.a_voltage].state,
      },
      {
        name: 'B',
        color: '#7dbff5',
        current: this.hass.states[this._config.b_current].state,
        power_factor: this.hass.states[this._config.b_power_factor].state,
        power: this.hass.states[this._config.b_power].state,
        voltage: this.hass.states[this._config.b_voltage].state,
      },
      {
        name: 'C',
        color: '#b1f2ff',
        current: this.hass.states[this._config.c_current].state,
        power_factor: this.hass.states[this._config.c_power_factor].state,
        power: this.hass.states[this._config.c_power].state,
        voltage: this.hass.states[this._config.c_voltage].state,
      }
    ];

    return html`
		<ha-card .header="Energy Overview">
			${data.map((point) => {
        const power = parseInt(point.power, 10);
        const animationSpeed = -0.004 * Math.min(power, 1000) + 5;
				return html`
					<div style="--energy-line-color: ${point.color}; max-width: 492px; padding: 8px">
						<div
							style="display: flex; justify-content: space-evenly; align-items: center; margin-bottom: -8px;">
							<div style="display: flex; justify-content: center; align-items: center">
								<span class="secondary">${point.voltage}V</span>
								<div style="width: 8px"></div>
								<span class="secondary">${point.current}A</span>
							</div>
							<span class="secondary">${point.power}W</span>
							<span class="secondary">${Math.round(parseFloat(point.power_factor))}%</span>
						</div>
						<div style="height: 24px; display: flex; align-items: center; justify-content: center">
							<div style="width: 24px; height: 24px;">
								<ha-icon icon="mdi:transmission-tower"></ha-icon>
							</div>
							<div class="lines" style="flex: 1; height: 10px; box-sizing: border-box; margin: 0 8px">
								<svg preserveAspectRatio="xMaxYMid slice"
								     style="width: 100%; height: 15px" viewBox="0 0 100 10"
								     xmlns="http://www.w3.org/2000/svg">
									<path class="grid" d="M0,5 H100" id="grid"
									      style="stroke-width: 1; fill: none; stroke: var(--energy-line-color);"
									      vector-effect="non-scaling-stroke"></path>
									<circle class="grid" r="1"
									        style="stroke-width: 4; stroke: var(--energy-line-color); fill: var(--energy-line-color);"
									        vector-effect="non-scaling-stroke">
										<animateMotion calcMode="linear" dur="${animationSpeed}s" repeatCount="indefinite">
											<mpath xlink:href="#grid"></mpath>
										</animateMotion>
									</circle>
								</svg>
							</div>
							<div style="width: 24px; height: 24px;">
								<ha-icon icon="mdi:home-lightning-bolt"></ha-icon>
							</div>
							<div class="primary" style="margin-left: 4px">${point.name}</div>
						</div>
					</div>`;
			})}
		</ha-card>
    `;
  }
}
