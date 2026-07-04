import { useMemo, useState } from "react";
import type { Building, Derived, Ring } from "../types";

interface Props {
  selection: { ids: number[]; polygon: Ring };
  buildings: Map<number, Building>;
  derived: Derived;
  /** Vorschlag „Verteil-Missionar_N" */
  defaultMissionar: string;
  /** Vorschlag „Verteilgebiet_N" */
  defaultArea: string;
  onCreate: (opts: { areaName: string; missionarName: string }) => void;
  onCancel: () => void;
}

/**
 * POC-Dialog: bewusst nur zwei vorausgefüllte Felder (Verteiler + Gebietsname).
 * Kein Autofokus → auf dem Handy klappt keine Tastatur auf; der Nutzer bestätigt
 * die Vorschläge mit einem Klick und legt sofort los. Tippt er in ein Feld,
 * erscheint die Tastatur wie gewohnt.
 */
export default function AreaDialog({
  selection,
  buildings,
  derived,
  defaultMissionar,
  defaultArea,
  onCreate,
  onCancel,
}: Props) {
  const [missionar, setMissionar] = useState(defaultMissionar);
  const [area, setArea] = useState(defaultArea);

  // Wie viele der ausgewählten Häuser sind noch frei (nicht in anderem Gebiet)?
  const freeCount = useMemo(
    () => selection.ids.filter((id) => !derived.assignedArea.has(id)).length,
    [selection, derived]
  );
  const canSubmit = freeCount > 0 && missionar.trim() !== "" && area.trim() !== "";

  const submit = () => {
    if (canSubmit) onCreate({ areaName: area.trim(), missionarName: missionar.trim() });
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Neues Verteilgebiet</h2>
        <p>
          <strong>{freeCount}</strong> Häuser ausgewählt — los geht's!
        </p>
        <label>
          Wer verteilt hier?
          <input
            value={missionar}
            onChange={(e) => setMissionar(e.target.value)}
            onFocus={(e) => e.target.select()}
          />
        </label>
        <label>
          Name des Gebiets
          <input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </label>
        <div className="modal-actions">
          <button onClick={onCancel}>Abbrechen</button>
          <button className="primary" disabled={!canSubmit} onClick={submit}>
            Los geht's ✏️
          </button>
        </div>
      </div>
    </div>
  );
}
