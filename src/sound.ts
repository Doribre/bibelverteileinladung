// Kurzer "Bling"-Klang über die Web Audio API — kein Audio-Asset nötig.
// Läuft nur nach einer Nutzergeste (der Klick auf das Haus ist eine).
let ctx: AudioContext | null = null;

export function bling(): void {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime;
    // Zwei aufsteigende Glockentöne (Quinte) — freundlich, kurz, unaufdringlich
    [880, 1318.5].forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = t + i * 0.09;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.55);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(start);
      osc.stop(start + 0.6);
    });
  } catch {
    // Ton ist Zugabe, kein Muss — Fehler (z. B. Autoplay-Sperre) still schlucken
  }
}
