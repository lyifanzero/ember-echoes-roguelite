import type { Vec2Value } from './types';

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lengthSquared(value: Vec2Value): number {
  return value.x * value.x + value.y * value.y;
}

export function distanceSquared(a: Vec2Value, b: Vec2Value): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function normalized(value: Vec2Value): Vec2Value {
  const length = Math.sqrt(lengthSquared(value));
  if (length <= 0.00001) {
    return { x: 0, y: 0 };
  }
  return { x: value.x / length, y: value.y / length };
}

export class SeededRandom {
  private state: number;

  public constructor(seed = 0x5eeda0) {
    this.state = seed >>> 0;
  }

  public next(): number {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }

  public range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }
}
