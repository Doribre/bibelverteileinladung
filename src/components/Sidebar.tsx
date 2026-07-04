import { useEffect, useRef, useState } from "react";
import type { Derived } from "../types";

/** Zahl mit Hochzähl-Effekt: läuft in ~0,9 s vom alten zum neuen Wert */
export function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    prevRef.current = value;
    if (from === to) {
      setDisplay(to);
      return;
    }
    const t0 = performance.now();
    const duration = 900;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{display}</>;
}

interface Props {
  derived: Derived;
  mobile: boolean;
  open: boolean;
  onToggle: () => void;
  onAddDistributor: (name: string) => void;
  onRemoveDistributor: (id: string) => void;
  onAssignArea: (areaId: string, distributorId: string | null) => void;
  onDissolveArea: (areaId: string) => void;
  onFocusArea: (areaId: string) => void;
}

export default function Sidebar({
  derived,
  mobile,
  open,
  onToggle,
  onAddDistributor,
  onRemoveDistributor,
  onAssignArea,
  onDissolveArea,
  onFocusArea,
}: Props) {
  const [name, setName] = useState("");
  const add = () => {
    const n = name.trim();
    if (n) {
      onAddDistributor(n);
      setName("");
    }
  };
  const housesFor = (id: string) =>
    derived.areas
      .filter((a) => a.distributorId === id)
      .reduce((s, a) => s + a.memberIds.length, 0);

  // Fortschritt über die eigenen (= alle) Gebiete – Kern der Handy-Kurzansicht
  const agg = derived.areas.reduce(
    (s, a) => ({
      done: s.done + a.done,
      total: s.total + a.memberIds.length,
      unitsDone: s.unitsDone + a.unitsDone,
      unitsTotal: s.unitsTotal + a.unitsTotal,
    }),
    { done: 0, total: 0, unitsDone: 0, unitsTotal: 0 }
  );
  const aggPct = agg.total > 0 ? Math.round((agg.done / agg.total) * 100) : 0;

  return (
    <aside className={`sidebar${mobile ? " sheet" : ""}${mobile && open ? " open" : ""}`}>
      {mobile && (
        <div className="sheet-handle" onClick={onToggle}>
          <i className="sheet-grip" />
          {agg.total > 0 ? (
            <div className="sheet-summary">
              <span className="sheet-pct" style={{ color: aggPct === 100 ? "#16a34a" : "#0f172a" }}>
                <CountUp value={aggPct} />%
              </span>
              <div className="sheet-mid">
                <div className="progress big">
                  <i style={{ width: aggPct + "%" }} />
                </div>
                <span className="sheet-counts">
                  🏠 <CountUp value={agg.done} />/{agg.total} Häuser · 📮{" "}
                  <CountUp value={agg.unitsDone} />/{agg.unitsTotal} Wohnungen
                  {aggPct === 100 && " · 🎉"}
                </span>
              </div>
              <span className={`chevron${open ? " up" : ""}`}>▾</span>
            </div>
          ) : (
            <div className="sheet-summary">
              <span className="sheet-empty">✏️ Male eine Linie um dein Verteil-Gebiet</span>
              <span className={`chevron${open ? " up" : ""}`}>▾</span>
            </div>
          )}
        </div>
      )}
      <div className="sheet-body">
        <section>
          <h2>
            Verteiler <span className="hint">(nur für diese Sitzung)</span>
          </h2>
          <div className="add-row">
            <input
              value={name}
              placeholder="Name, z. B. Familie Weber"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
            <button onClick={add} disabled={!name.trim()}>Anlegen</button>
          </div>
          {derived.distributors.length === 0 && (
            <p className="empty">
              Noch keine Verteiler. Namen anlegen – oder direkt über „Markiere dein
              Verteil-Gebiet" einen Bereich umfahren und den Namen dort vergeben.
            </p>
          )}
          <ul>
            {derived.distributors.map((d) => (
              <li key={d.id}>
                <i className="dot" style={{ background: d.color }} />
                <span className="grow">{d.name}</span>
                <span className="hint">{housesFor(d.id)} Häuser</span>
                <button className="x" title="Entfernen" onClick={() => onRemoveDistributor(d.id)}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2>Gebiete</h2>
          {derived.areas.length === 0 && (
            <p className="empty">
              Noch keine Gebiete. Oben „Markiere dein Verteil-Gebiet" wählen und einen
              Bereich auf der Karte umfahren.
            </p>
          )}
          <ul>
            {derived.areas.map((a) => {
              const d = derived.distributors.find((x) => x.id === a.distributorId);
              const pct =
                a.memberIds.length > 0 ? Math.round((a.done / a.memberIds.length) * 100) : 0;
              return (
                <li key={a.id} className="area">
                  <div className="area-head">
                    <i className="dot" style={{ background: d?.color ?? "#64748b" }} />
                    <button
                      className="link grow"
                      onClick={() => onFocusArea(a.id)}
                      title="Auf Karte zeigen"
                    >
                      {a.name}
                    </button>
                    <button
                      className="x"
                      title="Gebiet auflösen"
                      onClick={() => {
                        if (
                          confirm(
                            `Gebiet „${a.name}" auflösen? Häuser ohne Ergebnis werden wieder „Unerreicht".`
                          )
                        ) {
                          onDissolveArea(a.id);
                        }
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <div className="area-progress-big">
                    <span className="area-pct" style={{ color: pct === 100 ? "#16a34a" : "#0f172a" }}>
                      <CountUp value={pct} /> %
                    </span>
                    <span className="area-frac">
                      <CountUp value={a.done} /> von {a.memberIds.length} Häusern
                      {" · "}📮 <CountUp value={a.unitsDone} /> von {a.unitsTotal} Wohnungen
                    </span>
                    {pct === 100 && <span className="area-done">🎉 Geschafft!</span>}
                  </div>
                  <div className="progress big">
                    <i style={{ width: pct + "%" }} />
                  </div>
                  <select
                    value={a.distributorId ?? ""}
                    onChange={(e) => onAssignArea(a.id, e.target.value || null)}
                  >
                    <option value="">– kein Verteiler –</option>
                    {derived.distributors.map((d2) => (
                      <option key={d2.id} value={d2.id}>
                        {d2.name}
                      </option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>
        </section>
        <footer>
          Bereitgestellt von Bibel TV NEXT MISSION · Gebäudedaten © OpenStreetMap-Mitwirkende
          (ODbL) · Prototyp – der Stand lebt nur in dieser Browser-Sitzung.
        </footer>
      </div>
    </aside>
  );
}
