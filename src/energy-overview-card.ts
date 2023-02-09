// noinspection JSUnusedGlobalSymbols

import {css, CSSResultGroup, html, LitElement, TemplateResult} from "lit";
import {customElement, property} from "lit/decorators";
import {HomeAssistant} from "custom-card-helpers";
import {EnergyOverviewConfig, EnergyOverviewEntity} from "./types";
import clamp from "./util";

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

      .entity {
        max-width: 492px;
        padding: 8px;
        margin: 0 auto;
      }

      .metadata {
        display: flex;
        justify-content: space-evenly;
        align-items: center;
        margin-bottom: -8px;
      }

      .metadata-left {
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .divider {
        width: 8px;
      }

      .main {
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .label-leading {
        margin-right: 4px;
      }

      .label-trailing {
        margin-left: 4px;
      }

      .icon {
        width: 24px;
        height: 24px;
      }

      .line {
        flex: 1;
        height: 10px;
        box-sizing: border-box;
        margin: 0 8px;
      }

      .line svg {
        width: 100%;
        height: 15px;
      }

      .line svg path {
        stroke-width: 1;
        fill: none;
        stroke: var(--energy-line-color);
      }

      .line svg circle {
        stroke-width: 4;
        stroke: var(--energy-line-color);
        fill: var(--energy-line-color);
      }
    `;
  }

  public setConfig(config: EnergyOverviewConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    if (!config.entities) throw new Error('At least one entity is required.');

    config.entities.forEach((entity) => {
      if (!entity.power) throw new Error('Power is required for each entity.');
    });

    this._config = config;
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this.hass) {
      return html``;
    }
    const {states} = this.hass;

    const entities: Array<EnergyOverviewEntity> = [];
    this._config.entities.forEach((entity) => {
      entities.push({
        power: states[entity.power].state,
        current: entity.current ? states[entity.current].state : undefined,
        voltage: entity.voltage ? states[entity.voltage].state : undefined,
        power_factor: entity.power_factor ? states[entity.power_factor].state : undefined,
        color: entity.color ? entity.color : 'var(--energy-grid-consumption-color)',
        label_trailing: entity.label_trailing ? entity.label_trailing : '',
        label_leading: entity.label_leading ? entity.label_leading : '',
        icon_trailing: entity.icon_trailing ? entity.icon_trailing : 'mdi:home-lightning-bolt',
        icon_leading: entity.icon_leading ? entity.icon_leading : 'mdi:transmission-tower',
        animation: entity.animation ?? this._config?.animation,
      });
    });

    return html`
		<ha-card .header="Energy Overview">
			${entities.map((entity, i) => {
				const {animation} = entity;
				const min = animation?.min_duration ? animation.min_duration : 1;
				const max = animation?.max_duration ? animation.max_duration : 10;
				const power = animation?.power ? animation.power : 1000;
				// a linear function which is max at x=0 and min at x=power is defined by:
				// f(x) = (-(max-min)/power) * x + max
				const x = parseInt(entity.power, 10);
				const isNegative = x < 0;
				const y = (-(max - min) / power) * Math.abs(x) + max;
				let animationSpeed: number;
				animationSpeed = clamp(y, min, max);
				if (animationSpeed === max) animationSpeed = 0;

				return html`
					<!--suppress CssUnresolvedCustomProperty -->
					<div class="entity entity-${i}"
					     style="--energy-line-color: ${entity.color};">
						<div class="metadata">
							${entity.current || entity.voltage ? html`
									<div class="metadata-left">
										${entity.voltage ? html`<span class="secondary voltage">${entity.voltage}</span>
										<span class="secondary voltage-unit">V</span>` : ``}
										${entity.current && entity.voltage ? html`
											<div class="divider"></div>` : ``}
										${entity.current ? html`<span class="secondary current">${entity.current}</span>
										<span class="secondary current-unit">A</span>` : ``}
									</div>`
								: ``}
							<div class="metadata-center">
								<span class="secondary power">${entity.power}</span>
								<span class="secondary power-unit">W</span>
							</div>
							${entity.power_factor ? html`
								<div class="metadata-right">
									<span
					  class="secondary power-factor">${Math.round(parseFloat(entity.power_factor))}</span>
									<span class="secondary power-factor-unit">%</span>
								</div>` : ``}
						</div>
						<div class="main">
							<div class="primary label label-leading">${entity.label_leading}</div>
							<div class="icon icon-leading">
								<ha-icon icon="${entity.icon_leading}"></ha-icon>
							</div>
							<div class="line">
								<svg overflow="visible" preserveAspectRatio="xMaxYMid slice"
								     viewBox="0 0 100 10" xmlns="http://www.w3.org/2000/svg">
									<path class="grid" d="M0,5 H100" id="grid"
									      vector-effect="non-scaling-stroke"></path>
									<circle class="grid" r="1"
									        vector-effect="non-scaling-stroke">
										<animateMotion keyTimes="0;1" keyPoints="${isNegative ? `1;0` : `0;1`}"
										               calcMode="linear" dur="${animationSpeed}s"
										               repeatCount="indefinite">
											<mpath xlink:href="#grid"></mpath>
										</animateMotion>
									</circle>
								</svg>
							</div>
							<div class="icon icon-trailing">
								<ha-icon icon="${entity.icon_trailing}"></ha-icon>
							</div>
							<div class="primary label label-trailing">${entity.label_trailing}</div>
						</div>
					</div>`;
			})}
		</ha-card>
    `;
  }
}
