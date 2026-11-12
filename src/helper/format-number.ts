// https://github.com/home-assistant/frontend/blob/dev/src/common/number/format_number.ts

import { FrontendLocaleData, NumberFormat, HassEntity } from "../ha-types";

export const round = (value: number, precision = 2): number => Math.round(value * 10 ** precision) / 10 ** precision;

export const getDefaultFormatOptions = (
  num: string | number,
  options?: Intl.NumberFormatOptions,
): Intl.NumberFormatOptions => {
  const defaultOptions: Intl.NumberFormatOptions = {
    maximumFractionDigits: 2,
    ...options,
  };

  const numeric = Number(num);
  const hasPrecision = options?.minimumFractionDigits !== undefined || options?.maximumFractionDigits !== undefined;
  if (!hasPrecision && numeric !== 0 && Math.abs(numeric) < 1e-20) {
    return { notation: 'scientific', maximumFractionDigits: 5, ...options };
  }

  if (typeof num !== "string") {
    return defaultOptions;
  }

  // Keep decimal trailing zeros if they are present in a string numeric value
  if (
    !options
    || (options.minimumFractionDigits === undefined
      && options.maximumFractionDigits === undefined)
  ) {
    const match = /^[+-]?\d*(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(num.trim());
    const digits = Math.min(20, Math.max(0, (match?.[1]?.length ?? 0) - Number(match?.[2] ?? 0)));
    defaultOptions.minimumFractionDigits = digits;
    defaultOptions.maximumFractionDigits = digits;
  }

  return defaultOptions;
};

export const numberFormatToLocale = (
  localeOptions: FrontendLocaleData,
): string | string[] | undefined => {
  switch (localeOptions.number_format) {
    case NumberFormat.comma_decimal:
      return ["en-US", "en"]; // Use United States with fallback to English formatting 1,234,567.89
    case NumberFormat.decimal_comma:
      return ["de", "es", "it"]; // Use German with fallback to Spanish then Italian formatting 1.234.567,89
    case NumberFormat.space_comma:
      return ["fr", "sv", "cs"]; // Use French with fallback to Swedish and Czech formatting 1 234 567,89
    case NumberFormat.quote_decimal:
      return ["de-CH"];
    case NumberFormat.system:
      return undefined;
    default:
      return localeOptions.language;
  }
};

export const formatNumber = (
  num: string | number,
  localeOptions?: FrontendLocaleData,
  options?: Intl.NumberFormatOptions,
): string => {
  const locale = localeOptions
    ? numberFormatToLocale(localeOptions)
    : undefined;

  if (
    localeOptions?.number_format !== NumberFormat.none
    && !Number.isNaN(Number(num))
    && Intl
  ) {
    try {
      return new Intl.NumberFormat(
        locale,
        getDefaultFormatOptions(num, options),
      ).format(Number(num));
    } catch (err: any) {
      // Don't fail when using "TEST" language
      console.error(err);
      return new Intl.NumberFormat(
        undefined,
        getDefaultFormatOptions(num, options),
      ).format(Number(num));
    }
  }

  if (
    !Number.isNaN(Number(num))
    && num !== ""
    && localeOptions?.number_format === NumberFormat.none
    && Intl
  ) {
    // If NumberFormat is none, use en-US format without grouping.
    return new Intl.NumberFormat(
      "en-US",
      getDefaultFormatOptions(num, {
        ...options,
        useGrouping: false,
      }),
    ).format(Number(num));
  }

  if (typeof num === "string") {
    return num;
  }
  return `${round(num, options?.maximumFractionDigits).toString()}${options?.style === "currency" ? ` ${options.currency}` : ""}`;
};

export const getNumberFormatOptions = (
  entityState: HassEntity,
  entity?: any,
): Intl.NumberFormatOptions | undefined => {
  const precision = entity?.display_precision;
  if (typeof precision === "number" && Number.isInteger(precision) && precision >= 0 && precision <= 20) {
    return {
      maximumFractionDigits: precision,
      minimumFractionDigits: precision,
    };
  }
  if (
    Number.isInteger(Number(entityState.attributes?.step))
    && Number.isInteger(Number(entityState.state))
  ) {
    return { maximumFractionDigits: 0 };
  }
  return undefined;
};
