export interface EnergyOverviewAnimation {
  min_duration?: number;
  max_duration?: number;
  power?: number;
}

export interface EnergyOverviewEntity {
  power: string;
  current?: string;
  voltage?: string;
  power_factor?: string;
  label_trailing?: string;
  label_leading?: string;
  icon_trailing?: string;
  icon_leading?: string;
  color?: string;
  animation?: EnergyOverviewAnimation;
}

export interface EnergyOverviewConfig {
  type: string;
  entities: Array<EnergyOverviewEntity>;
  animation?: EnergyOverviewAnimation;
}
