import { useEffect, useState } from "react";
import type { Building, Cat } from "../types";
import { CAT_COLORS, CAT_LABELS } from "../types";

interface Props {
  building: Building;
  cat: Cat;
  areaLabel: string | null;
  note: string | null;
  units: number;
  x: number;
  y: number;
  /** Handy: als Bottom-Sheet statt schwebendem Fenster */
  mobile: boolean;
  onSet: (
    status: "verteilt" | "gesprochen" | "offen" | "nicht_zustellbar" | "zustellbar",
    note?: string
  ) => void;
  onSaveNote: (note: string) => void;
  onSetUnits: (units: number) => void;
  onClose: () => void;
}

export default function StatusPopup({ building, cat, areaLabel, note: savedNote, units, x, y, mobile, onSet, onSaveNote, onSetUnits, onClose }: Props) {
  const [note, setNote] = useState(savedNote ?? "");
  // Eingabefeld für Wohnungen: Entwurf lokal, damit auch Tippen (statt +/−) geht
  const [unitsDraft, setUnitsDraft] = useState(String(units));
  useEffect(() => setUnitsDraft(String(units)), [units]);
  const commitUnits = (value: string) => {
    const n = parseInt(value, 10);
    if (!Number.isNaN(n)) onSetUnits(Math.max(1, Math.min(99, n)));
    else setUnitsDraft(String(units));
  };
  const noteChanged = note.trim() !== (savedNote ?? "");

  // Status setzen — eine gerade geänderte Notiz wandert mit in dieselbe Aktion
  const send = (status: Parameters<Props["onSet"]>[0]) =>
    onSet(status, noteChanged ? note.trim() : undefined);

  const title = building.street
    ? `${building.street} ${building.hnr}`
    : `Gebäude ${building.id}`;

  // Position (Desktop): der erste Aktions-Knopf liegt direkt unter dem Mauszeiger —
  // so markiert ein natürlicher Doppelklick das Haus (Klick öffnet, Klick trifft).
  // Auf dem Handy kommt das Fenster stattdessen als Bottom-Sheet von unten (CSS).
  const left = Math.max(8, Math.min(x - 135, window.innerWidth - 620));
  const top = Math.max(8, Math.min(y - 96, window.innerHeight - 420));

  return (
    <div className="status-popup" style={mobile ? undefined : { left, top }}>
      <div className="popup-head">
        <strong>{title}</strong>
        <button className="x" onClick={onClose}>×</button>
      </div>
      <div className="popup-cat">
        <i style={{ background: CAT_COLORS[cat] }} /> {CAT_LABELS[cat]}
        {areaLabel && <span className="hint"> · {areaLabel}</span>}
      </div>
      <div className="popup-actions">
        {cat !== "v" && (
          <button style={{ borderColor: CAT_COLORS.v }} onClick={() => send("verteilt")}>
            📖 Verteilt
          </button>
        )}
        {cat !== "g" && (
          <button style={{ borderColor: CAT_COLORS.g }} onClick={() => send("gesprochen")}>
            💬 Persönlich gesprochen
          </button>
        )}
        {cat !== "n" ? (
          <button style={{ borderColor: CAT_COLORS.n }} onClick={() => send("nicht_zustellbar")}>
            🚫 Nicht zustellbar
          </button>
        ) : (
          <button style={{ borderColor: CAT_COLORS.n }} onClick={() => send("zustellbar")}>
            ✅ Wieder zustellbar
          </button>
        )}
        {(cat === "v" || cat === "g") && (
          <button className="subtle" onClick={() => send("offen")}>↶ Zurücksetzen</button>
        )}
      </div>
      <div className="units-box">
        <span className="units-label">📮 Briefkästen/Wohnungen</span>
        <div className="stepper">
          <button onClick={() => onSetUnits(Math.max(1, units - 1))} disabled={units <= 1} title="eine Wohnung weniger">−</button>
          <input
            value={unitsDraft}
            inputMode="numeric"
            onChange={(e) => setUnitsDraft(e.target.value.replace(/[^0-9]/g, ""))}
            onBlur={(e) => commitUnits(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && commitUnits((e.target as HTMLInputElement).value)}
          />
          <button onClick={() => onSetUnits(Math.min(99, units + 1))} disabled={units >= 99} title="eine Wohnung mehr">+</button>
        </div>
      </div>
      <div className="note-box">
        <input
          value={note}
          maxLength={500}
          placeholder="Notiz zum Gebäude …"
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && noteChanged) onSaveNote(note.trim());
          }}
        />
        {noteChanged && (
          <button className="subtle" onClick={() => onSaveNote(note.trim())}>
            💾 Notiz speichern
          </button>
        )}
        <span className="hint">Nur Angaben zum Gebäude — nichts über Bewohner.</span>
      </div>
    </div>
  );
}
