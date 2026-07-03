import { useState } from "react";
import type { Building, Cat } from "../types";
import { CAT_COLORS, CAT_LABELS } from "../types";

interface Props {
  building: Building;
  cat: Cat;
  areaLabel: string | null;
  note: string | null;
  x: number;
  y: number;
  onSet: (
    status: "verteilt" | "gesprochen" | "offen" | "nicht_zustellbar" | "zustellbar",
    note?: string
  ) => void;
  onSaveNote: (note: string) => void;
  onClose: () => void;
}

export default function StatusPopup({ building, cat, areaLabel, note: savedNote, x, y, onSet, onSaveNote, onClose }: Props) {
  const [note, setNote] = useState(savedNote ?? "");
  const noteChanged = note.trim() !== (savedNote ?? "");

  // Status setzen — eine gerade geänderte Notiz wandert mit in dieselbe Aktion
  const send = (status: Parameters<Props["onSet"]>[0]) =>
    onSet(status, noteChanged ? note.trim() : undefined);

  const title = building.street
    ? `${building.street} ${building.hnr}`
    : `Gebäude ${building.id}`;

  // Position: der erste Aktions-Knopf liegt direkt unter dem Mauszeiger —
  // so markiert ein natürlicher Doppelklick das Haus (Klick öffnet, Klick trifft).
  const left = Math.max(8, Math.min(x - 135, window.innerWidth - 620));
  const top = Math.max(8, Math.min(y - 96, window.innerHeight - 420));

  return (
    <div className="status-popup" style={{ left, top }}>
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
