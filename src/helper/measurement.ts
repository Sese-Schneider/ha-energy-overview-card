import type { HomeAssistant } from '../ha-types';
import type { EnergyOverviewAnimation, EnergyOverviewEntityState } from '../types';
import { UnitOfPower } from '../const';
import { formatNumber, getNumberFormatOptions } from './format-number';
import { clamp } from './util';

export function readMeasurement(
  hass: HomeAssistant, entityId: string | undefined, fallbackUnit: string, required = false,
): EnergyOverviewEntityState | undefined {
  if (!entityId) return required ? { display: 'Not configured', unit: '', value: undefined } : undefined;
  const entity = hass.states[entityId];
  if (!entity) return { display: 'Not found', unit: '', value: undefined };
  const numeric = entity.state.trim() === '' ? undefined : Number(entity.state);
  const value = numeric !== undefined && Number.isFinite(numeric) ? numeric : undefined;
  const options = getNumberFormatOptions(entity, hass.entities?.[entityId]);
  if (value === undefined) {
    const key = `state.default.${entity.state}`;
    const localized = hass.localize(key);
    return { value, unit: '', display: localized && localized !== key ? localized : entity.state || 'Unknown' };
  }
  return {
    value,
    unit: entity.attributes.unit_of_measurement ?? fallbackUnit,
    display: formatNumber(entity.state, hass.locale, options),
    precision: options?.maximumFractionDigits,
  };
}

function positive(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

export function animationFor(power: EnergyOverviewEntityState, config?: EnergyOverviewAnimation): {
  duration: number | undefined; inverted: boolean;
} {
  const scales: Record<string, number> = { [UnitOfPower.MILLIWATT]: 0.001, [UnitOfPower.KILO_WATT]: 1000, [UnitOfPower.MEGA_WATT]: 1000000, [UnitOfPower.BTU_PER_HOUR]: 0.29307107 };
  const scale = scales[power.unit] ?? 1;
  const watts = power.value === undefined ? undefined : power.value * scale;
  if (watts === undefined || !Number.isFinite(watts) || watts === 0) return { duration: undefined, inverted: false };
  // SMIL clock values cannot use the scientific notation JS emits for extremes.
  const min = clamp(positive(config?.min_duration, 1), 0.001, 86400);
  const max = Math.max(min, clamp(positive(config?.max_duration, 10), 0.001, 86400));
  const threshold = positive(config?.power, 1000);
  // Divide before multiplying to avoid overflow for finite high power readings.
  const ratio = Math.min(Math.abs(watts) / threshold, 1);
  const duration = clamp(max - (max - min) * ratio, min, max);
  return { duration, inverted: (config?.inverted === true) !== (watts < 0) };
}

export function powerFactorDisplay(powerFactor: EnergyOverviewEntityState, hass: HomeAssistant): string {
  const value = powerFactor.value;
  if (value === undefined || powerFactor.unit === '%' || Math.abs(value) > 1) return powerFactor.display;
  const precision = Math.max(0, (powerFactor.precision ?? 0) - 2);
  return formatNumber(value * 100, hass.locale, { maximumFractionDigits: precision, minimumFractionDigits: precision });
}
