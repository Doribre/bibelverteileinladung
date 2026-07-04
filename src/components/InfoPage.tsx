import { APP_VERSION, CHANGELOG } from "../changelog";

/** Über-das-Projekt-Seite: Beschreibung, Annahmen, Grenzen des Demonstrators, Versionshistorie. */
export default function InfoPage({ onClose }: { onClose: () => void }) {
  return (
    <div className="info-backdrop" onClick={onClose}>
      <div className="info-page" onClick={(e) => e.stopPropagation()}>
        <div className="info-head">
          <strong>Über dieses Projekt</strong>
          <button className="x" onClick={onClose} aria-label="Schließen">×</button>
        </div>
        <div className="info-body">
          <section>
            <h3>Worum geht es?</h3>
            <p>
              <strong>Bibel TV NEXT MISSION – Bibeleinladungs-Planer.</strong> Ziel der Kampagne ist es,
              möglichst <em>jeden Haushalt</em> zu erreichen: persönlich klingeln und die Bibel im
              Gespräch übergeben, sonst mit einem Gruß in den Briefkasten — und Gebiete, die so
              nicht erreicht werden, später per Post.
            </p>
            <p>
              Diese Web-App hilft Freiwilligen, Gebiete untereinander aufzuteilen und festzuhalten,
              welche Häuser schon bedient sind — damit jeder Haushalt genau einmal erreicht wird,
              ohne Lücken und ohne doppelte Besuche.
            </p>
            <p className="info-note">
              Dies ist ein <strong>Demonstrator (Proof of Concept)</strong>: Er zeigt die Idee und
              die Bedienung. Es ist noch nicht die fertige, für den bundesweiten Feldeinsatz
              gehärtete Anwendung.
            </p>
          </section>

          <section>
            <h3>Unsere Annahmen</h3>
            <ul>
              <li>Freiwillige teilen sich Gebiete auf und markieren die Häuser vor Ort selbst.</li>
              <li>Die Gebäudedaten stammen aus OpenStreetMap (offen und kostenlos).</li>
              <li>
                Wie viele Haushalte/Briefkästen in einem Haus sind, wissen wir vorab nicht sicher —
                die Freiwilligen erfassen und korrigieren das direkt am Haus.
              </li>
              <li>
                Es werden bewusst <strong>keine personenbezogenen Daten</strong> erhoben — keine
                Namen, keine Bewohner, nur Orte und Gebäude.
              </li>
            </ul>
          </section>

          <section>
            <h3>Was dieser Demonstrator (noch) nicht kann — und warum</h3>
            <ul>
              <li>
                <strong>Kein Login, kein Server:</strong> Alles läuft nur im Browser, der Stand lebt
                nur in dieser Sitzung. <em>Warum:</em> So lässt sich die Idee sofort und ohne
                Server-/Datenschutzaufwand zeigen. Zum Sichern gibt es „Export".
              </li>
              <li>
                <strong>Kein gemeinsamer Live-Stand:</strong> Zwei Personen sehen sich nicht
                gegenseitig. <em>Warum:</em> Der Mehrbenutzer-Abgleich kommt erst mit dem Server
                (nächste Stufe).
              </li>
              <li>
                <strong>Zwei Beispielgebiete:</strong> Bonn-Bad Godesberg (volle Gebäude-Umrisse)
                und Hamburg (Punkte). <em>Warum:</em> Für eine ganze Großstadt wären volle Umrisse
                als Download zu groß und zu langsam; Punkte halten Hamburg schnell ladbar.
              </li>
              <li>
                <strong>Gebäudedaten sind unvollständig:</strong> In OpenStreetMap trägt nur ein
                kleiner Teil der Gebäude einen Nutzungstyp; Wohn- und Gewerbegebäude sind nicht
                sauber getrennt, und einzelne Nebengebäude oder Lücken sind möglich. <em>Warum:</em>{" "}
                Es sind offene Daten ohne amtliches Kataster. In der echten App verbessern wir das
                mit amtlichen Daten und Statistik (z. B. Zensus).
              </li>
              <li>
                <strong>Haushalts-/Briefkastenzahl ist geschätzt</strong> (Standard: 1) und muss vor
                Ort korrigiert werden. <em>Warum:</em> Verlässliche Zahlen je Haus liefern nur die
                Freiwilligen selbst (oder teure Datenkäufe).
              </li>
              <li>
                <strong>Hintergrundkarte</strong> kommt von einem öffentlichen Kartenserver.{" "}
                <em>Warum:</em> Für die echte App hosten wir die Karte selbst (Datenschutz und Last).
              </li>
              <li>
                <strong>„Verteil-Missionar" und „Verteilgebiet"</strong> sind Demo-Namen ohne echte
                Anmeldung. <em>Warum:</em> Später über den Bibel TV Login.
              </li>
              <li>
                <strong>Verzögerung nach Updates:</strong> Neue Versionen erscheinen wegen
                Zwischenspeicherung bis zu ~10 Minuten später — dann hilft ein erzwungenes Neuladen
                (Strg+F5 bzw. Seite neu laden).
              </li>
            </ul>
          </section>

          <section>
            <h3>Datenschutz – kurz eingeordnet</h3>
            <ul>
              <li>
                Eine rein gebäude-/adressbasierte Verteilung (klingeln, Briefkasten) ohne Namen
                fällt nicht unter die DSGVO.
              </li>
              <li>
                Bewusst gibt es <strong>keinen „abgelehnt"-Status</strong> und keine Notizen über
                Bewohner — um Aussagen über einzelne Personen zu vermeiden.
              </li>
            </ul>
          </section>

          <section>
            <h3>Versionshistorie</h3>
            <div className="changelog">
              {CHANGELOG.map((e) => (
                <div className="cl-entry" key={e.version}>
                  <div className="cl-head">
                    <span className="cl-version">v{e.version}</span>
                    <span className="cl-title">{e.title}</span>
                    <span className="cl-date">{e.date} · {e.time} Uhr</span>
                  </div>
                  <ul>
                    {e.changes.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <footer className="info-foot">
            Version {APP_VERSION} · Gebäudedaten © OpenStreetMap-Mitwirkende (ODbL)
          </footer>
        </div>
      </div>
    </div>
  );
}
