import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { closeRing, pointInPolygon, ringBbox, segmentIntersection } from "../geo";
import type { AreaView, Cat, Distributor, Ring } from "../types";
import { CAT_COLORS, CAT_LABELS } from "../types";

export type Tool = "select" | "lasso" | "poly";

interface Props {
  buildingsFC: any | null;
  cat: Map<number, Cat>;
  areas: AreaView[];
  distributors: Distributor[];
  tool: Tool;
  setTool: (t: Tool) => void;
  selectionIds: number[] | null;
  focusArea: { id: string; ts: number } | null;
  /** Loot-Box-Blinken des zuletzt markierten Hauses */
  flash: { id: number; ts: number } | null;
  onSelection: (ids: number[], polygon: Ring) => void;
  onBuildingClick: (id: number, x: number, y: number) => void;
  onBackgroundClick: () => void;
}

const EMPTY_FC: any = { type: "FeatureCollection", features: [] };

// Statusfarbe mit Blink-Übersteuerung (feature-state "flash")
const COLOR_EXPR: any = [
  "case",
  ["boolean", ["feature-state", "flash"], false],
  "#ffe066",
  [
    "match",
    ["coalesce", ["feature-state", "cat"], "u"],
    "z", CAT_COLORS.z,
    "v", CAT_COLORS.v,
    "g", CAT_COLORS.g,
    "n", CAT_COLORS.n,
    CAT_COLORS.u,
  ],
];

const SEL_COLOR: any = ["case", ["boolean", ["feature-state", "sel"], false], "#0369a1", "#334155"];

