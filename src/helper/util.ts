export function clamp(number, min, max) {
  return Math.max(min, Math.min(number, max));
}

export function capitalize(s) {
  return s && s.replace(/(^\w{1})|(\s+\w{1})/g, (letter) => letter.toUpperCase());
}

export const intersperse = (arr, sep) => arr.reduce((a, v) => [...a, v, sep], []).slice(0, -1);

// Hack to load ha-components needed for editor
export const loadHaComponents = () => {
  if (!customElements.get("ha-form")) {
    (customElements.get("hui-button-card") as any)?.getConfigElement();
  }
  if (!customElements.get("ha-entity-picker")) {
    (customElements.get("hui-entities-card") as any)?.getConfigElement();
  }
};
