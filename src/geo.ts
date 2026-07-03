import type { Ring } from "./types";

/** Punkt-in-Polygon per Ray-Casting; Ring darf offen oder geschlossen sein. */
export function pointInPolygon(p: [number, number], ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** [minX, minY, maxX, maxY] */
export function ringBbox(ring: Ring): [number, number, number, number] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

/**
 * Schnittpunkt zweier Strecken (a→b) und (c→d), oder null.
 * Für die Zeichenlogik: kreuzt die gemalte Linie sich selbst, schließt sie das Gebiet.
 */
export function segmentIntersection(
  a: [number, number],
  b: [number, number],
  c: [number, number],
  d: [number, number]
): [number, number] | null {
  const rx = b[0] - a[0], ry = b[1] - a[1];
  const sx = d[0] - c[0], sy = d[1] - c[1];
  const denom = rx * sy - ry * sx;
  if (denom === 0) return null; // parallel
  const t = ((c[0] - a[0]) * sy - (c[1] - a[1]) * sx) / denom;
  const u = ((c[0] - a[0]) * ry - (c[1] - a[1]) * rx) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return [a[0] + t * rx, a[1] + t * ry];
}

/** stellt sicher, dass der Ring geschlossen ist (erster == letzter Punkt) */
export function closeRing(ring: Ring): Ring {
  if (ring.length === 0) return ring;
  const [fx, fy] = ring[0];
  const [lx, ly] = ring[ring.length - 1];
  return fx === lx && fy === ly ? ring : [...ring, [fx, fy]];
}
