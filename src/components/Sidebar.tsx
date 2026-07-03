import { useState } from "react";
import type { Derived } from "../types";

interface Props {
  derived: Derived;
  onAddDistributor: (name: string) => void;
  onRemoveDistributor: (id: string) => void;
  onAssignArea: (areaId: string, distributorId: string | null) => void;
  onDissolveArea: (areaId: string) => void;
  onFocusArea: (areaId: string) => void;
}

export default function Sidebar({
  derived,
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

  return (
    <aside className="sidebar">
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
            Noch keine Verteiler. Namen anlegen — oder direkt über „Markiere dein
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
            const pct = a.memberIds.length > 0 ? Math.round((a.done / a.memberIds.length) * 100) : 0;
            return (
              <li key={a.id} className="area">
                <div className="area-head">
                  <i className="dot" style={{ background: d?.color ?? "#64748b" }} />
                  <button className="link grow" onClick={() => onFocusArea(a.id)} title="Auf Karte zeigen">
                    {a.name}
                  </button>
                  <span className="hint">
                    {a.memberIds.length} Häuser · {pct} %
                  </span>
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
                <div className="progress">
                  <i style={{ width: pct + "%" }} />
                </div>
                <select
                  value={a.distributorId ?? ""}
                  onChange={(e) => onAssignArea(a.id, e.target.value || null)}
                >
                  <option value="">— kein Verteiler —</option>
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
        Demonstrator (Stufe 1) · Gebäudedaten: © OpenStreetMap-Mitwirkende (ODbL) ·
        Stand lebt nur in dieser Browser-Sitzung — dauerhaft sichern über „Export".
      </footer>
    </aside>
  );
}
