/**
 * 30 fröhliche, überkonfessionelle Ermutigungen – erscheinen zufällig,
 * wenn ein Haus als "verteilt" oder "persönlich gesprochen" markiert wird.
 */
export const ENCOURAGEMENTS: string[] = [
  "Gott segne dieses Haus!",
  "Halleluja!",
  "Danke – wir beten, dass es auf fruchtbaren Boden fällt!",
  "Ein Licht mehr in der Straße!",
  "Das Wort ist unterwegs!",
  "Friede diesem Haus! (Lk 10,5)",
  "Sein Wort kehrt nie leer zurück. (Jes 55,11)",
  "Wie lieblich sind die Füße der Freudenboten! (Röm 10,15)",
  "Gutes gesät – Gott lässt wachsen!",
  "Da freut sich der Himmel mit!",
  "Frohe Botschaft frei Haus!",
  "Du bist ein Segen!",
  "Amen – weiter geht's!",
  "Ein Same ist gepflanzt.",
  "Der Herr segne dich und behüte dich!",
  "Preis dem Herrn!",
  "Gott sieht deinen Einsatz!",
  "Licht scheint in der Dunkelheit!",
  "Ein Schritt näher am Ziel!",
  "Danke, dass du losgegangen bist!",
  "Eine Bibel mehr in guten Händen!",
  "Gott macht Großes durch kleine Schritte.",
  "Jubel – noch ein Haus erreicht!",
  "Möge das Wort Wurzeln schlagen!",
  "Groß ist deine Treue!",
  "Weiter so – Haus für Haus!",
  "Gesegnete Hände, gesegnetes Haus!",
  "Freude im Himmel über jeden Schritt!",
  "Dein Gehen ist gesegnet, dein Kommen behütet. (Ps 121,8)",
  "Von Haus zu Haus – Gott geht mit!",
];

export function randomEncouragement(): string {
  return ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
}
