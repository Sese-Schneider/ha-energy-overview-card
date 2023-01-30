import {css, CSSResultGroup, html, LitElement, TemplateResult} from "lit";
import {customElement, property} from "lit/decorators";
import {HomeAssistant} from "custom-card-helpers";
import {EnergyOverviewConfig, EnergyOverviewEntity} from "./types";

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
      });
    });

    return html`
		<ha-card .header="Energy Overview">
			${entities.map((entity) => {
				console.log(entity);
				const power = parseInt(entity.power, 10);
				const animationSpeed = -0.004 * Math.min(power, 1000) + 5;

				return html`
					<!--suppress CssUnresolvedCustomProperty -->
					<div style="--energy-line-color: ${entity.color}; max-width: 492px; padding: 8px">
						<div
							style="display: flex; justify-content: space-evenly; align-items: center; margin-bottom: -8px;">
							${entity.current || entity.voltage ? html`
									<div style="display: flex; justify-content: center; align-items: center">
										${entity.voltage ? html`<span class="secondary">${entity.voltage}V</span>` : ``}
										${entity.current && entity.voltage ? html`<div style="width: 8px"></div>` : ``}
										${entity.current ? html`<span class="secondary">${entity.current}A</span>` : ``}
									</div>`
								: ``}
							<span class="secondary">${entity.power}W</span>
							${entity.power_factor ? html`<span class="secondary">${Math.round(parseFloat(entity.power_factor))}%</span>` : ``}
						</div>
						<div style="height: 24px; display: flex; align-items: center; justify-content: center">
							<div class="primary" style="margin-right: 4px">${entity.label_leading}</div>
							<div style="width: 24px; height: 24px;">
								<ha-icon icon="${entity.icon_leading}"></ha-icon>
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
										<animateMotion calcMode="linear" dur="${animationSpeed}s"
										               repeatCount="indefinite">
											<mpath xlink:href="#grid"></mpath>
										</animateMotion>
									</circle>
								</svg>
							</div>
							<div style="width: 24px; height: 24px;">
								<ha-icon icon="${entity.icon_trailing}"></ha-icon>
							</div>
							<div class="primary" style="margin-left: 4px">${entity.label_trailing}</div>
						</div>
					</div>`;
			})}
		</ha-card>
    `;
  }
}
