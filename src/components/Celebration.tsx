import { useEffect, useLayoutEffect, useRef, useState } from "react";

export interface CelebrationData {
  id: string;
  x: number;
  y: number;
  message: string;
  /** Hintergrund in der Farbe der gesetzten Markierung */
  bg: string;
  fg: string;
}

const SPARKLES = ["✨", "⭐", "✨", "🌟", "✨", "⭐", "🌟", "✨"];

/**
 * Loot-Box-Moment: Funken sprühen, Ermutigung schwebt auf.
 * Handy: mittig im sichtbaren Kartenbereich (verlässlich im Viewport, gut lesbar).
 * Desktop: nah am angeklickten Haus, aber so eingegrenzt, dass die ganze
 * Animation (Aufschweben + Funkenflug) im Kartenbereich bleibt.
 */
export default function Celebration({
  data,
  mobile,
  onDone,
}: {
  data: CelebrationData;
  mobile: boolean;
  onDone: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number | string; top: number | string }>(
    mobile ? { left: "50%", top: "38%" } : { left: data.x, top: data.y }
  );

  useEffect(() => {
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [data.id, onDone]);

  useLayoutEffect(() => {
    if (mobile) {
      setPos({ left: "50%", top: "38%" });
      return;
    }
    // Desktop: am Klickpunkt, aber im Kartenbereich halten (Funken fliegen bis
    // ~150px hoch und ~100px zur Seite, die Blase schwebt ~70px auf)
    const parent = ref.current?.offsetParent as HTMLElement | null;
    const w = parent?.clientWidth ?? window.innerWidth;
    const h = parent?.clientHeight ?? window.innerHeight;
    setPos({
      left: Math.max(180, Math.min(data.x, w - 180)),
      top: Math.max(210, Math.min(data.y, h - 110)),
    });
  }, [data.id, mobile]);

  return (
    <div ref={ref} className="celebration" style={pos} key={data.id}>
      {SPARKLES.map((s, i) => (
        <span key={i} className={`sparkle sparkle-${i}`}>{s}</span>
      ))}
      <div
        className="cheer"
        style={{ background: data.bg, color: data.fg, boxShadow: `0 6px 24px ${data.bg}80` }}
      >
        {data.message}
      </div>
    </div>
  );
}
