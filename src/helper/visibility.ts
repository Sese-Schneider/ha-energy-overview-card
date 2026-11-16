import { powerInWatts } from './measurement';
import type { EnergyOverviewEntity, EnergyOverviewEntityState } from '../types';

export function rowVisible(power: EnergyOverviewEntityState, config: Pick<EnergyOverviewEntity, 'hide_below' | 'hide_below_signed'>): boolean {
  const threshold = config.hide_below;
  if (typeof threshold !== 'number' || !Number.isFinite(threshold) || threshold < 0) return true;
  const watts = powerInWatts(power);
  // Never hide failures as though they were zero consumption.
  if (watts === undefined || !Number.isFinite(watts)) return true;
  const value = config.hide_below_signed === true ? watts : Math.abs(watts);
  // Allow conversion round-off without adding a fixed floor for tiny readings.
  const tolerance = 2 * Number.EPSILON * Math.max(Math.abs(value), threshold);
  return value >= threshold || threshold - value <= tolerance;
}
