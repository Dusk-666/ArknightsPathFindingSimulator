import type { Vec2 } from "../models";

export const ZERO_VEC: Vec2 = { x: 0, y: 0 };

export function vec(x: number, y: number): Vec2 {
  return { x, y };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(a: Vec2, factor: number): Vec2 {
  return { x: a.x * factor, y: a.y * factor };
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function length(a: Vec2): number {
  return Math.hypot(a.x, a.y);
}

export function distance(a: Vec2, b: Vec2): number {
  return length(sub(a, b));
}

export function normalize(a: Vec2): Vec2 {
  const value = length(a);
  if (value <= 1e-8) {
    return ZERO_VEC;
  }

  return scale(a, 1 / value);
}

export function clampMagnitude(a: Vec2, maxMagnitude: number): Vec2 {
  const value = length(a);
  if (value <= maxMagnitude) {
    return a;
  }

  return scale(a, maxMagnitude / value);
}

export function project(a: Vec2, onto: Vec2): Vec2 {
  const ontoLengthSquared = dot(onto, onto);
  if (ontoLengthSquared <= 1e-8) {
    return ZERO_VEC;
  }

  const factor = dot(a, onto) / ontoLengthSquared;
  return scale(onto, factor);
}
