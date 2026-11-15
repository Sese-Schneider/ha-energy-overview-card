/** Minimal structural types for the frontend data this card consumes. */
export interface HassEntity {
  state: string;
  attributes: { unit_of_measurement?: string; step?: number; [key: string]: unknown };
}
export interface FrontendLocaleData {
  language: string;
  number_format?: string;
}
export interface HomeAssistant {
  states: Record<string, HassEntity | undefined>;
  entities?: Record<string, { display_precision?: number } | undefined>;
  locale: FrontendLocaleData;
  localize: (key: string) => string;
}
export enum NumberFormat {
  comma_decimal = 'comma_decimal',
  decimal_comma = 'decimal_comma',
  space_comma = 'space_comma',
  quote_decimal = 'quote_decimal',
  system = 'system',
  none = 'none',
}
export interface CardHelpers {
  createCardElement: (config: { type: string }) => HTMLElement;
}
declare global {
  interface Window {
    loadCardHelpers?: () => Promise<CardHelpers>;
    customCards?: Array<Record<string, unknown>>;
  }
}
