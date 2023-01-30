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
}

export interface EnergyOverviewConfig {
  type: string;

  entities: Array<EnergyOverviewEntity>;
}
