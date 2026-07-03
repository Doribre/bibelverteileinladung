# Bibelverteilung – Demonstrator (Stufe 1)

Koordinations-Website für die Bibelverteilaktion, Ausbaustufe 1 nach
[Konzept v2](../Bibelverteilaktion-Konzept-v2.md): läuft komplett im Browser,
ohne Backend und ohne Login. Pilotgebiet: **Bonn-Bad Godesberg**.

## Bedienung

- **KPI-Leiste (oben):** Unerreicht / Zugeteilt / Verteilt / Persönlich gesprochen —
  vier exklusive Kategorien, Summe = Zählbasis (adressierte Gebäude ohne Nebengebäude).
- **Lasso / Polygon:** Bereich auf der Karte umfahren → enthaltene Häuser
  (Mittelpunkt-Regel) werden ausgewählt, Straßenliste wird abgeleitet, Gebiet kann
  benannt und einem Verteiler zugeordnet werden.
- **Verteiler:** frei wählbare Namen, existieren nur in der Browser-Sitzung
  (Demonstrator — später ersetzt durch Bibel TV Login, PS#0001).
- **Haus anklicken** (Werkzeug „Auswählen"): Status setzen — Verteilt, Persönlich
  gesprochen, Zurücksetzen, Nicht zustellbar.
- **Export/Import:** kompletter Demo-Stand als JSON-Datei (Ereignisprotokoll).

## Entwicklung

```bash
npm install
npm run data   # Gebäudedaten von Overpass laden (public/data/buildings.geojson)
npm run dev    # Dev-Server auf http://localhost:5173
npm run build  # Produktions-Build nach dist/
```

## Architektur-Notizen

- **Ereignisprotokoll:** Jede Handlung ist ein unveränderliches Ereignis
  (`src/state/events.ts`); der Zustand ist immer eine Ableitung. Undo = letztes
  Ereignis entfernen. Dasselbe Format wandert in Stufe 2 auf den Server.
- **Datenschutz:** Es gibt keine personenbezogenen Daten — keine Bewohner, keine
  Freitexte an Häusern, kein „abgelehnt"-Status (Konzept v2, Abschnitt 2.3/10).
- **Basiskarte:** Für den Demonstrator OSM-Rasterkacheln (tile.openstreetmap.org,
  Attribution erforderlich, nur geringe Last). Vor breiterem Einsatz auf selbst
  gehostete PMTiles umstellen (Konzept v2, Abschnitt 11).
- **Gebäudedaten:** © OpenStreetMap-Mitwirkende, ODbL 1.0. Pipeline:
  `pipeline/fetch-buildings.mjs` (Filterung von Nebengebäuden = Zählbasis-Definition).
