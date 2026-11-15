import type { EnergyOverviewEntity, EnergyOverviewEntityState } from '../types';
import { powerInWatts } from './measurement';

export const DEFAULT_LINE_COLOR = 'var(--energy-grid-consumption-color, var(--primary-color, #03a9f4))';

export function lineColor(power: EnergyOverviewEntityState, config: Pick<EnergyOverviewEntity, 'color' | 'color_thresholds'>): string {
  let color = config.color || DEFAULT_LINE_COLOR;
  const watts = powerInWatts(power);
  if (watts === undefined || !Number.isFinite(watts) || !Array.isArray(config.color_thresholds)) return color;
  let minimum = -1;
  for (const threshold of config.color_thresholds) {
    if (!threshold || typeof threshold.value !== 'number' || !Number.isFinite(threshold.value) || threshold.value < 0 ||
      typeof threshold.color !== 'string' || !threshold.color.trim() || !CSS.supports('color', threshold.color)) continue;
    if (threshold.value <= Math.abs(watts) && threshold.value >= minimum) {
      minimum = threshold.value;
      color = threshold.color;
    }
  }
  return color;
}
