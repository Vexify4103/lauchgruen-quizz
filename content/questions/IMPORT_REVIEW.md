# Allgemeinwissen-Import 2026

## Ergebnis

- 3 Spielbretter
- 6 Kategorien pro Brett
- 5 Fragen pro Kategorie
- 90 normale Fragen insgesamt
- 18 Bonusrunden
- 15 Flaggenbilder

Die gelieferten Kategorien Geographie, Geschichte, Kultur,
Naturwissenschaften, Sport und Flaggenkunde sind in sich ausreichend
geschlossen. Eine weitere Aufteilung würde pro Brett zu Kategorien mit zu
wenigen Fragen führen und wurde daher nicht vorgenommen.

## Wichtige Korrekturen

- Die Frage zur höchstgelegenen Hauptstadt nennt ausdrücklich die
  verfassungsmäßige Hauptstadt. Damit ist Quito gemeint, nicht der höher
  gelegene bolivianische Regierungssitz La Paz.
- Laika umkreiste die Erde und flog nicht zum Mond.
- Die Frage zum höchsten Kirchengebäude berücksichtigt, dass die Sagrada
  Família das Ulmer Münster 2025 überholt hat.
- Beim Reinheitsgebot wird zwischen dem historischen Wortlaut und den heute
  damit verbundenen vier Grundzutaten unterschieden.
- Die Schachfrage nennt ausdrücklich das aktuelle 14-Partien-Format.
- Die unklare und sicherheitsabhängige BASE-Jumping-Frage wurde durch eine
  eindeutige Sportfrage ersetzt.
- Flaggen von Schottland und der Isle of Man fragen korrekt nach einem Land
  oder Gebiet und nicht nach einem souveränen Staat.
- Linkin Parks Textzeile wurde dem richtigen Song `In the End` zugeordnet.
- Der fehlende Faithless-Titel, `Imagine`, `Sk8er Boi` und weitere Schreibweisen
  wurden korrigiert.

## Import

Der bereinigte Datensatz kann aus der hinterlegten Importdefinition erneut
erzeugt werden:

```bash
pnpm import:dropbox
pnpm validate:questions
```

Der Import ersetzt die YAML-Dateien in `board_1` bis `board_3`, erstellt die
normalisierten Flaggenbilder neu und schreibt `buzzer/buzzer.yml`. Die rohen
Dropbox-Dateien bleiben unverändert als Referenz erhalten.

## Faktenquellen für zeitabhängige Fragen

- FIDE-WM-Format: https://www.fide.com/fide-world-championship-cycle-2025-2026/
- Reinheitsgebot: https://brauer-bund.de/reinheitsgebot/entstehung/wortlaut/
- Höchstes Kirchengebäude: https://www.ulm.de/tourismus/ulmer-muenster
