import { useEffect } from "react";

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

/** Loot-Box-Moment: Funken sprühen vom angeklickten Haus, Ermutigung schwebt auf. */
export default function Celebration({ data, onDone }: { data: CelebrationData; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2600);
    return () => clearTimeout(timer);
  }, [data.id, onDone]);

  const left = Math.max(20, Math.min(data.x, window.innerWidth - 660));
  const top = Math.max(70, Math.min(data.y, window.innerHeight - 160));

  return (
    <div className="celebration" style={{ left, top }} key={data.id}>
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
