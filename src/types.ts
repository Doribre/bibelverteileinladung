// Zentrale Typen — Statusmodell siehe Konzept v2, Abschnitt 2:
// zwei Dimensionen (Zuteilung × Ergebnis) → vier exklusive Anzeige-Kategorien.

/** Anzeige-Kategorie: u=Unerreicht, z=Zugeteilt, v=Verteilt, g=Gesprochen, n=Nicht zustellbar */
export type Cat = "u" | "z" | "v" | "g" | "n";

export type Ring = [number, number][];

export interface Building {
  id: number;
  street: string;
  hnr: string;
  plz: string;
  /** Schwerpunkt [lng, lat] — vorberechnet in der Pipeline */
  c: [number, number];
}

/** Append-only-Ereignisprotokoll: der Zustand ist immer eine Ableitung (Konzept v2, Abschnitt 7) */
type DemoEventBase =
  | { t: "distributor_added"; id: string; name: string; color: string }
  | { t: "distributor_removed"; id: string }
  | {
      t: "area_created";
      id: string;
      name: string;
      distributorId: string | null;
      polygon: Ring;
      buildingIds: number[];
    }
  | { t: "area_assigned"; areaId: string; distributorId: string | null }
  | { t: "area_dissolved"; areaId: string }
  | {
      t: "building_status";
      buildingId: number;
      status: "verteilt" | "gesprochen" | "offen" | "nicht_zustellbar" | "zustellbar";
      /** veraltet (frühere Exporte): Notiz bei nicht_zustellbar — wird als building_note übernommen */
      comment?: string;
    }
  | {
      /** Gebäude-Notiz, unabhängig vom Status; leerer Text löscht die Notiz */
      t: "building_note";
      buildingId: number;
      note: string;
    }
  | {
      /** Anzahl Briefkästen/Wohnungen im Gebäude (1–99, Standard 1) */
      t: "building_units";
      buildingId: number;
      units: number;
    };

/** g = Aktionsgruppe: Events eines Klicks teilen eine Gruppe, Undo nimmt die ganze Gruppe zurück */
export type DemoEvent = DemoEventBase & { g?: string };

export interface Distributor {
  id: string;
  name: string;
  color: string;
}

export interface AreaView {
  id: string;
  name: string;
  distributorId: string | null;
  polygon: Ring;
  /** effektive Mitglieder (können durch spätere Gebiete abgeworben worden sein) */
  memberIds: number[];
  /** davon verteilt oder gesprochen */
  done: number;
  /** Wohnungen der erledigten Häuser */
  unitsDone: number;
  /** Wohnungen aller Häuser im Gebiet (unbekannte Häuser zählen als 1) */
  unitsTotal: number;
}

export interface Counts {
  u: number;
  z: number;
  v: number;
  g: number;
  /** Info-Zähler: nicht_zustellbar ist ein Kennzeichen, die Häuser bleiben in der Zählbasis */
  nz: number;
  total: number;
  /** Wohnungen/Briefkästen der erreichten Häuser (verteilt + gesprochen) */
  w: number;
  /** Wohnungen gesamt — Häuser ohne Angabe zählen als 1, also eine Mindestzahl */
  wTotal: number;
}

export interface Derived {
  distributors: Distributor[];
  areas: AreaView[];
  /** Anzeige-Kategorie je Gebäude, nur Einträge ungleich 'u' (Standard) */
  cat: Map<number, Cat>;
  assignedArea: Map<number, string>;
  /** Gebäude-Notizen (statusunabhängig, nur Angaben zum Gebäude) */
  notes: Map<number, string>;
  /** Briefkästen/Wohnungen je Gebäude (nur erfasste; Standard ist 1) */
  units: Map<number, number>;
  counts: Counts;
}

/** Wählbare Verteilgebiete (Stufe 1: statische Datendateien) */
export interface Region {
  key: string;
  name: string;
  file: string;
}

export const REGIONS: Region[] = [
  { key: "badgodesberg", name: "Bonn-Bad Godesberg", file: "badgodesberg.geojson" },
  { key: "hamburg", name: "Hamburg (ganze Stadt)", file: "hamburg.geojson" },
];

export const CAT_COLORS: Record<Cat, string> = {
  u: "#9ca3af",
  z: "#3b82f6",
  v: "#16a34a",
  g: "#eab308",
  n: "#374151",
};

export const CAT_LABELS: Record<Cat, string> = {
  u: "Unerreicht",
  z: "Zugeteilt",
  v: "Verteilt",
  g: "Persönlich gesprochen",
  n: "Nicht zustellbar",
};
