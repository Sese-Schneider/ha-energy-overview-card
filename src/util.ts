export default function clamp(number, min, max) {
  return Math.max(min, Math.min(number, max));
}

export const intersperse = (arr, sep) => arr.reduce((a, v) => [...a, v, sep], []).slice(0, -1);
