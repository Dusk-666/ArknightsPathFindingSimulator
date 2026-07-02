const EPSILON = 1e-9;

export function bankersRound(value: number): number {
  const floorValue = Math.floor(value);
  const fraction = value - floorValue;

  if (fraction < 0.5 - EPSILON) {
    return floorValue;
  }

  if (fraction > 0.5 + EPSILON) {
    return floorValue + 1;
  }

  return floorValue % 2 === 0 ? floorValue : floorValue + 1;
}

export function roundTo(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
