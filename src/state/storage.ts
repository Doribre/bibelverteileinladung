import type { DemoEvent } from "../types";
import { sanitizeEvents } from "./events";

// Sitzungsgebunden (Konzept v2, Abschnitt 5): Namen/Zuordnungen leben nur in der
// Browser-Sitzung; dauerhaft sichern geht bewusst nur über Export als Datei.
// Jedes Verteilgebiet hat seinen eigenen Stand.
const KEY_PREFIX = "bibelverteilung-demo-events-v1";
const LEGACY_KEY = KEY_PREFIX; // Stand vor Einführung der Gebietsauswahl (= Bad Godesberg)

const keyFor = (region: string) => `${KEY_PREFIX}:${region}`;

export function loadEvents(region: string): DemoEvent[] {
  try {
    const raw =
      sessionStorage.getItem(keyFor(region)) ??
      (region === "badgodesberg" ? sessionStorage.getItem(LEGACY_KEY) : null);
    if (!raw) return [];
    return sanitizeEvents(JSON.parse(raw)) ?? [];
  } catch {
    return [];
  }
}

export function saveEvents(region: string, events: DemoEvent[]): void {
  try {
    sessionStorage.setItem(keyFor(region), JSON.stringify(events));
  } catch {
    // Speichern ist Komfort, kein Muss — Fehler (z. B. volles Storage) nicht eskalieren
  }
}
