import { css, html, svg, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import type { HomeAssistant } from './ha-types';
import { version, repository } from '../package.json';
import type { EnergyOverviewConfig, EnergyOverviewEntityState, EnergyOverviewEntityUI } from './types';
import { animationFor, powerFactorDisplay, powerInWatts, readMeasurement } from './helper/measurement';
import { CARD_EDITOR_NAME, CARD_NAME, NAME, ICON_LEADING_DEFAULT, ICON_TRAILING_DEFAULT } from './const';

@customElement(CARD_NAME)
export class EnergyOverviewCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config?: EnergyOverviewConfig;

  static readonly styles = css`
    :host { display: block; min-width: 0; container-type: inline-size; }
    ha-card { display: block; overflow: hidden; }
    .primary { font-weight: bold; font-size: 14px; color: var(--primary-text-color); }
    .secondary { font-weight: bolder; font-size: 12px; color: var(--secondary-text-color); }
    .entity { max-width: 492px; padding: 8px; margin: 0 auto; min-width: 0; }
    .name { display: block; overflow-wrap: anywhere; }
    .metadata { display: flex; flex-wrap: wrap; justify-content: space-evenly; align-items: center; gap: 4px 12px; margin-bottom: 2px; }
    .metadata-left { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 12px; min-width: 0; }
    .measurement, .metadata-center, .metadata-right { font-variant-numeric: tabular-nums; overflow-wrap: anywhere; min-width: 0; }
    .main { min-height: 24px; display: flex; align-items: center; min-width: 0; }
    .label { max-width: 25%; min-width: 0; overflow-wrap: anywhere; }
    .label-leading { margin-right: 4px; }
    .label-trailing { margin-left: 4px; }
    .icon { flex: 0 0 24px; width: 24px; height: 24px; }
    .line { flex: 1 1 0; min-width: 0; height: 15px; margin: 0 8px; }
    .line svg { display: block; width: 100%; height: 15px; overflow: visible; }
    .line path { stroke-width: 1; fill: none; stroke: var(--energy-line-color); }
    .line .flow-dot { stroke-width: 6; stroke-linecap: round; animation: energy-flow var(--flow-duration) linear infinite; animation-direction: var(--flow-direction); }
    /* SVG user units track the viewBox, independent of the rendered card width. */
    @keyframes energy-flow { from { transform: translateX(0px); } to { transform: translateX(100px); } }
    @container (max-width: 360px) {
      .main { display: grid; grid-template-columns: 24px minmax(0, 1fr) 24px; gap: 4px; }
      .label { max-width: none; margin: 0; }
      .label:empty { display: none; }
      .label-leading { grid-column: 1 / 3; grid-row: 1; }
      .label-trailing { grid-column: 2 / 4; grid-row: 3; text-align: right; }
      .icon-leading { grid-column: 1; grid-row: 2; }
      .line { grid-column: 2; grid-row: 2; margin: 0; }
      .icon-trailing { grid-column: 3; grid-row: 2; }
    }
    @media (prefers-reduced-motion: reduce) { .line .flow-dot { display: none; animation: none; } }
  `;

  public static getStubConfig(): Record<string, unknown> {
    return { type: `custom:${CARD_NAME}`, entities: [{ power: '' }] };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    await import('./energy-overview-card-editor');
    return document.createElement(CARD_EDITOR_NAME);
  }

  public setConfig(config: EnergyOverviewConfig): void {
    if (!config || !Array.isArray(config.entities) || config.entities.some((entity) => !entity || typeof entity !== 'object' || Array.isArray(entity))) {
      throw new Error('Entities must be a list of entity configurations.');
    }
    this._config = config;
  }

  public getCardSize(): number {
    const rows = this._config?.entities.length ?? 0;
    const named = this._config?.entities.filter((entity) => entity.name).length ?? 0;
    return Math.max(1, Math.ceil((rows * 56 + named * 20 + (this._config?.title ? 56 : 0)) / 50));
  }

  public getGridOptions(): { columns: number; min_columns: number; rows: 'auto' } {
    // Auto rows allow metadata and long labels to wrap without clipping.
    return { columns: 12, min_columns: 6, rows: 'auto' };
  }

  protected render() {
    if (!this._config || !this.hass) return nothing;
    const entities: Array<EnergyOverviewEntityUI & { key: number }> = this._config.entities.map((entity, key) => ({
      ...entity,
      key,
      power: readMeasurement(this.hass!, entity.power, 'W', true)!,
      current: readMeasurement(this.hass!, entity.current, 'A'),
      voltage: readMeasurement(this.hass!, entity.voltage, 'V'),
      frequency: readMeasurement(this.hass!, entity.frequency, 'Hz'),
      power_factor: readMeasurement(this.hass!, entity.power_factor, ''),
      animation: { ...this._config?.animation, ...entity.animation },
    }));
    const field = this._config.order_by;
    const sortable = ['power', 'current', 'voltage', 'frequency', 'power_factor'] as const;
    const sortField = sortable.find((name) => name === field);
    if (sortField) {
      const sortValue = (entity: EnergyOverviewEntityUI) => sortField === 'power'
        ? powerInWatts(entity.power) ?? 0
        : entity[sortField]?.value ?? 0;
      entities.sort((a, b) => sortValue(b) - sortValue(a));
    }
    return html`
      <ha-card .header=${this._config.title}>
        ${!entities.length ? html`<div class="entity">No entities configured.</div>` : nothing}
        ${repeat(entities, (entity) => entity.key, (entity) => this._renderEntity(entity))}
      </ha-card>
    `;
  }

  private _renderEntity(entity: EnergyOverviewEntityUI & { key: number }) {
    const animation = animationFor(entity.power, entity.animation);
    const pf = entity.power_factor;
    const pfUnit = pf?.value === undefined ? '' : '%';
    const className = `entity entity-${entity.key}`;
    const colorStyle = `--energy-line-color: ${entity.color || 'var(--energy-grid-consumption-color, var(--primary-color, #03a9f4))'};`;
    return html`
      <div class=${className} style=${colorStyle}>
        ${entity.name ? html`<span class="primary name">${entity.name}</span>` : nothing}
        <div class="metadata">
          ${entity.current || entity.voltage || entity.frequency ? html`
            <div class="metadata-left">
              ${this._measurement(entity.voltage, 'voltage')}
              ${this._measurement(entity.current, 'current')}
              ${this._measurement(entity.frequency, 'frequency')}
            </div>` : nothing}
          <div class="metadata-center">
            <span class="secondary power">${entity.power.display}</span>&nbsp;<span class="secondary power-unit">${entity.power.unit}</span>
          </div>
          ${pf ? html`<div class="metadata-right">
            <span class="secondary power-factor">${powerFactorDisplay(pf, this.hass!)}</span>&nbsp;<span class="secondary power-factor-unit">${pfUnit}</span>
          </div>` : nothing}
        </div>
        <div class="main">
          <div class="primary label label-leading">${entity.label_leading || ''}</div>
          <div class="icon icon-leading"><ha-icon .icon=${entity.icon_leading || ICON_LEADING_DEFAULT}></ha-icon></div>
          <div class="line">
            <svg preserveAspectRatio="none" viewBox="0 0 100 10" aria-hidden="true">
              <path class="grid" d="M0,5 H100" vector-effect="non-scaling-stroke"></path>
              ${this._motion(animation)}
            </svg>
          </div>
          <div class="icon icon-trailing"><ha-icon .icon=${entity.icon_trailing || ICON_TRAILING_DEFAULT}></ha-icon></div>
          <div class="primary label label-trailing">${entity.label_trailing || ''}</div>
        </div>
      </div>
    `;
  }

  /**
   * Returns the flow dot with a cycle duration in seconds and the supplied direction.
   * An undefined duration returns Lit's `nothing`; an inverted direction reverses the dot.
   * The card hides the dot when reduced motion is preferred.
   */
  private _motion(animation: ReturnType<typeof animationFor>) {
    if (animation.duration === undefined) return nothing;
    const duration = `${animation.duration}s`;
    const direction = animation.inverted ? 'reverse' : 'normal';
    const motionStyle = `--flow-duration: ${duration}; --flow-direction: ${direction};`;
    // A round-capped zero-length stroke stays circular in screen space even when
    // preserveAspectRatio="none" stretches the SVG's user coordinates.
    return svg`<path class="flow-dot" d="M0,5 h0" vector-effect="non-scaling-stroke"
      style=${motionStyle}></path>`;
  }

  private _measurement(value: EnergyOverviewEntityState | undefined, name: string) {
    if (!value) return nothing;
    const valueClass = `secondary ${name}`;
    const unitClass = `secondary ${name}-unit`;
    return html`<div class="measurement"><span class=${valueClass}>${value.display}</span>&nbsp;<span class=${unitClass}>${value.unit}</span></div>`;
  }
}

window.customCards ??= [];
if (!window.customCards.some((card) => card.type === CARD_NAME)) window.customCards.push({
  type: CARD_NAME, name: NAME, preview: true, documentationURL: repository,
  description: 'Live power and electrical measurements with animated flow.',
});
console.info(`${CARD_NAME} (${version}) is installed`);
