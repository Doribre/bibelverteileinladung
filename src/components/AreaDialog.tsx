import { useMemo, useState } from "react";
import type { Building, Derived, Ring } from "../types";
import { summarizeStreets } from "../streets";

interface Props {
  selection: { ids: number[]; polygon: Ring };
  buildings: Map<number, Building>;
  derived: Derived;
  defaultName: string;
  onCreate: (opts: {
    name: string;
    distributorId: string | null;
    newDistributorName?: string;
    moveAssigned: boolean;
  }) => void;
  onCancel: () => void;
}

export default function AreaDialog({
  selection,
  buildings,
  derived,
  defaultName,
  onCreate,
  onCancel,
}: Props) {
  const [name, setName] = useState(defaultName);
  const [choice, setChoice] = useState<string>(
    derived.distributors.length > 0 ? derived.distributors[0].id : "__new"
  );
  const [newName, setNewName] = useState("");
  const [moveAssigned, setMoveAssigned] = useState(false);

  const selBuildings = useMemo(
    () => selection.ids.map((id) => buildings.get(id)).filter((b): b is Building => !!b),
    [selection, buildings]
  );
  const streets = useMemo(() => summarizeStreets(selBuildings), [selBuildings]);
  const alreadyAssigned = useMemo(
    () => selection.ids.filter((id) => derived.assignedArea.has(id)),
    [selection, derived]
  );
  const effective = selection.ids.length - (moveAssigned ? 0 : alreadyAssigned.length);
  const canSubmit =
    effective > 0 && name.trim() !== "" && (choice !== "__new" || newName.trim() !== "");

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Neues Gebiet</h2>
        <p>
          <strong>{selection.ids.length}</strong> Häuser ausgewählt
          {alreadyAssigned.length > 0 && (
            <>
              {" "}— davon <strong>{alreadyAssigned.length}</strong> bereits zugeteilt
            </>
          )}
        </p>
        {alreadyAssigned.length > 0 && (
          <label className="check">
            <input
              type="checkbox"
              checked={moveAssigned}
              onChange={(e) => setMoveAssigned(e.target.checked)}
            />
            Bereits zugeteilte Häuser in dieses Gebiet verschieben
          </label>
        )}
        <div className="streets">
          {streets.slice(0, 8).map((s) => (
            <div key={s.street}>
              <span>
                {s.street}
                {s.range && ` ${s.range}`}
              </span>
              <span className="hint">{s.count}</span>
            </div>
          ))}
          {streets.length > 8 && (
            <div className="hint">… und {streets.length - 8} weitere Straßen</div>
          )}
        </div>
        <label>
          Gebietsname
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Verteiler
          <select value={choice} onChange={(e) => setChoice(e.target.value)}>
            <option value="">— noch niemand —</option>
            {derived.distributors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
            <option value="__new">+ Neuer Name …</option>
          </select>
        </label>
        {choice === "__new" && (
          <label>
            Neuer Verteiler-Name
            <input
              autoFocus
              value={newName}
              placeholder="z. B. Team Nord"
              onChange={(e) => setNewName(e.target.value)}
            />
          </label>
        )}
        <div className="modal-actions">
          <button onClick={onCancel}>Abbrechen</button>
          <button
            className="primary"
            disabled={!canSubmit}
            onClick={() =>
              onCreate({
                name: name.trim(),
                distributorId: choice && choice !== "__new" ? choice : null,
                newDistributorName: choice === "__new" ? newName.trim() : undefined,
                moveAssigned,
              })
            }
          >
            Gebiet anlegen ({effective} Häuser)
          </button>
        </div>
      </div>
    </div>
  );
}
