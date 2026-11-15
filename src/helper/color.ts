import type { EnergyOverviewEntity, EnergyOverviewEntityState } from '../types';
import { powerInWatts } from './measurement';

export const DEFAULT_LINE_COLOR = 'var(--energy-grid-consumption-color, var(--primary-color, #03a9f4))';

/** Native color inputs represent opaque sRGB only; never rewrite custom CSS. */
export function colorPickerValue(color: string | undefined): string | undefined {
  if (typeof color !== 'string' || !CSS.supports('color', color) ||
    /\b(?:var|env)\s*\(|^(?:currentcolor|inherit|initial|unset|revert(?:-layer)?)$/i.test(color.trim())) return undefined;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const context = canvas.getContext('2d');
  if (!context) return undefined;
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
  if (alpha !== 255) return undefined;
  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

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
