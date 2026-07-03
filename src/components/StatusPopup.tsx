import { useState } from "react";
import type { Building, Cat } from "../types";
import { CAT_COLORS, CAT_LABELS } from "../types";

interface Props {
  building: Building;
  cat: Cat;
  areaLabel: string | null;
  nzComment: string | null;
  x: number;
  y: number;
  onSet: (
    status: "verteilt" | "gesprochen" | "offen" | "nicht_zustellbar" | "zustellbar",
    comment?: string
  ) => void;
  onClose: () => void;
}

export default function StatusPopup({ building, cat, areaLabel, nzComment, x, y, onSet, onClose }: Props) {
  const [showNz, setShowNz] = useState(cat === "n");
  const [comment, setComment] = useState(nzComment ?? "");

  const title = building.street
    ? `${building.street} ${building.hnr}`
    : `Gebäude ${building.id}`;
  const left = Math.max(8, Math.min(x - 130, window.innerWidth - 620));
  const top = Math.max(8, Math.min(y + 12, window.innerHeight - 380));

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
          <button style={{ borderColor: CAT_COLORS.v }} onClick={() => onSet("verteilt")}>
            📖 Verteilt
          </button>
        )}
        {cat !== "g" && (
          <button style={{ borderColor: CAT_COLORS.g }} onClick={() => onSet("gesprochen")}>
            💬 Persönlich gesprochen
          </button>
        )}
        {(cat === "v" || cat === "g") && (
          <button onClick={() => onSet("offen")}>↶ Zurücksetzen</button>
        )}
        {cat !== "n" && !showNz && (
          <button className="subtle" onClick={() => setShowNz(true)}>
            🚫 Nicht zustellbar …
          </button>
        )}
        {showNz && (
          <div className="nz-box">
            <input
              value={comment}
              maxLength={500}
              placeholder="Notiz zum Gebäude, z. B. Baustelle, kein Briefkasten"
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSet("nicht_zustellbar", comment.trim())}
            />
            <span className="hint">Bitte nur Angaben zum Gebäude — nichts über Bewohner.</span>
            <div className="nz-actions">
              <button className="subtle" onClick={() => onSet("nicht_zustellbar", comment.trim())}>
                {cat === "n" ? "💾 Notiz speichern" : "🚫 Als nicht zustellbar markieren"}
              </button>
              {cat === "n" && (
                <button className="subtle" onClick={() => onSet("zustellbar")}>
                  Wieder zustellbar
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
