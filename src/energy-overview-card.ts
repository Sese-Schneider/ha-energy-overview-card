// noinspection JSUnusedGlobalSymbols

import {css, CSSResultGroup, html, LitElement, TemplateResult} from "lit";
import {customElement, property, state} from "lit/decorators";
import {unsafeHTML} from 'lit/directives/unsafe-html.js';
import {HomeAssistant} from "custom-card-helpers";
import {version} from "../package.json";
import {EnergyOverviewConfig, EnergyOverviewEntityUI} from "./types";
import {clamp, intersperse} from "./util";
import {
  CARD_EDITOR_NAME,
  CARD_NAME,
  NAME,
  PERCENTAGE,
  UnitOfElectricCurrent,
  UnitOfElectricPotential,
  UnitOfFrequency,
  UnitOfPower,
} from "./const";

@customElement(CARD_NAME)
export class EnergyOverviewCard extends LitElement {
  @property() public hass?: HomeAssistant;

  @state() private _config?: EnergyOverviewConfig;

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
        width: 12px;
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

  public static getStubConfig(): Record<string, unknown> {
    return {
      type: `custom:${CARD_NAME}`,
    };
  }

  public static async getConfigElement() {
    await import('./energy-overview-card-editor');
    return window.document.createElement(CARD_EDITOR_NAME);
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

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }
    const {states} = this.hass;

    const entities: Array<EnergyOverviewEntityUI> = [];
    this._config.entities.forEach((entity) => {
      entities.push({
        power: states[entity.power].state,
        power_unit: this._extractUnit(entity.power, UnitOfPower.WATT),
        current: entity.current ? states[entity.current].state : undefined,
        current_unit: this._extractUnit(entity.current, UnitOfElectricCurrent.AMPERE),
        voltage: entity.voltage ? states[entity.voltage].state : undefined,
        voltage_unit: this._extractUnit(entity.voltage, UnitOfElectricPotential.VOLT),
        frequency: entity.frequency ? states[entity.frequency].state : undefined,
        frequency_unit: this._extractUnit(entity.frequency, UnitOfFrequency.HERTZ),
        power_factor: entity.power_factor ? states[entity.power_factor].state : undefined,
        power_factor_unit: this._extractUnit(entity.power_factor, ''),
        color: entity.color ? entity.color : 'var(--energy-grid-consumption-color)',
        label_trailing: entity.label_trailing ? entity.label_trailing : '',
        label_leading: entity.label_leading ? entity.label_leading : '',
        icon_trailing: entity.icon_trailing ? entity.icon_trailing : 'mdi:home-lightning-bolt',
        icon_leading: entity.icon_leading ? entity.icon_leading : 'mdi:transmission-tower',
        animation: entity.animation ?? this._config?.animation,
      });
    });

    return html`
		<ha-card>
			${entities.map((entity, i) => {
				/* Power calculation */
				let power: number;
				switch (entity.power_unit) {
					case UnitOfPower.KILO_WATT:
						power = 1000 * parseFloat(entity.power);
						break;
					case UnitOfPower.BTU_PER_HOUR:
						power = 0.29307107 * parseFloat(entity.power);
						break;
					case UnitOfPower.WATT:
					default:
						power = parseFloat(entity.power);
						break;
				}

				/* Power factor calculation */
				const powerFactor = entity.power_factor ? (() => {
					const pf = parseFloat(entity.power_factor);
					if (entity.power_factor_unit === PERCENTAGE) return pf;
					// power factor is realistically never at 1%, we can safely assume it's a percentage
					if (pf >= -1 && pf <= 1) return pf * 100;
					return pf;
				})() : undefined;

				/* Animation */
				const {animation} = entity;
				const animMin = animation?.min_duration ? animation.min_duration : 1;
				const animMax = animation?.max_duration ? animation.max_duration : 10;
				const animPower = animation?.power ? animation.power : 1000;
				// a linear function which is max at x=0 and min at x=power is defined by:
				// f(x) = (-(max-min)/power) * x + max
				const x = power;
				const isNegative = x < 0;
				const y = (-(animMax - animMin) / animPower) * Math.abs(x) + animMax;
				let animationSpeed: number;
				animationSpeed = clamp(y, animMin, animMax);
				if (animationSpeed === animMax) animationSpeed = 0;

				return html`
					<!--suppress CssUnresolvedCustomProperty -->
					<div class="entity entity-${i}"
					     style="--energy-line-color: ${entity.color};">
						<div class="metadata">
							${entity.current || entity.voltage || entity.frequency ? html`
									<div class="metadata-left">
										${unsafeHTML((() => {
											const elements: Array<String> = [];
											if (entity.voltage) {
												elements.push(`<span class="secondary voltage">${entity.voltage}</span>&nbsp;<span class="secondary voltage-unit">${entity.voltage_unit}</span>`);
											}
											if (entity.current) {
												elements.push(`<span class="secondary current">${entity.current}</span>&nbsp;<span class="secondary current-unit">${entity.current_unit}</span>`);
											}
											if (entity.frequency) {
												elements.push(`<span class="secondary frequency">${entity.frequency}</span>&nbsp;<span class="secondary frequency-unit">${entity.frequency_unit}</span>`);
											}

											return intersperse(
												elements,
												`<div class="divider"></div>`,
											);
										})().join(''))}
									</div>`
								: ``}
							<div class="metadata-center">
								<span class="secondary power">${entity.power}</span>&nbsp;<span
								class="secondary power-unit">${entity.power_unit}</span>
							</div>
							${powerFactor ? html`
								<div class="metadata-right">
									<span class="secondary power-factor">${Math.round(powerFactor)}</span>&nbsp;<span
									class="secondary power-factor-unit">${PERCENTAGE}</span></div>` : ``}
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

  private _extractUnit(entity: string | undefined, fallback: string) {
    return entity ? this.hass!.states[entity].attributes.unit_of_measurement ?? fallback : fallback;
  }
}

// eslint-disable-next-line no-console
console.info(
  `%cENERGY-OVERVIEW-CARD ${version} IS INSTALLED`,
  "color: green; font-weight: bold",
  "",
);
