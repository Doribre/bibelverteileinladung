import type { Building, Cat } from "../types";
import { CAT_COLORS, CAT_LABELS } from "../types";

interface Props {
  building: Building;
  cat: Cat;
  areaLabel: string | null;
  x: number;
  y: number;
  onSet: (status: "verteilt" | "gesprochen" | "offen" | "nicht_zustellbar" | "zustellbar") => void;
  onClose: () => void;
}

export default function StatusPopup({ building, cat, areaLabel, x, y, onSet, onClose }: Props) {
  const title = building.street
    ? `${building.street} ${building.hnr}`
    : `Gebäude ${building.id}`;
  const left = Math.max(8, Math.min(x - 130, window.innerWidth - 620));
  const top = Math.max(8, Math.min(y + 12, window.innerHeight - 340));
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
        {cat !== "n" ? (
          <button className="subtle" onClick={() => onSet("nicht_zustellbar")}>
            🚫 Nicht zustellbar (aus Zählung nehmen)
          </button>
        ) : (
          <button className="subtle" onClick={() => onSet("zustellbar")}>
            Wieder zustellbar
          </button>
        )}
      </div>
    </div>
  );
}