export default function MapView(props: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [styleReady, setStyleReady] = useState(false);
  const [bldReady, setBldReady] = useState(false);
  const [polyActive, setPolyActive] = useState(false);
  const propsRef = useRef(props);
  propsRef.current = props;
  const polyPoints = useRef<Ring>([]);
  const prevCat = useRef<Map<number, Cat>>(new Map());
  const prevSel = useRef<Set<number>>(new Set());
  const finishPolyRef = useRef<() => void>(() => {});
  const cancelPolyRef = useRef<() => void>(() => {});

  // Karte einmalig initialisieren
  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current!,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            maxzoom: 19,
            attribution: "© OpenStreetMap-Mitwirkende (ODbL)",
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
            paint: { "raster-saturation": -0.9, "raster-opacity": 0.8 },
          },
        ],
      },
      center: [7.155, 50.685],
      zoom: 13,
    });
    mapRef.current = map;
    (window as any).__map = map; // Dev-/Test-Haken (nur Demonstrator)
    map.on("error", (e) => console.warn("Kartenfehler:", (e as any).error?.message ?? e));
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    const updateDraw = (pts: Ring) => {
      const src = map.getSource("draw") as maplibregl.GeoJSONSource | undefined;
      if (!src) return;
      const features: any[] = [];
      if (pts.length >= 2) {
        features.push({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [...pts, pts[0]] },
        });
      }
      if (pts.length >= 3) {
        features.push({
          type: "Feature",
          properties: {},
          geometry: { type: "Polygon", coordinates: [closeRing(pts)] },
        });
      }
      src.setData({ type: "FeatureCollection", features });
    };
    const clearDraw = () => {
      const src = map.getSource("draw") as maplibregl.GeoJSONSource | undefined;
      if (src) src.setData(EMPTY_FC);
    };

    // Mittelpunkt eines Features (Polygon: Schwerpunkt-Property, Punkt: Geometrie)
    const centerOf = (f: any): [number, number] | null =>
      f.properties.c ?? (f.geometry.type === "Point" ? f.geometry.coordinates : null);

    // Gebäude mit Schwerpunkt in der Fläche (Mittelpunkt-Regel)
    const computeIds = (ring: Ring): number[] => {
      const [minX, minY, maxX, maxY] = ringBbox(ring);
      const ids: number[] = [];
      for (const f of propsRef.current.buildingsFC?.features ?? []) {
        const c = centerOf(f);
        if (!c || c[0] < minX || c[0] > maxX || c[1] < minY || c[1] > maxY) continue;
        if (pointInPolygon(c, ring)) ids.push(f.properties.id as number);
      }
      return ids;
    };

    // Auswahl abschließen (Loslassen ohne Kreuzung: Linie automatisch schließen)
    const finishRing = (pts: Ring) => {
      clearDraw();
      if (pts.length < 3) return;
      const ring = closeRing(pts);
      propsRef.current.onSelection(computeIds(ring), ring);
    };

    /**
     * Kreuzt das neue Liniensegment die bisherige Linie, ist das Gebiet gemalt:
     * Rückgabe der umschlossenen Schleife — aber nur, wenn sie auch Häuser enthält
     * (verhindert Auslösen durch winzige versehentliche Kringel).
     */
    const detectLoop = (pts: Ring, p: [number, number]): { ring: Ring; ids: number[] } | null => {
      const n = pts.length;
      if (n < 3) return null;
      for (let i = 0; i < n - 2; i++) {
        const x = segmentIntersection(pts[i], pts[i + 1], pts[n - 1], p);
        if (!x) continue;
        const ring: Ring = [x, ...pts.slice(i + 1), x];
        if (ring.length < 4) continue;
        const ids = computeIds(ring);
        if (ids.length > 0) return { ring, ids };
      }
      return null;
    };

    finishPolyRef.current = () => {
      // Doppelklick fügt doppelte Punkte hinzu — aufeinanderfolgende Duplikate entfernen
      const pts = polyPoints.current.filter(
        (p, i, arr) => i === 0 || p[0] !== arr[i - 1][0] || p[1] !== arr[i - 1][1]
      );
      polyPoints.current = [];
      setPolyActive(false);
      finishRing(pts);
    };
    cancelPolyRef.current = () => {
      polyPoints.current = [];
      setPolyActive(false);
      clearDraw();
    };

    // Wichtig: "style.load" statt "load" — "load" wartet auch auf die Basiskarten-
    // Kacheln des externen Servers; die App-Ebenen (Gebäude, Gebiete) dürfen davon
    // nicht abhängen. Der Style ist inline und damit sofort verfügbar.
    map.on("style.load", () => {
      map.addSource("areas", { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: "areas-fill",
        type: "fill",
        source: "areas",
        paint: { "fill-color": ["get", "color"], "fill-opacity": 0.06 },
      });
      map.addLayer({
        id: "areas-line",
        type: "line",
        source: "areas",
        paint: { "line-color": ["get", "color"], "line-width": 3 },
      });
      map.addSource("draw", { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: "draw-fill",
        type: "fill",
        source: "draw",
        paint: { "fill-color": "#0ea5e9", "fill-opacity": 0.1 },
      });
      map.addLayer({
        id: "draw-line",
        type: "line",
        source: "draw",
        paint: { "line-color": "#0284c7", "line-width": 2, "line-dasharray": [2, 1.5] },
      });
      setStyleReady(true);
    });

    map.on("mousemove", (e) => {
      if (propsRef.current.tool !== "select" || !map.getLayer("bld-fill")) return;
      const feats = map.queryRenderedFeatures(e.point, { layers: ["bld-fill", "bld-point"] });
      map.getCanvas().style.cursor = feats.length > 0 ? "pointer" : "";
    });

    map.on("click", (e) => {
      const t = propsRef.current.tool;
      if (t === "poly") {
        polyPoints.current = [...polyPoints.current, [e.lngLat.lng, e.lngLat.lat]];
        setPolyActive(true);
        updateDraw(polyPoints.current);
        return;
      }
      if (t !== "select" || !map.getLayer("bld-fill")) return;
      const feats = map.queryRenderedFeatures(e.point, { layers: ["bld-fill", "bld-point"] });
      if (feats.length > 0) {
        propsRef.current.onBuildingClick(Number(feats[0].id), e.point.x, e.point.y);
      } else {
        propsRef.current.onBackgroundClick();
      }
    });

    map.on("dblclick", (e) => {
      if (propsRef.current.tool === "poly") {
        e.preventDefault();
        finishPolyRef.current();
      }
    });

    // Zeichnen: Linie mit gedrückter Maustaste (oder Finger) ziehen.
    // Kreuzt sich die Linie, ist das umschlossene Gebiet sofort ausgewählt;
    // Loslassen ohne Kreuzung schließt die Linie automatisch.
    const startStroke = (
      start: [number, number],
      moveEvent: "mousemove" | "touchmove",
      endEvent: "mouseup" | "touchend"
    ) => {
      const map2 = mapRef.current!;
      const pts: Ring = [start];
      let finished = false;
      // Loslassen außerhalb der Karte (Sidebar, Fensterrand) und abgebrochene
      // Touch-Gesten müssen den Strich ebenfalls beenden — sonst malt er beim
      // Zurückkehren des Zeigers weiter (Review-Fund #2)
      const winEvents: string[] = moveEvent === "mousemove" ? ["mouseup"] : ["touchend", "touchcancel"];
      const stop = () => {
        finished = true;
        map2.off(moveEvent, move);
        map2.off(endEvent, end);
        for (const t of winEvents) window.removeEventListener(t, end);
      };
      const move = (ev: any) => {
        if (finished) return;
        const p: [number, number] = [ev.lngLat.lng, ev.lngLat.lat];
        const loop = detectLoop(pts, p);
        if (loop) {
          stop();
          clearDraw();
          propsRef.current.onSelection(loop.ids, loop.ring);
          return;
        }
        pts.push(p);
        updateDraw(pts);
      };
      const end = () => {
        if (finished) return;
        stop();
        finishRing(pts);
      };
      map2.on(moveEvent, move);
      map2.on(endEvent, end);
      for (const t of winEvents) window.addEventListener(t, end);
    };
    map.on("mousedown", (e) => {
      if (propsRef.current.tool !== "lasso") return;
      e.preventDefault();
      startStroke([e.lngLat.lng, e.lngLat.lat], "mousemove", "mouseup");
    });
    map.on("touchstart", (e) => {
      if (propsRef.current.tool !== "lasso") return;
      e.preventDefault();
      startStroke([e.lngLat.lng, e.lngLat.lat], "touchmove", "touchend");
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Gebäude-Schicht hinzufügen bzw. beim Gebietswechsel austauschen
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady || !props.buildingsFC) return;
    const existing = map.getSource("bld") as maplibregl.GeoJSONSource | undefined;
    if (existing) {
      // Gebietswechsel: Daten tauschen, alle Feature-Zustände verwerfen
      map.removeFeatureState({ source: "bld" });
      prevCat.current = new Map();
      prevSel.current = new Set();
      existing.setData(props.buildingsFC);
    } else {
      map.addSource("bld", { type: "geojson", data: props.buildingsFC, promoteId: "id" });
      // Polygone (Bad Godesberg) …
      map.addLayer(
        {
          id: "bld-fill",
          type: "fill",
          source: "bld",
          filter: ["==", ["geometry-type"], "Polygon"],
          paint: { "fill-color": COLOR_EXPR, "fill-opacity": 0.8 },
        },
        "areas-fill"
      );
      map.addLayer(
        {
          id: "bld-line",
          type: "line",
          source: "bld",
          filter: ["==", ["geometry-type"], "Polygon"],
          paint: {
            "line-color": SEL_COLOR,
            "line-width": ["case", ["boolean", ["feature-state", "sel"], false], 2.5, 0.4],
          },
        },
        "areas-fill"
      );
      // … und Punkte (großflächige Gebiete wie Hamburg)
      map.addLayer(
        {
          id: "bld-point",
          type: "circle",
          source: "bld",
          filter: ["==", ["geometry-type"], "Point"],
          paint: {
            "circle-color": COLOR_EXPR,
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 1, 12, 2, 14, 3.5, 17, 8],
            "circle-stroke-width": ["case", ["boolean", ["feature-state", "sel"], false], 2, 0.3],
            "circle-stroke-color": SEL_COLOR,
          },
        },
        "areas-fill"
      );
    }
    // auf Datenausdehnung zoomen — über 0,5 %-Quantile, damit einzelne Ausreißer
    // (z. B. Hamburgs Nordsee-Insel Neuwerk) den Ausschnitt nicht aufziehen
    const xs: number[] = [], ys: number[] = [];
    for (const f of props.buildingsFC.features) {
      const c = f.properties.c ?? (f.geometry.type === "Point" ? f.geometry.coordinates : null);
      if (!c) continue;
      xs.push(c[0]);
      ys.push(c[1]);
    }
    if (xs.length > 1) {
      xs.sort((a, b) => a - b);
      ys.sort((a, b) => a - b);
      const q = (arr: number[], p: number) => arr[Math.max(0, Math.min(arr.length - 1, Math.round(p * (arr.length - 1))))];
      map.fitBounds(
        [[q(xs, 0.005), q(ys, 0.005)], [q(xs, 0.995), q(ys, 0.995)]],
        { padding: 40, duration: 0 }
      );
    }
    setBldReady(true);
  }, [styleReady, props.buildingsFC]);

  // Loot-Box-Blinken: markiertes Haus 3× aufleuchten lassen
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !bldReady || !props.flash) return;
    const id = props.flash.id;
    const timers: number[] = [];
    for (let i = 0; i < 7; i++) {
      timers.push(
        window.setTimeout(() => {
          try {
            map.setFeatureState({ source: "bld", id }, { flash: i % 2 === 0 });
          } catch {
            /* Quelle ggf. gerade getauscht */
          }
        }, i * 160)
      );
    }
    return () => {
      timers.forEach(clearTimeout);
      try {
        map.setFeatureState({ source: "bld", id }, { flash: false });
      } catch {
        /* s. o. */
      }
    };
  }, [props.flash, bldReady]);

  // Status-Farben aktualisieren (nur Differenzen)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !bldReady) return;
    const prev = prevCat.current;
    props.cat.forEach((v, id) => {
      if (prev.get(id) !== v) map.setFeatureState({ source: "bld", id }, { cat: v });
    });
    prev.forEach((_, id) => {
      if (!props.cat.has(id)) map.setFeatureState({ source: "bld", id }, { cat: "u" });
    });
    prevCat.current = new Map(props.cat);
  }, [props.cat, bldReady]);

  // Auswahl-Hervorhebung (nur Differenzen)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !bldReady) return;
    const next = new Set(props.selectionIds ?? []);
    const prev = prevSel.current;
    next.forEach((id) => {
      if (!prev.has(id)) map.setFeatureState({ source: "bld", id }, { sel: true });
    });
    prev.forEach((id) => {
      if (!next.has(id)) map.setFeatureState({ source: "bld", id }, { sel: false });
    });
    prevSel.current = next;
  }, [props.selectionIds, bldReady]);

  // Gebiets-Umrandungen zeichnen
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) return;
    const src = map.getSource("areas") as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    const colorOf = (id: string | null) =>
      props.distributors.find((d) => d.id === id)?.color ?? "#64748b";
    src.setData({
      type: "FeatureCollection",
      features: props.areas.map((a) => ({
        type: "Feature",
        properties: { color: colorOf(a.distributorId), name: a.name },
        geometry: { type: "Polygon", coordinates: [closeRing(a.polygon)] },
      })),
    });
  }, [props.areas, props.distributors, styleReady]);

  // Werkzeugwechsel: Kartenverhalten anpassen
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (props.tool === "lasso") map.dragPan.disable();
    else map.dragPan.enable();
    if (props.tool === "poly") map.doubleClickZoom.disable();
    else map.doubleClickZoom.enable();
    map.getCanvas().style.cursor = props.tool === "select" ? "" : "crosshair";
    if (props.tool !== "poly") cancelPolyRef.current();
  }, [props.tool]);

  // Tastatur: Esc bricht ab, Enter schließt Polygon
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cancelPolyRef.current();
        propsRef.current.setTool("select");
      }
      if (e.key === "Enter" && propsRef.current.tool === "poly") finishPolyRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Auf Gebiet zoomen
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !props.focusArea) return;
    const a = props.areas.find((x) => x.id === props.focusArea!.id);
    if (!a) return;
    const [minX, minY, maxX, maxY] = ringBbox(a.polygon);
    map.fitBounds([[minX, minY], [maxX, maxY]], { padding: 80, duration: 500, maxZoom: 17 });
  }, [props.focusArea]);

  return (
    <div className="map-view">
      <div ref={containerRef} className="map-canvas" />
      <div className="toolbar">
        <button
          className={props.tool === "select" ? "active" : ""}
          onClick={() => props.setTool("select")}
          title="Häuser anklicken und Status setzen"
        >
          🖱️ Auswählen
        </button>
        <button
          className={props.tool === "lasso" ? "active" : ""}
          onClick={() => props.setTool("lasso")}
          title="Linie um den Bereich ziehen — kreuzt sie sich, ist das Gebiet ausgewählt"
        >
          ✏️ Gebiet zeichnen
        </button>
        <button
          className={props.tool === "poly" ? "active" : ""}
          onClick={() => props.setTool("poly")}
          title="Eckpunkte anklicken, Doppelklick beendet"
        >
          ⬠ Polygon
        </button>
        {polyActive && (
          <>
            <button className="ok" onClick={() => finishPolyRef.current()}>✓ Fertig</button>
            <button onClick={() => cancelPolyRef.current()}>✕ Abbrechen</button>
          </>
        )}
      </div>
      <div className="legend">
        {(["u", "z", "v", "g", "n"] as Cat[]).map((c) => (
          <span key={c}>
            <i style={{ background: CAT_COLORS[c] }} /> {CAT_LABELS[c]}
          </span>
        ))}
      </div>
      {props.tool !== "select" && (
        <div className="tool-hint">
          {props.tool === "lasso"
            ? "Einfach eine Linie um den Bereich malen — sobald sie sich kreuzt, ist das Gebiet ausgewählt. Loslassen schließt ebenfalls."
            : "Eckpunkte anklicken · Doppelklick oder Enter schließt das Gebiet · Esc bricht ab."}
        </div>
      )}
    </div>
  );
}
