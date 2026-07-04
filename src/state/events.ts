import type { AreaView, Building, Cat, DemoEvent, Derived, Distributor, Ring } from "../types";

/**
 * Leitet den kompletten Anwendungszustand aus dem Ereignisprotokoll ab.
 * Regeln aus Konzept v2, Abschnitt 2: Ergebnis (verteilt/gesprochen) hat Vorrang
 * vor Zuteilung; nicht_zustellbar nimmt ein Haus aus der Zählbasis.
 */
export function derive(events: DemoEvent[], buildings: Map<number, Building>): Derived {
  const dists = new Map<string, Distributor>();
  const areas = new Map<
    string,
    { id: string; name: string; distributorId: string | null; polygon: Ring }
  >();
  const assign = new Map<number, string>(); // Gebäude → Gebiet (letzte Zuteilung gewinnt)
  const ergebnis = new Map<number, "v" | "g">();
  const nz = new Set<number>(); // Kennzeichen: Haus bleibt in der Zählbasis
  const notes = new Map<number, string>(); // Gebäude-Notizen, statusunabhängig
  const units = new Map<number, number>(); // Briefkästen/Wohnungen je Gebäude (Standard 1)

  for (const e of events) {
    switch (e.t) {
      case "distributor_added":
        dists.set(e.id, { id: e.id, name: e.name, color: e.color });
        break;
      case "distributor_removed":
        dists.delete(e.id);
        for (const a of areas.values()) {
          if (a.distributorId === e.id) a.distributorId = null;
        }
        break;
      case "area_created":
        areas.set(e.id, {
          id: e.id,
          name: e.name,
          distributorId: e.distributorId,
          polygon: e.polygon,
        });
        for (const b of e.buildingIds) {
          if (buildings.size === 0 || buildings.has(b)) assign.set(b, e.id);
        }
        break;
      case "area_assigned": {
        const a = areas.get(e.areaId);
        if (a) a.distributorId = e.distributorId;
        break;
      }
      case "area_dissolved":
        areas.delete(e.areaId);
        for (const [b, aid] of [...assign]) {
          if (aid === e.areaId) assign.delete(b);
        }
        break;
      case "building_status":
        // Phantom-IDs ignorieren (z. B. nach Datenupdate oder Import aus altem Stand),
        // sonst verfälschen sie die KPI-Zählung
        if (buildings.size > 0 && !buildings.has(e.buildingId)) break;
        switch (e.status) {
          case "verteilt":
            ergebnis.set(e.buildingId, "v");
            nz.delete(e.buildingId);
            break;
          case "gesprochen":
            ergebnis.set(e.buildingId, "g");
            nz.delete(e.buildingId);
            break;
          case "offen":
            ergebnis.delete(e.buildingId);
            nz.delete(e.buildingId);
            break;
          case "nicht_zustellbar":
            nz.add(e.buildingId);
            ergebnis.delete(e.buildingId);
            // veraltetes comment-Feld (frühere Exporte) als Notiz übernehmen
            if (e.comment !== undefined) {
              const c = e.comment.trim();
              if (c) notes.set(e.buildingId, c);
              else notes.delete(e.buildingId);
            }
            break;
          case "zustellbar":
            nz.delete(e.buildingId);
            break;
        }
        break;
      case "building_note": {
        if (buildings.size > 0 && !buildings.has(e.buildingId)) break;
        const n = e.note.trim();
        if (n) notes.set(e.buildingId, n);
        else notes.delete(e.buildingId);
        break;
      }
      case "building_units": {
        if (buildings.size > 0 && !buildings.has(e.buildingId)) break;
        const u = Math.max(1, Math.min(99, Math.round(e.units)));
        if (u === 1) units.delete(e.buildingId); // Standardwert nicht extra speichern
        else units.set(e.buildingId, u);
        break;
      }
    }
  }

  // Anzeige-Kategorie je Gebäude (nur Abweichungen vom Standard 'u');
  // 'n' übersteuert nur die FARBE – gezählt wird das Haus weiterhin normal
  const cat = new Map<number, Cat>();
  for (const b of nz) cat.set(b, "n");
  for (const [b, v] of ergebnis) {
    if (!nz.has(b)) cat.set(b, v);
  }
  const isAssigned = (b: number): boolean => {
    const a = areas.get(assign.get(b) ?? "");
    return !!a && !!a.distributorId;
  };
  for (const [b] of assign) {
    if (cat.has(b)) continue;
    if (isAssigned(b)) cat.set(b, "z"); // zugeteilt nur, wenn wirklich jemandem zugeordnet
  }

  // Zählung: nicht_zustellbar nimmt NICHTS aus der Zählbasis – das Haus zählt
  // nach seinem Grundzustand weiter (zugeteilt oder unerreicht)
  const unitsOf = (b: number) => units.get(b) ?? 1;
  let z = 0, v = 0, g = 0, w = 0;
  for (const [b, c] of cat) {
    if (c === "v") { v++; w += unitsOf(b); }
    else if (c === "g") { g++; w += unitsOf(b); }
    else if (c === "z") z++;
    else if (c === "n" && isAssigned(b)) z++;
  }
  const total = buildings.size;
  // Wohnungen gesamt: Häuser ohne Angabe zählen als 1 → Mindestzahl
  let wTotal = total;
  for (const [, u] of units) wTotal += u - 1;
  const counts = { z, v, g, nz: nz.size, total, u: Math.max(0, total - z - v - g), w, wTotal };

  // effektive Mitglieder je Gebiet (nicht_zustellbare Häuser bleiben offene Aufgabe)
  const members = new Map<string, number[]>();
  for (const [b, aid] of assign) {
    let arr = members.get(aid);
    if (!arr) {
      arr = [];
      members.set(aid, arr);
    }
    arr.push(b);
  }
  const areaViews: AreaView[] = [...areas.values()].map((a) => {
    const m = members.get(a.id) ?? [];
    let done = 0, unitsDone = 0, unitsTotal = 0;
    for (const b of m) {
      const u = unitsOf(b);
      unitsTotal += u;
      const c = cat.get(b);
      if (c === "v" || c === "g") {
        done++;
        unitsDone += u;
      }
    }
    return { ...a, memberIds: m, done, unitsDone, unitsTotal };
  });

  return { distributors: [...dists.values()], areas: areaViews, cat, assignedArea: assign, notes, units, counts };
}

