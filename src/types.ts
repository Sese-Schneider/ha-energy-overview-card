export interface EnergyOverviewAnimation {
  min_duration?: number;
  max_duration?: number;
  power?: number;
  inverted?: boolean;
}

export interface EnergyOverviewEntity {
  power: string;
  current?: string;
  voltage?: string;
  frequency?: string;
  power_factor?: string;
  name?: string;
  label_trailing?: string;
  label_leading?: string;
  icon_trailing?: string;
  icon_leading?: string;
  color?: string;
  animation?: EnergyOverviewAnimation;
}

export interface EnergyOverviewEntityUI extends EnergyOverviewEntity {
  power_unit: string;
  current_unit: string;
  voltage_unit: string;
  frequency_unit: string;
  power_factor_unit: string;
}

export interface EnergyOverviewConfig {
  type: string;
  entities: Array<EnergyOverviewEntity>;
  animation?: EnergyOverviewAnimation;
  order_by?: string;
}
