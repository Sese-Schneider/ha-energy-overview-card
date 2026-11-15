import type { EnergyOverviewEntity, EnergyOverviewEntityState } from '../types';
import { powerInWatts } from './measurement';
import { computeCssColor, computeCssVariableName } from '../vendor/home-assistant/compute-color';

export const DEFAULT_LINE_COLOR = 'var(--energy-grid-consumption-color, var(--primary-color, #03a9f4))';

/** Resolve palette names at render time; keep saved strings unchanged. */
export function uiColorValue(color: string | undefined): string | undefined {
  if (typeof color !== 'string' || !color.trim()) return undefined;
  const name = color.trim();
  const computed = computeCssColor(name);
  if (computed !== name) {
    // Literal CSS colors remain usable if a theme variable is absent.
    const fallback = CSS.supports('color', name) ? name : DEFAULT_LINE_COLOR;
    return `var(${computeCssVariableName(name)}, ${fallback})`;
  }
  return CSS.supports('color', color) ? color : undefined;
}

export function lineColor(power: EnergyOverviewEntityState, config: Pick<EnergyOverviewEntity, 'color' | 'color_thresholds'>): string {
  let color = uiColorValue(config.color) ?? DEFAULT_LINE_COLOR;
  const watts = powerInWatts(power);
  if (watts === undefined || !Number.isFinite(watts) || !Array.isArray(config.color_thresholds)) return color;
  let minimum = -1;
  for (const threshold of config.color_thresholds) {
    if (!threshold || typeof threshold.value !== 'number' || !Number.isFinite(threshold.value) || threshold.value < 0 ||
      typeof threshold.color !== 'string') continue;
    const resolved = uiColorValue(threshold.color);
    if (!resolved) continue;
    if (threshold.value <= Math.abs(watts) && threshold.value >= minimum) {
      minimum = threshold.value;
      color = resolved;
    }
  }
  return color;
}
