import { useEffect, useMemo, useRef, useState } from "react";
import type { Building, Cat, DemoEvent, Ring } from "./types";
import { REGIONS } from "./types";
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

interface Selection {
  ids: number[];
  polygon: Ring;
}
interface PopupState {
  buildingId: number;
  x: number;
  y: number;
}

export default function App() {
  const [regionKey, setRegionKey] = useState<string>(REGIONS[0].key);
  const region = REGIONS.find((r) => r.key === regionKey) ?? REGIONS[0];
  const [buildingsFC, setBuildingsFC] = useState<any | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [events, setEvents] = useState<DemoEvent[]>(() => loadEvents(REGIONS[0].key));
  const [tool, setTool] = useState<Tool>("select");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [focusArea, setFocusArea] = useState<{ id: string; ts: number } | null>(null);
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const [flash, setFlash] = useState<{ id: number; ts: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setSelection(null);
    setPopup(null);
    setCelebration(null);
    setTool("select");
  };

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
    setSelection(null);
  };

  const reset = () => {
    if (confirm(`Demo für „${region.name}" wirklich zurücksetzen? Alle Markierungen, Gebiete und Namen dieses Gebiets gehen verloren.`)) {
      setEvents([]);
      setPopup(null);
      setSelection(null);
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
        setSelection(null);
      })
      .catch(() => alert("Datei konnte nicht gelesen werden."));
  };

  const onSelection = (ids: number[], polygon: Ring) => {
    if (ids.length === 0) return; // leere Auswahl: Werkzeug bleibt aktiv, kein Dialog
    setSelection({ ids, polygon });
    setPopup(null);
    setTool("select");
  };

  const onBuildingClick = (id: number, x: number, y: number) => setPopup({ buildingId: id, x, y });

  const setStatus = (
    status: "verteilt" | "gesprochen" | "offen" | "nicht_zustellbar" | "zustellbar",
    comment?: string
  ) => {
    if (!popup) return;
    const ev: DemoEvent = { t: "building_status", buildingId: popup.buildingId, status };
    if (comment !== undefined) ev.comment = comment;
    dispatch(ev);
    // Loot-Box-Moment: Blinken + Funken + Bling + Ermutigung
    if (status === "verteilt" || status === "gesprochen") {
      bling();
      setFlash({ id: popup.buildingId, ts: Date.now() });
      setCelebration({ id: newId("c"), x: popup.x, y: popup.y, message: randomEncouragement() });
    }
    setPopup(null);
  };

  const createArea = (opts: {
    name: string;
    distributorId: string | null;
    newDistributorName?: string;
    moveAssigned: boolean;
  }) => {
    if (!selection) return;
    const evs: DemoEvent[] = [];
    let distId = opts.distributorId;
    if (opts.newDistributorName) {
      distId = newId("d");
      evs.push({
        t: "distributor_added",
        id: distId,
        name: opts.newDistributorName,
        color: nextColor(derived.distributors.length),
      });
    }
    const finalIds = selection.ids.filter((id) => opts.moveAssigned || !derived.assignedArea.has(id));
    if (finalIds.length > 0) {
      evs.push({
        t: "area_created",
        id: newId("a"),
        name: opts.name,
        distributorId: distId,
        polygon: selection.polygon,
        buildingIds: finalIds,
      });
      dispatch(...evs);
    }
    setSelection(null);
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
      nzComment: derived.nzComment.get(popup.buildingId) ?? null,
    };
  }, [popup, buildings, derived]);

  // Test-/Demo-Haken für programmatische Bedienung (nur Entwicklung/Verifikation)
  useEffect(() => {
    (window as any).__demo = {
      counts: derived.counts,
      eventCount: events.length,
      region: regionKey,
      dispatch: (e: DemoEvent) => dispatch(e),
      buildingIds: () => [...buildings.keys()],
      selectRect: (w: number, s: number, e2: number, n: number) => {
        const ring: Ring = [[w, s], [e2, s], [e2, n], [w, n], [w, s]];
        const ids = [...buildings.values()]
          .filter((b) => b.c[0] >= w && b.c[0] <= e2 && b.c[1] >= s && b.c[1] <= n)
          .map((b) => b.id);
        if (ids.length > 0) setSelection({ ids, polygon: ring });
        return ids.length;
      },
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
                  {r.name}
                </option>
              ))}
            </select>
            <button onClick={undo} disabled={events.length === 0}>↶ Rückgängig</button>
            <button onClick={exportState} disabled={events.length === 0}>Export</button>
            <button onClick={() => fileInputRef.current?.click()}>Import</button>
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
            <button className="danger" onClick={reset} disabled={events.length === 0}>Zurücksetzen</button>
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
            cat={derived.cat}
            areas={derived.areas}
            distributors={derived.distributors}
            tool={tool}
            setTool={setTool}
            selectionIds={selection?.ids ?? null}
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
              nzComment={popupData.nzComment}
              x={popup.x}
              y={popup.y}
              onSet={setStatus}
              onClose={() => setPopup(null)}
            />
          )}
          {celebration && <Celebration data={celebration} onDone={() => setCelebration(null)} />}
          {selection && (
            <AreaDialog
              selection={selection}
              buildings={buildings}
              derived={derived}
              defaultName={`Gebiet ${events.filter((e) => e.t === "area_created").length + 1}`}
              onCancel={() => setSelection(null)}
              onCreate={createArea}
            />
          )}
        </div>
        <Sidebar
          derived={derived}
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
