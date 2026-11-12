import { describe, expect, it } from 'vitest';
import { animationFor, powerFactorDisplay, readMeasurement } from '../src/helper/measurement';
import { formatNumber } from '../src/helper/format-number';
import type { HomeAssistant } from '../src/ha-types';

const hass: HomeAssistant = { states: {}, locale: { language: 'en', number_format: 'comma_decimal' }, localize: () => '' };
const reading = (value: number | undefined, unit = 'W') => ({ value, unit, display: String(value) });

describe('measurements and motion', () => {
  it('distinguishes absent optional sensors, unconfigured power and missing entities', () => {
    expect(readMeasurement(hass, undefined, 'V')).toBeUndefined();
    expect(readMeasurement(hass, undefined, 'W', true)?.display).toBe('Not configured');
    expect(readMeasurement(hass, 'sensor.missing', 'W', true)).toEqual({ value: undefined, display: 'Not found', unit: '' });
  });
  it.each(['unknown', 'unavailable', '', 'NaN', 'Infinity', '12 watts'])('does not animate %s', (state) => {
    const context = { ...hass, states: { 'sensor.power': { state, attributes: {} } } };
    const power = readMeasurement(context, 'sensor.power', 'W', true)!;
    expect(power.value).toBeUndefined();
    expect(animationFor(power).duration).toBeUndefined();
  });
  it('uses translated unavailable states and handles a missing entity registry', () => {
    const context = { ...hass, localize: () => 'Unavailable', states: { 'sensor.power': { state: 'unavailable', attributes: {} } } };
    expect(readMeasurement(context, 'sensor.power', 'W')?.display).toBe('Unavailable');
    context.states['sensor.power'].state = '1234.50';
    expect(readMeasurement(context, 'sensor.power', 'W')?.display).toBe('1,234.50');
  });
  it('honors precision, percentage and fractional power factor', () => {
    const context = { ...hass, entities: { 'sensor.pf': { display_precision: 4 } }, states: { 'sensor.pf': { state: '0.9567', attributes: {} } } };
    expect(powerFactorDisplay(readMeasurement(context, 'sensor.pf', '')!, context)).toBe('95.67');
    expect(powerFactorDisplay(reading(95, '%'), hass)).toBe('95');
    const unregistered = { ...hass, entities: {}, states: { 'sensor.pf': { state: '0.9567', attributes: {} } } };
    expect(powerFactorDisplay(readMeasurement(unregistered, 'sensor.pf', '')!, unregistered)).toBe('96');
    expect(powerFactorDisplay(reading(undefined, ''), hass)).toBe('undefined');
    context.entities['sensor.pf'].display_precision = -1;
    expect(readMeasurement(context, 'sensor.pf', '')?.display).toBe('0.9567');
  });
  it('keeps locale and no-grouping formatting', () => {
    expect(formatNumber('1234.50', { language: 'de', number_format: 'decimal_comma' })).toBe('1.234,50');
    expect(formatNumber('1234.50', { language: 'en', number_format: 'none' })).toBe('1234.50');
  });
  it('formats small scientific values, bounds extreme precision and supports quote decimals', () => {
    expect(formatNumber('1.234e-7', hass.locale)).toBe('0.0000001234');
    expect(() => formatNumber(`1.${'0'.repeat(1000)}`, hass.locale)).not.toThrow();
    expect(formatNumber('1234.50', { language: 'en', number_format: 'quote_decimal' })).toMatch(/^1['’]234\.50$/);
  });
  it('preserves tiny signed readings in display and motion', () => {
    for (const state of ['1e-21', '-1e-21', '0.000000000000000000001']) {
      const context = { ...hass, states: { 'sensor.power': { state, attributes: {} } } };
      const measurement = readMeasurement(context, 'sensor.power', 'W', true)!;
      expect(Number(measurement.display)).toBe(Number(state));
      expect(animationFor(measurement).duration).toBe(10);
      expect(animationFor(measurement).inverted).toBe(Number(state) < 0);
    }
  });
  it('normalizes W/kW/BTU power and stops at zero', () => {
    expect(animationFor(reading(500)).duration).toBe(5.5);
    expect(animationFor(reading(0.5, 'kW')).duration).toBe(5.5);
    expect(animationFor(reading(500000, 'mW')).duration).toBe(5.5);
    expect(animationFor(reading(1, 'MW')).duration).toBe(1);
    expect(animationFor(reading(1000, 'BTU/h')).duration).toBeCloseTo(7.36236);
    expect(animationFor(reading(0)).duration).toBeUndefined();
    expect(animationFor(reading(5000)).duration).toBe(1);
  });
  it.each([[500, false, false], [-500, false, true], [500, true, true], [-500, true, false]])('uses signed direction for %s W, inverted=%s', (value, inverted, expected) => {
    expect(animationFor(reading(value as number), { inverted: inverted as boolean }).inverted).toBe(expected);
  });
  it('bounds invalid animation configuration and supports constant speed', () => {
    expect(animationFor(reading(500), { min_duration: -1, max_duration: Infinity, power: 0 }).duration).toBe(5.5);
    expect(animationFor(reading(500), { min_duration: 2, max_duration: 2 }).duration).toBe(2);
    expect(animationFor(reading(500), { min_duration: 5, max_duration: 1 }).duration).toBe(5);
    expect(animationFor(reading(Number.MAX_VALUE), { power: Number.MIN_VALUE }).duration).toBe(1);
    expect(animationFor(reading(1000), { min_duration: Number.MIN_VALUE }).duration).toBe(0.001);
    expect(animationFor(reading(500), { min_duration: Number.MAX_VALUE, max_duration: Number.MAX_VALUE }).duration).toBe(86400);
    expect(animationFor(reading(Number.MAX_VALUE, 'kW')).duration).toBeUndefined();
  });
});
