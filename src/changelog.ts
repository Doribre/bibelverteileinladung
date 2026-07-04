export const APP_VERSION = "0.7";

export interface ChangelogEntry {
  version: string;
  date: string;
  time: string;
  title: string;
  changes: string[];
}

/**
 * Versionshistorie — oberste Version ist die aktuellste.
 * Konvention: Nummern zählen fortlaufend um 0.1 hoch, keine Nummer wird
 * ohne ausdrückliche Anweisung übersprungen.
 */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.7",
    date: "2026-07-04",
    time: "18:18",
    title: "Klarere Kennzeichnung",
    changes: [
      "Titel: »Bibel TV NEXT MISSION – Bibel-Einladungs-Planer« (Werkzeug, daher »Planer«).",
      "Deutliche Kennzeichnung als »Prototyp« (eingeschränkte Demo-Version), mit Versionsnummer im Kopfbereich.",
    ],
  },
  {
    version: "0.6",
    date: "2026-07-04",
    time: "17:30",
    title: "Bedien-Feinschliff",
    changes: [
      "Export und Import vorerst ausgeblendet, um die Testphase nicht zu verwirren (Funktion bleibt für später erhalten).",
      "Start-Dialog: Knopf heißt jetzt schlicht »Zurück«.",
      "Mobil: lange Überschrift wird nicht mehr abgeschnitten; das »⋮«-Menü sitzt jetzt am rechten Rand.",
      "Versionshistorie kritisch überarbeitet (vollständige Tage, Datum + Uhrzeit).",
    ],
  },
  {
    version: "0.5",
    date: "2026-07-04",
    time: "16:54",
    title: "Infoseite & Versionshistorie",
    changes: [
      "Neue Infoseite über das Menü: Projektbeschreibung, unsere Annahmen, alle Grenzen des Demonstrators mit Begründung und eine kurze Datenschutz-Einordnung.",
      "Versionshistorie mit Datum und Uhrzeit; fortlaufende Versionsnummern.",
    ],
  },
  {
    version: "0.4",
    date: "2026-07-04",
    time: "16:29",
    title: "Feinschliff & Bugfix",
    changes: [
      "Bugfix: markiertes Haus bleibt nicht mehr kurz gelb, sondern zeigt sofort seine endgültige Farbe.",
      "Einheitliche Statusfarben: Haus, Meldung, Button und Aufleuchten sind je Status dieselbe Farbe (Verteilt = grün, Persönlich gesprochen = gold).",
      "Ein Finger zeichnet das Gebiet, zwei Finger verschieben und zoomen die Karte.",
      "Linienweises Rückgängig beim Zeichnen (»Letzte Linie zurück«) — mehrere Striche möglich.",
      "Vereinfachter Start-Dialog: nur zwei vorausgefüllte Felder, ein Klick zum Loslegen, keine Tastatur beim Öffnen.",
      "Bessere Lesbarkeit auf dem Handy; Motivationsmeldung erscheint immer im sichtbaren Bereich.",
    ],
  },
  {
    version: "0.3",
    date: "2026-07-03",
    time: "21:38",
    title: "Handy-Bedienung & Wohnungszählung",
    changes: [
      "Vollbild-Karte auf dem Handy mit hochziehbarem Fortschritts-Bereich unten.",
      "Briefkästen/Wohnungen je Haus erfassbar (− / +), eigener Zähler »Wohnungen erreicht«.",
      "Doppelklick markiert ein Haus direkt; Notizfeld an jedem Haus (ab naher Zoomstufe auf der Karte sichtbar).",
      "Start im Zeichenmodus, bis das erste Gebiet angelegt ist.",
      "Hamburg direkt per Adress-Zusatz »#hh« aufrufbar.",
    ],
  },
  {
    version: "0.2",
    date: "2026-07-03",
    time: "14:38",
    title: "NEXT-MISSION-Ausbau",
    changes: [
      "Neuer Titel: Schau in die Bibel / Bibel TV NEXT MISSION Bibelverteil-Plan.",
      "Motivation beim Markieren: Aufleuchten, Funken, kurzer Klang und eine von 30 Ermutigungen.",
      "Zweites Gebiet Hamburg (ganze Stadt) neben Bonn-Bad Godesberg.",
      "»Nicht zustellbar« mit Notiz; Werkzeugleiste auf zwei klare Knöpfe vereinfacht.",
    ],
  },
  {
    version: "0.1",
    date: "2026-07-03",
    time: "11:13",
    title: "Erste Version",
    changes: [
      "Demonstrator mit Pilotgebiet Bonn-Bad Godesberg (Gebäude aus OpenStreetMap).",
      "Gebiet mit einer Linie umfahren, benennen und einem Verteiler zuordnen.",
      "Vier Status je Haus, immer sichtbare Zähler oben, Export/Import des Stands.",
    ],
  },
];
