# Bibel-Einladungs-Planer (Prototyp)

*Bereitgestellt von Bibel TV NEXT MISSION.*

Koordinations-Website für die Bibelverteilaktion (Demonstrator, Stufe 1 nach
Konzept v2): läuft komplett im Browser, ohne Backend und ohne Login.
Gebiete: **Bonn-Bad Godesberg** (Gebäudeumrisse) und **Hamburg** (ganze Stadt,
Gebäudemittelpunkte), umschaltbar in der Kopfzeile.

Live: https://doribre.github.io/bibelverteileinladung/

## Bedienung

- **KPI-Leiste (oben):** Unerreicht / Zugeteilt / Verteilt / Persönlich gesprochen –
  vier exklusive Kategorien, Summe = Zählbasis (adressierte Gebäude ohne Nebengebäude).
- **„Markiere dein Verteil-Gebiet":** Linie um den Bereich malen – kreuzt sie sich,
  ist das Gebiet ausgewählt (Loslassen schließt ebenfalls). Enthaltene Häuser
  (Mittelpunkt-Regel) werden ausgewählt, Straßenliste wird abgeleitet, Gebiet kann
  benannt und einem Verteiler zugeordnet werden.
- **Verteiler:** frei wählbare Namen, existieren nur in der Browser-Sitzung
  (Demonstrator – später ersetzt durch Bibel TV Login, PS#0001).
- **Haus anklicken** (Werkzeug „Auswählen"): Status setzen – Verteilt, Persönlich
  gesprochen, Zurücksetzen, Nicht zustellbar (mit Gebäude-Notiz; Häuser bleiben
  in der Zählung).
- **Gamification:** Beim Markieren blinkt das Haus, Funken sprühen, ein kurzer
  Glockenklang ertönt und eine von 30 überkonfessionellen Ermutigungen erscheint;
  die Zähler pulsieren bei jeder Änderung.
- **Export/Import:** kompletter Stand je Gebiet als JSON-Datei (Ereignisprotokoll).

## Entwicklung

```bash
npm install
npm run data                              # Bad Godesberg laden (Polygone)
node pipeline/fetch-buildings.mjs hamburg # Hamburg laden (Punkte, ~35 MB)
npm run dev                               # Dev-Server auf http://localhost:5173
npm run build                             # Produktions-Build nach dist/
```

## Architektur-Notizen

- **Ereignisprotokoll:** Jede Handlung ist ein unveränderliches Ereignis
  (`src/state/events.ts`); der Zustand ist immer eine Ableitung. Undo = letztes
  Ereignis entfernen. Dasselbe Format wandert in Stufe 2 auf den Server.
- **Datenschutz:** Es gibt keine personenbezogenen Daten – keine Bewohner, keine
  Freitexte an Häusern, kein „abgelehnt"-Status (Konzept v2, Abschnitt 2.3/10).
- **Basiskarte:** Für den Demonstrator OSM-Rasterkacheln (tile.openstreetmap.org,
  Attribution erforderlich, nur geringe Last). Vor breiterem Einsatz auf selbst
  gehostete PMTiles umstellen (Konzept v2, Abschnitt 11).
- **Gebäudedaten:** © OpenStreetMap-Mitwirkende, ODbL 1.0. Pipeline:
  `pipeline/fetch-buildings.mjs` (Filterung von Nebengebäuden = Zählbasis-Definition).
