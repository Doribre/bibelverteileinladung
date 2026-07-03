import type { DemoEvent } from "../types";
import { sanitizeEvents } from "./events";

// Sitzungsgebunden (Konzept v2, Abschnitt 5): Namen/Zuordnungen leben nur in der
// Browser-Sitzung; dauerhaft sichern geht bewusst nur über Export als Datei.
const KEY = "bibelverteilung-demo-events-v1";

export function loadEvents(): DemoEvent[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return [];
    return sanitizeEvents(JSON.parse(raw)) ?? [];
  } catch {
    return [];
  }
}

export function saveEvents(events: DemoEvent[]): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(events));
  } catch {
    // Speichern ist Komfort, kein Muss — Fehler (z. B. volles Storage) nicht eskalieren
  }
}
