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

export interface EnergyOverviewEntityState {
  value: number,
  unit: string;
  display: string;
  precision?: number;
}

export interface EnergyOverviewEntityUI extends Omit<EnergyOverviewEntity, 'power' | 'current' | 'voltage' | 'frequency' | 'power_factor'> {
  power: EnergyOverviewEntityState;
  current: EnergyOverviewEntityState | undefined;
  voltage: EnergyOverviewEntityState | undefined;
  frequency: EnergyOverviewEntityState | undefined;
  power_factor: EnergyOverviewEntityState | undefined;
}

export interface EnergyOverviewConfig {
  type: string;
  entities: Array<EnergyOverviewEntity>;
  animation?: EnergyOverviewAnimation;
  order_by?: string;
}
