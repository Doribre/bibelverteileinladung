import { useState } from "react";

interface Props {
  /** freie Häuser der gesamten Vorauswahl (alle Striche) */
  freeCount: number;
  /** ob ein Strich zum Zurücknehmen da ist */
  canUndoLine: boolean;
  /** Vorschlag „Verteil-Missionar_N" */
  defaultMissionar: string;
  /** Vorschlag „Verteilgebiet_N" */
  defaultArea: string;
  onUndoLine: () => void;
  onCreate: (opts: { areaName: string; missionarName: string }) => void;
  onCancel: () => void;
}

/**
 * POC-Dialog: zwei vorausgefüllte Felder (Verteiler + Gebietsname), Ein-Klick-Start.
 * Kein Autofokus → auf dem Handy klappt keine Tastatur auf. Dazu ein weniger
 * prominenter „Letzte Linie zurück"-Knopf für den Vermalt-Fall.
 */
export default function AreaDialog({
  freeCount,
  canUndoLine,
  defaultMissionar,
  defaultArea,
  onUndoLine,
  onCreate,
  onCancel,
}: Props) {
  const [missionar, setMissionar] = useState(defaultMissionar);
  const [area, setArea] = useState(defaultArea);
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
          <button className="ghost" disabled={!canUndoLine} onClick={onUndoLine}>
            ↩ Letzte Linie zurück
          </button>
          <button className="primary" disabled={!canSubmit} onClick={submit}>
            Los geht's ✏️
          </button>
        </div>
      </div>
    </div>
  );
}
