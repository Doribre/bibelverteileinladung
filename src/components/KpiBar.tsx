import type { Counts } from "../types";
import { CAT_COLORS } from "../types";

/** Immer sichtbare Kopfleiste: vier exklusive Kategorien, Summe = Zählbasis */
export default function KpiBar({ counts }: { counts: Counts }) {
  const reached = counts.v + counts.g;
  const pct = counts.total > 0 ? Math.round((reached / counts.total) * 100) : 0;
  const items = [
    { label: "Unerreicht", value: counts.u, color: CAT_COLORS.u },
    { label: "Zugeteilt", value: counts.z, color: CAT_COLORS.z },
    { label: "Verteilt", value: counts.v, color: CAT_COLORS.v },
    { label: "Persönlich gesprochen", value: counts.g, color: CAT_COLORS.g },
  ];
  return (
    <div className="kpi">
      {items.map((it) => (
        <div className="kpi-item" key={it.label}>
          <i style={{ background: it.color }} />
          <div>
            <div className="num">{it.value.toLocaleString("de-DE")}</div>
            <div className="lbl">{it.label}</div>
          </div>
        </div>
      ))}
      <div className="kpi-total">
        Gesamt {counts.total.toLocaleString("de-DE")} · <strong>{pct} % erreicht</strong>
        {counts.nz > 0 && <> · {counts.nz} nicht zustellbar</>}
      </div>
    </div>
  );
}