/** Farbpalette für Verteiler (bewusst getrennt von den Statusfarben) */
export const PALETTE = [
  "#e11d48", "#7c3aed", "#0891b2", "#d97706", "#db2777", "#65a30d",
  "#0d9488", "#9333ea", "#b91c1c", "#4d7c0f", "#1d4ed8", "#a21caf",
];

export function nextColor(existingCount: number): string {
  return PALETTE[existingCount % PALETTE.length];
}

export function newId(prefix: string): string {
  return prefix + Math.random().toString(36).slice(2, 10);
}

const STATUS_VALUES = new Set(["verteilt", "gesprochen", "offen", "nicht_zustellbar", "zustellbar"]);

/**
 * Validiert fremde/gespeicherte Ereignislisten (Import-Datei, sessionStorage).
 * Gibt null zurück, wenn irgendetwas nicht der erwarteten Form entspricht –
 * eine manipulierte Datei darf die App nicht crashen.
 */
export function sanitizeEvents(raw: unknown): DemoEvent[] | null {
  if (!Array.isArray(raw)) return null;
  const isRing = (p: unknown): p is Ring =>
    Array.isArray(p) &&
    p.length >= 4 &&
    p.every(
      (q) => Array.isArray(q) && q.length === 2 && typeof q[0] === "number" && typeof q[1] === "number"
    );
  for (const e of raw) {
    if (!e || typeof e !== "object") return null;
    const ev = e as Record<string, unknown>;
    switch (ev.t) {
      case "distributor_added":
        if (typeof ev.id !== "string" || typeof ev.name !== "string" || typeof ev.color !== "string") return null;
        break;
      case "distributor_removed":
        if (typeof ev.id !== "string") return null;
        break;
      case "area_created":
        if (typeof ev.id !== "string" || typeof ev.name !== "string") return null;
        if (ev.distributorId !== null && typeof ev.distributorId !== "string") return null;
        if (!isRing(ev.polygon)) return null;
        if (!Array.isArray(ev.buildingIds) || !ev.buildingIds.every((b) => typeof b === "number")) return null;
        break;
      case "area_assigned":
        if (typeof ev.areaId !== "string") return null;
        if (ev.distributorId !== null && typeof ev.distributorId !== "string") return null;
        break;
      case "area_dissolved":
        if (typeof ev.areaId !== "string") return null;
        break;
      case "building_status":
        if (typeof ev.buildingId !== "number" || !STATUS_VALUES.has(ev.status as string)) return null;
        if (ev.comment !== undefined && (typeof ev.comment !== "string" || ev.comment.length > 500)) return null;
        break;
      case "building_note":
        if (typeof ev.buildingId !== "number" || typeof ev.note !== "string" || ev.note.length > 500) return null;
        break;
      case "building_units":
        if (typeof ev.buildingId !== "number" || typeof ev.units !== "number" || !Number.isFinite(ev.units)) return null;
        break;
      default:
        return null;
    }
  }
  return raw as DemoEvent[];
}
