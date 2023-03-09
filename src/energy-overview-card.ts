// noinspection JSUnusedGlobalSymbols

import {css, CSSResultGroup, html, LitElement, nothing, TemplateResult} from "lit";
import {customElement, property, state} from "lit/decorators";
import {unsafeHTML} from 'lit/directives/unsafe-html.js';
import {HomeAssistant} from "custom-card-helpers";
import {version} from "../package.json";
import {EnergyOverviewConfig, EnergyOverviewEntityState, EnergyOverviewEntityUI} from "./types";
import {clamp, intersperse} from "./helper/util";
import {formatNumber, getNumberFormatOptions} from "./helper/format-number";
import {
  CARD_EDITOR_NAME,
  CARD_NAME,
  ICON_LEADING_DEFAULT,
  ICON_TRAILING_DEFAULT,
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
      entities: [{}],
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

    this._config = config;
  }

  protected render(): TemplateResult | symbol {
    if (!this._config || !this.hass) {
      return nothing;
    }

    const entities: Array<EnergyOverviewEntityUI> = [];
    this._config.entities.forEach((entity) => {
      entities.push({
        power: this._getState(entity.power, UnitOfPower.WATT, '0')!,
        current: this._getState(entity.current, UnitOfElectricCurrent.AMPERE),
        voltage: this._getState(entity.voltage, UnitOfElectricPotential.VOLT),
        frequency: this._getState(entity.frequency, UnitOfFrequency.HERTZ),
        power_factor: this._getState(entity.power_factor, ''),
        name: entity.name ? entity.name : '',
        color: entity.color ? entity.color : 'var(--energy-grid-consumption-color)',
        label_trailing: entity.label_trailing ? entity.label_trailing : '',
        label_leading: entity.label_leading ? entity.label_leading : '',
        icon_trailing: entity.icon_trailing ? entity.icon_trailing : ICON_TRAILING_DEFAULT,
        icon_leading: entity.icon_leading ? entity.icon_leading : ICON_LEADING_DEFAULT,
        animation: {...this._config?.animation, ...entity.animation}, // only overwrite set fields
      });
    });

    if (this._config.order_by) {
      const field = this._config.order_by;
      entities.sort((e1, e2) => {
        const a = e1[field] ? parseFloat(e1[field]) : 0;
        const b = e2[field] ? parseFloat(e2[field]) : 0;
        return b - a;
      });
    }

    return html`
      <ha-card>
        ${entities.map((entity, i) => {
          /* Power calculation */
          const configPower = entity.power.value!;
          let powerValue: number;
          switch (entity.power.unit) {
            case UnitOfPower.KILO_WATT:
              powerValue = 1000 * configPower;
              break;
            case UnitOfPower.BTU_PER_HOUR:
              powerValue = 0.29307107 * configPower;
              break;
            case UnitOfPower.WATT:
            default:
              powerValue = configPower;
              break;
          }

          /* Power factor calculation */
          let powerFactorDisplay: string | undefined;
          if (entity.power_factor) {
            const pf = entity.power_factor.value;
            // power factor is realistically never at 1%, we can safely assume it's a percentage
            if ((pf < -1 || pf > 1) || entity.power_factor.unit === PERCENTAGE) {
              powerFactorDisplay = entity.power_factor.display;
            } else {
              // subtract 2 because of the multiplication by 100
              let precision = (entity.power_factor.precision ?? 0) - 2;
              // default to 0 precision in case of negative values
              precision = precision >= 0 ? precision : 0;
              powerFactorDisplay = formatNumber(
                pf * 100,
                this.hass!.locale,
                {maximumFractionDigits: precision, minimumFractionDigits: precision},
              );
            }
          }

          /* Animation */
          const {animation} = entity;
          const animMin = animation?.min_duration ? animation.min_duration : 1;
          const animMax = animation?.max_duration ? animation.max_duration : 10;
          const animPower = animation?.power ? animation.power : 1000;
          // a linear function which is max at x=0 and min at x=power is defined by:
          // f(x) = (-(max-min)/power) * x + max
          const x = powerValue;
          const y = (-(animMax - animMin) / animPower) * Math.abs(x) + animMax;
          let animationSpeed: number;
          animationSpeed = clamp(y, animMin, animMax);
          if (animationSpeed === animMax) animationSpeed = 0;

          // Invert for animation.inverted XOR below 0
          const inverted = animationSpeed > 0 // do not invert animation stop
            ? (animation?.inverted ?? false) !== (x < 0)
            : false;

          return html`
            <!--suppress CssUnresolvedCustomProperty -->
            <div class="entity entity-${i}"
                 style="--energy-line-color: ${entity.color};">
              ${entity.name ? html`<span class="primary name">${entity.name}</span>` : ''}
              <div class="metadata">
                ${entity.current || entity.voltage || entity.frequency ? html`
                    <div class="metadata-left">
                      ${unsafeHTML((() => {
                        const elements: Array<String> = [];
                        if (entity.voltage) {
                          elements.push(`<span class="secondary voltage">${entity.voltage.display}</span>&nbsp;<span class="secondary voltage-unit">${entity.voltage.unit}</span>`);
                        }
                        if (entity.current) {
                          elements.push(`<span class="secondary current">${entity.current.display}</span>&nbsp;<span class="secondary current-unit">${entity.current.unit}</span>`);
                        }
                        if (entity.frequency) {
                          elements.push(`<span class="secondary frequency">${entity.frequency.display}</span>&nbsp;<span class="secondary frequency-unit">${entity.frequency.unit}</span>`);
                        }

                        return intersperse(
                          elements,
                          `<div class="divider"></div>`,
                        );
                      })().join(''))}
                    </div>`
                  : ``}
                <div class="metadata-center">
                  <span class="secondary power">${entity.power.display}</span>&nbsp;<span
                  class="secondary power-unit">${entity.power.unit}</span>
                </div>
                ${powerFactorDisplay ? html`
                  <div class="metadata-right">
                    <span class="secondary power-factor">${powerFactorDisplay}</span>&nbsp;<span
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
                      <animateMotion
                        calcMode="linear"
                        dur="${animationSpeed}s"
                        keyPoints="${inverted ? `1;0` : `0;1`}"
                        keyTimes="0;1"
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

  private _getState(
    entity: string | undefined,
    fallbackUnit: string,
    fallbackValue?: string,
  ) {
    const stateObj = entity ? this.hass!.states[entity] : undefined;
    if (!stateObj && !fallbackValue) return undefined;
    return <EnergyOverviewEntityState>{
      value: parseFloat(stateObj ? stateObj.state : fallbackValue!),
      unit: this._extractUnit(entity, fallbackUnit),
      display: this._formatNumber(entity, fallbackValue),
      precision: entity ? (this.hass as any).entities[entity]?.display_precision : undefined,
    };
  }

  private _extractUnit(entity: string | undefined, fallback: string) {
    return entity ? this.hass!.states[entity].attributes.unit_of_measurement ?? fallback : fallback;
  }

  private _formatNumber(entity: string | undefined, fallback?: string) {
    const stateObj = entity ? this.hass!.states[entity] : undefined;
    return stateObj
      ? formatNumber(
        stateObj.state,
        this.hass!.locale,
        getNumberFormatOptions(
          stateObj,
          (this.hass as any).entities[entity!],
        ),
      )
      : fallback;
  }
}

// eslint-disable-next-line no-console
console.info(
  `%c${CARD_NAME} (${version}) is installed`,
  "color: #33b4ff; font-weight: bold",
  "",
);
