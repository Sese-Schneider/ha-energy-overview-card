import type { EnergyOverviewEntity, EnergyOverviewEntityState } from '../types';
import { powerInWatts } from './measurement';
import { computeCssColor, computeCssVariableName } from '../vendor/home-assistant/compute-color';
import type { ColorHelpers } from '../ha-types';

export const DEFAULT_LINE_COLOR = 'var(--energy-grid-consumption-color, var(--primary-color, #03a9f4))';
export const VENDORED_COLOR_HELPERS: Readonly<ColorHelpers> = Object.freeze({ computeCssColor, computeCssVariableName });
export const COLOR_HELPERS_TIMEOUT_MS = 15000;
type HelperLoader = NonNullable<Window['loadCardHelpers']>;
const helperCache = new WeakMap<HelperLoader, Promise<ColorHelpers>>();

/** Cache a coherent native pair; failed loads may be retried by later callers. */
export function loadColorHelpers(loader = window.loadCardHelpers): Promise<ColorHelpers> {
  if (typeof loader !== 'function') return Promise.resolve(VENDORED_COLOR_HELPERS);
  const cached = helperCache.get(loader);
  if (cached) return cached;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('Color helpers timed out.')), COLOR_HELPERS_TIMEOUT_MS);
  });
  const loading = Promise.race([Promise.resolve().then(() => loader.call(window)), timeout]).then((helpers) => {
    const color = helpers?.computeCssColor;
    const variable = helpers?.computeCssVariableName;
    // Never combine native palette recognition with the older vendored mapping.
    return typeof color === 'function' && typeof variable === 'function'
      ? { computeCssColor: color.bind(helpers), computeCssVariableName: variable.bind(helpers) }
      : VENDORED_COLOR_HELPERS;
  }).catch(() => {
    helperCache.delete(loader);
    return VENDORED_COLOR_HELPERS;
  }).finally(() => clearTimeout(timer));
  helperCache.set(loader, loading);
  return loading;
}

/** Resolve palette names at render time; keep saved strings unchanged. */
export function uiColorValue(color: string | undefined, helpers: ColorHelpers = VENDORED_COLOR_HELPERS): string | undefined {
  if (typeof color !== 'string' || !color.trim()) return undefined;
  const name = color.trim();
  const computed = helpers.computeCssColor(name);
  if (computed !== name) {
    // Literal CSS colors remain usable if a theme variable is absent.
    const fallback = CSS.supports('color', name) ? name : DEFAULT_LINE_COLOR;
    return `var(${helpers.computeCssVariableName(name)}, ${fallback})`;
  }
  return CSS.supports('color', color) ? color : undefined;
}

export function lineColor(power: EnergyOverviewEntityState, config: Pick<EnergyOverviewEntity, 'color' | 'color_thresholds'>, helpers: ColorHelpers = VENDORED_COLOR_HELPERS): string {
  let color = uiColorValue(config.color, helpers) ?? DEFAULT_LINE_COLOR;
  const watts = powerInWatts(power);
  if (watts === undefined || !Number.isFinite(watts) || !Array.isArray(config.color_thresholds)) return color;
  let minimum = -1;
  for (const threshold of config.color_thresholds) {
    if (!threshold || typeof threshold.value !== 'number' || !Number.isFinite(threshold.value) || threshold.value < 0 ||
      typeof threshold.color !== 'string') continue;
    const resolved = uiColorValue(threshold.color, helpers);
    if (!resolved) continue;
    if (threshold.value <= Math.abs(watts) && threshold.value >= minimum) {
      minimum = threshold.value;
      color = resolved;
    }
  }
  return color;
}
