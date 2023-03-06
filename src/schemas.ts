import {ICON_LEADING_DEFAULT, ICON_TRAILING_DEFAULT, UnitOfPower} from "./const";

const INPUT_ENTITY_DOMAINS = ["sensor", "input_number"];
export const ANIMATION_SCHEMA = [
  {
    type: "grid",
    name: "",
    schema: [
      {
        name: "power",
        label: "Animation Max Power",
        selector: {number: {mode: "box", unit_of_measurement: UnitOfPower.WATT}},
      },
      {
        name: "min_duration",
        label: "Animation Min Duration",
        selector: {number: {mode: "box", unit_of_measurement: 's'}},
      },
      {
        name: "max_duration",
        label: "Animation Max Duration",
        selector: {number: {mode: "box", unit_of_measurement: 's'}},
      },
    ],
  },
  {name: "inverted", label: "Animation Direction Inverted", selector: {boolean: {}}},
];

export const ENTITY_DATA_SCHEMA = [
  {name: "power", required: true, selector: {entity: {domain: INPUT_ENTITY_DOMAINS}}},
  {
    type: "grid",
    name: "",
    schema: [
      {name: "voltage", selector: {entity: {domain: INPUT_ENTITY_DOMAINS}}},
      {name: "current", selector: {entity: {domain: INPUT_ENTITY_DOMAINS}}},
      {name: "frequency", selector: {entity: {domain: INPUT_ENTITY_DOMAINS}}},
      {name: "power_factor", selector: {entity: {domain: INPUT_ENTITY_DOMAINS}}},
    ],
  },
];

export const ENTITY_VISUALS_SCHEMA = [
  {name: "name", selector: {text: {}}},
  {
    type: "grid",
    name: "",
    schema: [
      {name: "icon_leading", label: "Leading Icon", selector: {icon: {placeholder: ICON_LEADING_DEFAULT}}},
      {name: "icon_trailing", selector: {icon: {placeholder: ICON_TRAILING_DEFAULT}}},
    ],
  },
  {
    type: "grid",
    name: "",
    schema: [
      {name: "label_leading", selector: {text: {}}},
      {name: "label_trailing", selector: {text: {}}},
    ],
  },
  {name: "color", selector: {text: {}}},
];
