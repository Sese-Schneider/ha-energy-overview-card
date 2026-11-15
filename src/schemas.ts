import { ICON_LEADING_DEFAULT, ICON_TRAILING_DEFAULT, UnitOfPower } from "./const";
import type { HomeAssistant } from './ha-types';
import type { EnergyOverviewEntity } from './types';

const INPUT_ENTITY_DOMAINS = ["sensor", "input_number"];
export const ANIMATION_SCHEMA = [
  {
    type: "grid",
    name: "",
    schema: [
      {
        name: "power",
        label: "Animation Max Power",
        selector: { number: { mode: "box", unit_of_measurement: UnitOfPower.WATT } },
      },
      {
        name: "min_duration",
        label: "Animation Min Duration",
        selector: { number: { mode: "box", unit_of_measurement: 's' } },
      },
      {
        name: "max_duration",
        label: "Animation Max Duration",
        selector: { number: { mode: "box", unit_of_measurement: 's' } },
      },
    ],
  },
  { name: "inverted", label: "Animation Direction Inverted", selector: { boolean: {} } },
];

export const ENTITY_DATA_SCHEMA = [
  { name: "power", required: true, selector: { entity: { filter: { domain: INPUT_ENTITY_DOMAINS } } } },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "voltage", selector: { entity: { filter: { domain: INPUT_ENTITY_DOMAINS } } } },
      { name: "current", selector: { entity: { filter: { domain: INPUT_ENTITY_DOMAINS } } } },
      { name: "frequency", selector: { entity: { filter: { domain: INPUT_ENTITY_DOMAINS } } } },
      { name: "power_factor", selector: { entity: { filter: { domain: INPUT_ENTITY_DOMAINS } } } },
    ],
  },
];

type MeasurementField = 'power' | 'voltage' | 'current' | 'frequency' | 'power_factor';

/** Filter suggestions only; existing YAML values remain valid and selectable. */
export function entityDataSchema(hass: HomeAssistant, config: EnergyOverviewEntity, showAll = false) {
  if (showAll) return ENTITY_DATA_SCHEMA;
  const fieldSchema = (name: MeasurementField) => {
    const ids = Object.entries(hass.states).filter(([id, entity]) => {
      if (!entity || !INPUT_ENTITY_DOMAINS.includes(id.split('.')[0])) return false;
      return entity.attributes.device_class === name;
    }).map(([id]) => id);
    const selected = config[name];
    if (selected && !ids.includes(selected)) ids.push(selected);
    return { name, ...(name === 'power' ? { required: true } : {}), selector: { entity: { include_entities: ids } } };
  };
  return [fieldSchema('power'), {
    type: 'grid', name: '', schema: ['voltage', 'current', 'frequency', 'power_factor'].map((name) => fieldSchema(name as MeasurementField)),
  }];
}

export const ENTITY_VISUALS_SCHEMA = [
  { name: "name", selector: { text: {} } },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "icon_leading", label: "Leading Icon", selector: { icon: { placeholder: ICON_LEADING_DEFAULT } } },
      { name: "icon_trailing", selector: { icon: { placeholder: ICON_TRAILING_DEFAULT } } },
    ],
  },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "label_leading", selector: { text: {} } },
      { name: "label_trailing", selector: { text: {} } },
    ],
  },
  { name: "color", selector: { text: {} } },
];

export const TITLE_SCHEMA = [
  { name: "title", label: "Title", selector: { text: {} } },
];

export const ORDER_BY_SCHEMA = [
  {
    name: "order_by",
    label: "Order entities by",
    selector: {
      select: {
        mode: "dropdown",
        options: [
          { value: "", label: "None" },
          { value: "power", label: "Power" },
          { value: "voltage", label: "Voltage" },
          { value: "current", label: "Current" },
          { value: "frequency", label: "Frequency" },
          { value: "power_factor", label: "Power Factor" },
        ],
      },
    },
  },
];
