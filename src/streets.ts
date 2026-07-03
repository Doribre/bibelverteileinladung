import type { Building } from "./types";

export interface StreetInfo {
  street: string;
  count: number;
  range: string;
}

/**
 * Leitet aus einer Gebäudeauswahl die Straßenliste ab (Konzept v2, Abschnitt 4):
 * Straßen sind nur abgeleitete Anzeige, Gebäude bleiben die zugeteilte Einheit.
 */
export function summarizeStreets(list: Building[]): StreetInfo[] {
  const groups = new Map<string, Building[]>();
  for (const b of list) {
    const key = b.street || "(ohne Straßenangabe)";
    let arr = groups.get(key);
    if (!arr) {
      arr = [];
      groups.set(key, arr);
    }
    arr.push(b);
  }
  return [...groups.entries()]
    .map(([street, bs]) => {
      const nums = bs
        .map((b) => ({ n: parseInt(b.hnr, 10), s: b.hnr }))
        .filter((x) => !Number.isNaN(x.n));
      let range = "";
      if (nums.length > 0) {
        let min = nums[0], max = nums[0];
        for (const x of nums) {
          if (x.n < min.n) min = x;
          if (x.n > max.n) max = x;
        }
        range = min.s === max.s ? min.s : `${min.s}–${max.s}`;
      }
      return { street, count: bs.length, range };
    })
    .sort((a, b) => b.count - a.count);
}
