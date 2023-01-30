export default function clamp(number, min, max) {
  return Math.max(min, Math.min(number, max));
}
