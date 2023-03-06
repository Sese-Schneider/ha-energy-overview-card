export const NAME = "Energy Overview";
export const CARD_ID = "energy-overview";
export const CARD_NAME = `${CARD_ID}-card`;
export const CARD_EDITOR_NAME = `${CARD_NAME}-editor`;
export const ENTITY_EDITOR_NAME = `${CARD_ID}-entity-editor`;

/* Default */
export const ICON_LEADING_DEFAULT = 'mdi:transmission-tower';
export const ICON_TRAILING_DEFAULT = 'mdi:home-lightning-bolt';

/* https://github.com/home-assistant/core/blob/dev/homeassistant/const.py#L482 */

export enum UnitOfPower {
  WATT = "W",
  KILO_WATT = "kW",
  BTU_PER_HOUR = "BTU/h"
}

export enum UnitOfElectricCurrent {
  MILLIAMPERE = "mA",
  AMPERE = "A"
}

export enum UnitOfElectricPotential {
  MILLIVOLT = "mV",
  VOLT = "V"
}

export enum UnitOfFrequency {
  HERTZ = "Hz",
  KILOHERTZ = "kHz",
  MEGAHERTZ = "MHz",
  GIGAHERTZ = "GHz",
}

export const PERCENTAGE = "%";
