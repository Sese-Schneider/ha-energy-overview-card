import type { EnergyOverviewEntity, EnergyOverviewEntityState } from '../types';
import { powerInWatts } from './measurement';

export const DEFAULT_LINE_COLOR = 'var(--energy-grid-consumption-color, var(--primary-color, #03a9f4))';

// HA's ui_color palette and its additional YAML-only theme color aliases.
const THEME_COLORS = new Set([
  'primary', 'accent', 'red', 'pink', 'purple', 'deep-purple', 'indigo', 'blue',
  'light-blue', 'cyan', 'teal', 'green', 'light-green', 'lime', 'yellow', 'amber',
  'orange', 'deep-orange', 'brown', 'light-grey', 'grey', 'dark-grey', 'blue-grey',
  'black', 'white', 'primary-text', 'secondary-text', 'disabled',
]);

/** Resolve palette names at render time; keep saved strings unchanged. */
export function uiColorValue(color: string | undefined): string | undefined {
  if (typeof color !== 'string' || !color.trim()) return undefined;
  const name = color.trim();
  if (THEME_COLORS.has(name)) {
    // Literal CSS colors remain usable if a theme variable is absent.
    const fallback = CSS.supports('color', name) ? name : DEFAULT_LINE_COLOR;
    return `var(--${name}-color, ${fallback})`;
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
