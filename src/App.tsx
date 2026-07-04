import { useEffect, useMemo, useRef, useState } from "react";
import type { Building, Cat, DemoEvent, Ring } from "./types";
import { CAT_COLORS, CAT_FLASH, CAT_TEXT, REGIONS } from "./types";
import { derive, newId, nextColor, sanitizeEvents } from "./state/events";
import { loadEvents, saveEvents } from "./state/storage";
import { randomEncouragement } from "./encouragements";
import { bling } from "./sound";
import KpiBar from "./components/KpiBar";
import MapView, { type Tool } from "./components/MapView";
import Sidebar from "./components/Sidebar";
import AreaDialog from "./components/AreaDialog";
import StatusPopup from "./components/StatusPopup";
import Celebration, { type CelebrationData } from "./components/Celebration";
import { useIsMobile } from "./useIsMobile";

/** Ein gezeichneter Linien-Strich mit den darin liegenden Häusern */
interface Stroke {
  ids: number[];
  polygon: Ring;
}
interface PopupState {
  buildingId: number;
  x: number;
  y: number;
}

/** Gebiet aus der Adresse lesen: "#hh" (oder Pfad …/hh) zeigt Hamburg, sonst Bad Godesberg */
function regionFromUrl(): string {
  const h = location.hash.replace(/^#\/?/, "").toLowerCase();
  if (h === "hh" || h === "hamburg") return "hamburg";
  return REGIONS[0].key;
}

/** Gibt es (noch) ein Verteil-Gebiet? Bestimmt den Start-Modus der Werkzeuge. */
function hasAreas(evs: DemoEvent[]): boolean {
  const dissolved = new Set(
    evs.filter((e) => e.t === "area_dissolved").map((e) => (e as { areaId: string }).areaId)
  );
  return evs.some((e) => e.t === "area_created" && !dissolved.has(e.id));
}

/** Erst das eigene Gebiet einkringeln — Häuser markieren kommt danach. */
const defaultTool = (evs: DemoEvent[]): Tool => (hasAreas(evs) ? "select" : "lasso");

export default function App() {
  const [regionKey, setRegionKey] = useState<string>(regionFromUrl);
  const region = REGIONS.find((r) => r.key === regionKey) ?? REGIONS[0];
  const [buildingsFC, setBuildingsFC] = useState<any | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [events, setEvents] = useState<DemoEvent[]>(() => loadEvents(regionFromUrl()));
  const [tool, setTool] = useState<Tool>(() => defaultTool(loadEvents(regionFromUrl())));
  // Angesammelte Linien-Striche vor dem Anlegen; "letzte Linie zurück" poppt den letzten.
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [showNaming, setShowNaming] = useState(false);
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [focusArea, setFocusArea] = useState<{ id: string; ts: number } | null>(null);
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const [flash, setFlash] = useState<{ id: number; ts: number; color: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Gebäudedaten des gewählten Gebiets laden
  useEffect(() => {
    let cancelled = false;
    setBuildingsFC(null);
    setLoadError(null);
    fetch(`${import.meta.env.BASE_URL}data/${region.file}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((fc) => {
        if (!cancelled) setBuildingsFC(fc);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [region.file]);

  const switchRegion = (key: string) => {
    if (key === regionKey) return;
    setRegionKey(key);
    setEvents(loadEvents(key));
    setStrokes([]);
    setShowNaming(false);
    setPopup(null);
    setCelebration(null);
    setSheetOpen(false);
    setTool(defaultTool(loadEvents(key)));
    // Adresse mitführen: Hamburg-Link ist teilbar (…/#hh)
    history.replaceState(null, "", key === "hamburg" ? "#hh" : location.pathname + location.search);
  };

  // Adresszeile von Hand geändert (#hh entfernt/ergänzt) → Gebiet folgt
  useEffect(() => {
    const onHash = () => switchRegion(regionFromUrl());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  });

  const buildings = useMemo(() => {
    const m = new Map<number, Building>();
    if (buildingsFC) {
      for (const f of buildingsFC.features) {
        const p = f.properties;
        // Polygone tragen den Schwerpunkt als Property, Punkte direkt in der Geometrie
        const c = p.c ?? (f.geometry.type === "Point" ? f.geometry.coordinates : null);
        if (!c) continue;
        m.set(p.id, { id: p.id, street: p.street, hnr: p.hnr, plz: p.plz ?? "", c });
      }
    }
    return m;
  }, [buildingsFC]);

  const derived = useMemo(() => derive(events, buildings), [events, buildings]);

  useEffect(() => saveEvents(regionKey, events), [regionKey, events]);

  // Events eines Aufrufs teilen eine Aktionsgruppe — Undo nimmt die ganze Gruppe zurück
  const dispatch = (...evs: DemoEvent[]) => {
    const g = newId("g");
    setEvents((prev) => [...prev, ...evs.map((e) => ({ ...e, g }))]);
  };

  const undo = () => {
    setEvents((prev) => {
      if (prev.length === 0) return prev;
      const g = prev[prev.length - 1].g;
      let i = prev.length - 1;
      if (g) {
        while (i > 0 && prev[i - 1].g === g) i--;
      }
      return prev.slice(0, i);
    });
    setPopup(null);
    setStrokes([]);
    setShowNaming(false);
  };

  const reset = () => {
    if (confirm(`Demo für „${region.name}" wirklich zurücksetzen? Alle Markierungen, Gebiete und Namen dieses Gebiets gehen verloren.`)) {
      setEvents([]);
      setPopup(null);
      setStrokes([]);
      setShowNaming(false);
      setTool("lasso"); // ohne Gebiete: wieder mit dem Einkringeln beginnen
    }
  };

  const exportState = () => {
    const payload = {
      app: "bibelverteilung-demo",
      version: 2,
      region: regionKey,
      exportedAt: new Date().toISOString(),
      events,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `bibelverteil-plan-${regionKey}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importState = (file: File) => {
    file
      .text()
      .then((txt) => {
        const p = JSON.parse(txt);
        const evs = p ? sanitizeEvents(p.events) : null;
        if (!evs) {
          alert("Datei nicht erkannt oder beschädigt — es wird ein unveränderter Export dieser Anwendung erwartet.");
          return;
        }
        const fileRegion: string = typeof p.region === "string" ? p.region : "badgodesberg";
        if (fileRegion !== regionKey) {
          const r = REGIONS.find((x) => x.key === fileRegion);
          alert(`Diese Datei gehört zum Gebiet „${r?.name ?? fileRegion}" — bitte oben zuerst das Gebiet umschalten und dann erneut importieren.`);
          return;
        }
        setEvents(evs);
        setPopup(null);
        setStrokes([]);
        setShowNaming(false);
      })
      .catch(() => alert("Datei konnte nicht gelesen werden."));
  };

  // Union aller angesammelten Striche = aktuelle Vorauswahl (auf der Karte blau)
  const pendingIds = useMemo(() => {
    const s = new Set<number>();
    for (const st of strokes) for (const id of st.ids) s.add(id);
    return [...s];
  }, [strokes]);
  // freie (noch keinem Gebiet zugeteilte) Häuser der Vorauswahl
  const freeCount = useMemo(
    () => pendingIds.filter((id) => !derived.assignedArea.has(id)).length,
    [pendingIds, derived]
  );

  const onSelection = (ids: number[], polygon: Ring) => {
    if (ids.length === 0) return; // leerer Strich: Werkzeug bleibt aktiv, kein Dialog
    setStrokes((prev) => [...prev, { ids, polygon }]); // Strich anhängen (Stack)
    setShowNaming(true); // Namen-Dialog anzeigen
    setPopup(null);
    // Werkzeug bleibt "lasso", damit weitere Linien hinzugezeichnet werden können
  };

  // „Letzte Linie zurück": obersten Strich entfernen und Karte wieder freigeben
  const undoLastStroke = () => {
    setStrokes((prev) => prev.slice(0, -1));
    setShowNaming(false);
  };

  const onBuildingClick = (id: number, x: number, y: number) => setPopup({ buildingId: id, x, y });

  const setStatus = (
    status: "verteilt" | "gesprochen" | "offen" | "nicht_zustellbar" | "zustellbar",
    note?: string
  ) => {
    if (!popup) return;
    const evs: DemoEvent[] = [{ t: "building_status", buildingId: popup.buildingId, status }];
    // geänderte Notiz gehört zur selben Aktion (gemeinsames Undo)
    if (note !== undefined) evs.push({ t: "building_note", buildingId: popup.buildingId, note });
    dispatch(...evs);
    // Loot-Box-Moment: Blinken + Funken + Bling + Ermutigung — alles in der
    // einheitlichen Statusfarbe (Haus, Blinken, Blase = gleiche Farbfamilie)
    if (status === "verteilt" || status === "gesprochen") {
      const cat: Cat = status === "verteilt" ? "v" : "g";
      bling();
      setFlash({ id: popup.buildingId, ts: Date.now(), color: CAT_FLASH[cat] });
      setCelebration({
        id: newId("c"),
        x: popup.x,
        y: popup.y,
        message: randomEncouragement(),
        bg: CAT_COLORS[cat],
        fg: CAT_TEXT[cat],
      });
    }
    setPopup(null);
  };

  const saveNote = (note: string) => {
    if (!popup) return;
    dispatch({ t: "building_note", buildingId: popup.buildingId, note });
  };

  const setUnits = (units: number) => {
    if (!popup) return;
    dispatch({ t: "building_units", buildingId: popup.buildingId, units });
  };

  const createArea = (opts: { areaName: string; missionarName: string }) => {
    const evs: DemoEvent[] = [];
    // Verteiler mit gleichem Namen wiederverwenden statt Duplikate anzulegen
    const existing = derived.distributors.find(
      (d) => d.name.trim().toLowerCase() === opts.missionarName.toLowerCase()
    );
    let distId: string;
    if (existing) {
      distId = existing.id;
    } else {
      distId = newId("d");
      evs.push({
        t: "distributor_added",
        id: distId,
        name: opts.missionarName,
        color: nextColor(derived.distributors.length),
      });
    }
    // Nur freie Häuser der gesamten Vorauswahl (alle Striche) übernehmen
    const finalIds = pendingIds.filter((id) => !derived.assignedArea.has(id));
    if (finalIds.length > 0) {
      // Umriss = Hüllrechteck aller ausgewählten Häuser (mehrere Striche zusammengefasst)
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const id of finalIds) {
        const c = buildings.get(id)?.c;
        if (!c) continue;
        if (c[0] < minX) minX = c[0];
        if (c[0] > maxX) maxX = c[0];
        if (c[1] < minY) minY = c[1];
        if (c[1] > maxY) maxY = c[1];
      }
      const pad = 0.0004;
      const polygon: Ring =
        strokes.length === 1
          ? strokes[0].polygon // ein Strich → exakte gezeichnete Form
          : [
              [minX - pad, minY - pad],
              [maxX + pad, minY - pad],
              [maxX + pad, maxY + pad],
              [minX - pad, maxY + pad],
              [minX - pad, minY - pad],
            ];
      evs.push({
        t: "area_created",
        id: newId("a"),
        name: opts.areaName,
        distributorId: distId,
        polygon,
        buildingIds: finalIds,
      });
      dispatch(...evs);
      setTool("select"); // Gebiet steht — jetzt Häuser markieren
    }
    setStrokes([]);
    setShowNaming(false);
  };

  const popupData = useMemo(() => {
    if (!popup) return null;
    const b = buildings.get(popup.buildingId);
    if (!b) return null;
    const aid = derived.assignedArea.get(popup.buildingId);
    const area = aid ? derived.areas.find((a) => a.id === aid) : undefined;
    const dist = area?.distributorId
      ? derived.distributors.find((d) => d.id === area.distributorId)
      : undefined;
    const label = area ? `${area.name}${dist ? " · " + dist.name : ""}` : null;
    return {
      b,
      cat: (derived.cat.get(popup.buildingId) ?? "u") as Cat,
      label,
      note: derived.notes.get(popup.buildingId) ?? null,
      units: derived.units.get(popup.buildingId) ?? 1,
    };
  }, [popup, buildings, derived]);

  // Notiz-Labels für die Karte (erste Worte, erscheinen erst bei naher Zoomstufe)
  const notesFC = useMemo(
    () => ({
      type: "FeatureCollection",
      features: [...derived.notes.entries()].flatMap(([id, note]) => {
        const b = buildings.get(id);
        if (!b) return [];
        const text = note.length > 20 ? note.slice(0, 19).trimEnd() + "…" : note;
        return [
          {
            type: "Feature",
            id,
            geometry: { type: "Point", coordinates: b.c },
            properties: { id, text },
          },
        ];
      }),
    }),
    [derived.notes, buildings]
  );

  // Test-/Demo-Haken für programmatische Bedienung (nur Entwicklung/Verifikation)
  useEffect(() => {
    (window as any).__demo = {
      counts: derived.counts,
      eventCount: events.length,
      region: regionKey,
      sheetOpen,
      dispatch: (e: DemoEvent) => dispatch(e),
      buildingIds: () => [...buildings.keys()],
      selectRect: (w: number, s: number, e2: number, n: number) => {
        const ring: Ring = [[w, s], [e2, s], [e2, n], [w, n], [w, s]];
        const ids = [...buildings.values()]
          .filter((b) => b.c[0] >= w && b.c[0] <= e2 && b.c[1] >= s && b.c[1] <= n)
          .map((b) => b.id);
        if (ids.length > 0) onSelection(ids, ring);
        return ids.length;
      },
      pendingCount: freeCount,
      strokeCount: strokes.length,
    };
  });

  return (
    <div className="app">
      <header>
        <div className="titlebar">
          <div className="title-block">
            <strong>Schau in die Bibel / Bibel TV NEXT MISSION Bibelverteil-Plan</strong>
            <span className="subtitle">
              Markiere das Gebiet, in dem du verteilen möchtest, schreib deinen Namen dazu — und
              markiere dann jedes Haus, das schon eine Bibel bekommen hat.
            </span>
          </div>
          <div className="actions">
            <select
              className="region-select"
              value={regionKey}
              onChange={(e) => switchRegion(e.target.value)}
              title="Verteilgebiet wählen"
            >
              {REGIONS.map((r) => (
                <option key={r.key} value={r.key}>
                  {mobile ? r.name.replace(" (ganze Stadt)", "") : r.name}
                </option>
              ))}
            </select>
            <button onClick={undo} disabled={events.length === 0} title="Rückgängig">
              {mobile ? "↶" : "↶ Rückgängig"}
            </button>
            {mobile ? (
              <button onClick={() => setMenuOpen((o) => !o)} title="Mehr">⋮</button>
            ) : (
              <>
                <button onClick={exportState} disabled={events.length === 0}>Export</button>
                <button onClick={() => fileInputRef.current?.click()}>Import</button>
                <button className="danger" onClick={reset} disabled={events.length === 0}>Zurücksetzen</button>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importState(f);
                e.target.value = "";
              }}
            />
            {mobile && menuOpen && (
              <div className="menu-drop" onClick={() => setMenuOpen(false)}>
                <button onClick={exportState} disabled={events.length === 0}>Export</button>
                <button onClick={() => fileInputRef.current?.click()}>Import</button>
                <button className="danger" onClick={reset} disabled={events.length === 0}>Zurücksetzen</button>
              </div>
            )}
          </div>
        </div>
        <KpiBar counts={derived.counts} />
      </header>
      <main>
        <div className="map-wrap">
          {loadError && (
            <div className="load-overlay">
              Gebäudedaten für {region.name} konnten nicht geladen werden ({loadError}).
            </div>
          )}
          {!buildingsFC && !loadError && (
            <div className="load-overlay">Lade Häuser für {region.name} …</div>
          )}
          <MapView
            buildingsFC={buildingsFC}
            notesFC={notesFC}
            cat={derived.cat}
            areas={derived.areas}
            distributors={derived.distributors}
            tool={tool}
            setTool={setTool}
            selectionIds={pendingIds}
            focusArea={focusArea}
            flash={flash}
            onSelection={onSelection}
            onBuildingClick={onBuildingClick}
            onBackgroundClick={() => setPopup(null)}
          />
          {popupData && popup && (
            <StatusPopup
              building={popupData.b}
              cat={popupData.cat}
              areaLabel={popupData.label}
              note={popupData.note}
              units={popupData.units}
              x={popup.x}
              y={popup.y}
              mobile={mobile}
              onSet={setStatus}
              onSaveNote={saveNote}
              onSetUnits={setUnits}
              onClose={() => setPopup(null)}
            />
          )}
          {celebration && (
            <Celebration data={celebration} mobile={mobile} onDone={() => setCelebration(null)} />
          )}
          {/* Vorauswahl vorhanden, aber Dialog ausgeblendet → schwebende Leiste:
              Karte bleibt sichtbar, „letzte Linie zurück" oder weiterzeichnen */}
          {pendingIds.length > 0 && !showNaming && (
            <div className="select-bar">
              <span className="select-count">🏠 {freeCount}{mobile ? "" : " markiert"}</span>
              <button onClick={undoLastStroke}>↩ {mobile ? "Zurück" : "Letzte Linie zurück"}</button>
              <button className="primary" onClick={() => setShowNaming(true)} disabled={freeCount === 0}>
                ✓ Fertig
              </button>
            </div>
          )}
          {showNaming && pendingIds.length > 0 && (
            <AreaDialog
              freeCount={freeCount}
              canUndoLine={strokes.length > 0}
              defaultMissionar={`Verteil-Missionar_${derived.distributors.length + 1}`}
              defaultArea={`Verteilgebiet_${derived.areas.length + 1}`}
              onUndoLine={undoLastStroke}
              onCancel={() => setShowNaming(false)}
              onCreate={createArea}
            />
          )}
        </div>
        <Sidebar
          derived={derived}
          mobile={mobile}
          open={sheetOpen}
          onToggle={() => setSheetOpen((o) => !o)}
          onAddDistributor={(name) =>
            dispatch({ t: "distributor_added", id: newId("d"), name, color: nextColor(derived.distributors.length) })
          }
          onRemoveDistributor={(id) => dispatch({ t: "distributor_removed", id })}
          onAssignArea={(areaId, distributorId) => dispatch({ t: "area_assigned", areaId, distributorId })}
          onDissolveArea={(areaId) => dispatch({ t: "area_dissolved", areaId })}
          onFocusArea={(id) => setFocusArea({ id, ts: Date.now() })}
        />
      </main>
    </div>
  );
}
