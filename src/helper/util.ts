export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

export function capitalize(value: string): string {
  return value.replace(/(^\w)|(\s+\w)/g, (letter) => letter.toUpperCase());
}

export function fireEvent(target: HTMLElement, name: string, detail: unknown): void {
  target.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
}

export const EDITOR_LOAD_TIMEOUT_MS = 15000;
let loading: Promise<void> | undefined;

async function loadForm(): Promise<void> {
  if (!window.loadCardHelpers) throw new Error('Home Assistant card helpers are unavailable.');
  const helpers = await window.loadCardHelpers();
  const card = helpers.createCardElement({ type: 'button' });
  const constructor = card.constructor as typeof HTMLElement & {
    getConfigElement?: () => Promise<HTMLElement>;
  };
  if (!constructor.getConfigElement) throw new Error('Home Assistant button editor is unavailable.');
  await constructor.getConfigElement();
  if (!customElements.get('ha-form')) throw new Error('Home Assistant form did not load.');
}

async function loadFormWithTimeout(): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('Home Assistant form loading timed out.')), EDITOR_LOAD_TIMEOUT_MS);
  });
  try {
    await Promise.race([loadForm(), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** Load HA's selector form with a bounded, shared cold-start attempt. */
export async function loadHaComponents(): Promise<void> {
  if (customElements.get('ha-form')) return;
  loading ??= loadFormWithTimeout();
  const attempt = loading;
  try {
    await attempt;
  } catch (error) {
    if (loading === attempt) loading = undefined;
    throw error;
  }
}
