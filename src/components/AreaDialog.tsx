import { useState } from "react";

interface Props {
  /** freie Häuser der gesamten Vorauswahl (alle Striche) */
  freeCount: number;
  /** ob ein Strich zum Zurücknehmen da ist */
  canUndoLine: boolean;
  /** Vorschlag „Verteil-Missionar_N" für einen neuen Namen */
  defaultMissionar: string;
  /** Vorschlag „Verteilgebiet_N" */
  defaultArea: string;
  /** bereits angelegte Verteiler (aus der Seitenleiste oder früheren Gebieten) */
  distributors: { id: string; name: string }[];
  onUndoLine: () => void;
  onCreate: (opts: { areaName: string; missionarName: string }) => void;
  onCancel: () => void;
}

const NEW = "__new";

/**
 * POC-Dialog. Verteiler-Auswahl:
 * - Gibt es schon Verteiler → Dropdown, vorausgewählt der zuletzt angelegte;
 *   umschaltbar auf „Neuen Namen anlegen" (Textfeld).
 * - Gibt es keinen → einfaches Textfeld mit Vorschlag „Verteil-Missionar_N".
 * Kein Autofokus im Grundzustand → auf dem Handy klappt keine Tastatur auf.
 */
export default function AreaDialog({
  freeCount,
  canUndoLine,
  defaultMissionar,
  defaultArea,
  distributors,
  onUndoLine,
  onCreate,
  onCancel,
}: Props) {
  const hasDistributors = distributors.length > 0;
  const [area, setArea] = useState(defaultArea);
  // Vorauswahl: zuletzt angelegter Verteiler; ohne Verteiler direkt „neu"
  const [choice, setChoice] = useState<string>(
    hasDistributors ? distributors[distributors.length - 1].id : NEW
  );
  const [newName, setNewName] = useState(defaultMissionar);

  const missionarName = (): string => {
    if (choice === NEW) return newName.trim();
    return distributors.find((d) => d.id === choice)?.name ?? "";
  };
  const canSubmit = freeCount > 0 && area.trim() !== "" && missionarName() !== "";
  const submit = () => {
    if (canSubmit) onCreate({ areaName: area.trim(), missionarName: missionarName() });
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
          {hasDistributors ? (
            <select value={choice} onChange={(e) => setChoice(e.target.value)}>
              {distributors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
              <option value={NEW}>+ Neuen Namen anlegen …</option>
            </select>
          ) : (
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onFocus={(e) => e.target.select()}
            />
          )}
        </label>

        {hasDistributors && choice === NEW && (
          <label>
            Neuer Name
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onFocus={(e) => e.target.select()}
            />
          </label>
        )}

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
            ↩ Zurück
          </button>
          <button className="primary" disabled={!canSubmit} onClick={submit}>
            Los geht's ✏️
          </button>
        </div>
      </div>
    </div>
  );
}
