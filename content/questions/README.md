# Fragenstruktur

Das aktive Quiz besteht aus drei Brettern. Jeder Ordner `board_1` bis
`board_3` enthält sechs YAML-Dateien mit jeweils fünf Fragen für 100 bis 500
Punkte.

```text
content/questions/
  board_1/
    geographie.yml
    geschichte.yml
    ...
  board_2/
  board_3/
  buzzer/
    buzzer.yml
```

Eine normale Kategorie sieht so aus:

```yaml
category: geographie
displayName: Geographie
questions:
  - points: 100
    prompt: "Wie heißt die Hauptstadt von Portugal?"
    answer: "Lissabon."
  - points: 200
    prompt: "Welches Bauwerk sehen wir?"
    imageUrl: "/questions/board_1/images/geographie_200.png"
    answer: "Der Eiffelturm."
```

Fragen dürfen nur Text, Text mit Bild oder Text mit Audio verwenden. Bilder
liegen im optionalen Unterordner `images`; Audio liegt entsprechend in
`audio`. Die URL beginnt immer mit `/questions/<board>/...`.

Bonusrunden liegen gemeinsam in `buzzer/buzzer.yml` und unterstützen dieselben
Felder:

```yaml
default_points: 250
default_prompt: "Welcher Begriff ist gesucht?"
rounds:
  - prompt: "Ich habe viele Tasten, öffne aber keine Tür."
    answer: "Eine Tastatur oder ein Klavier."
```

## Punkteregeln

- Brett 1 und 2: richtig `+1x`; die erste falsche Antwort der Person, die das
  Feld gewählt hat, gibt `0`; ein falscher Nachbuzz kostet `-0,5x`.
- Brett 3: richtig `+2x`; jede falsche Antwort kostet `-1x`.
- Bonusrunde: richtig `+1x`; falsch `-0,5x`; nach einer falschen Antwort ist die
  Bonusrunde beendet.
- `Punktekorrektur` im Kontrollraum addiert oder entfernt exakt den eingegebenen
  Wert. Brettregeln und Multiplikatoren werden dabei nicht angewendet.
- Die Korrektur an einer bereits verwendeten Frage addiert oder entfernt deren
  einfachen Basiswert. Sie bewertet die Frage nicht erneut nach Live-Regeln.

Vor Build oder Deployment immer ausführen:

```bash
pnpm validate:questions
```

Der bereinigte Allgemeinwissen-Datensatz aus `DropboxDownload` kann bei Bedarf
mit `pnpm import:dropbox` reproduziert werden. Details zu den inhaltlichen
Korrekturen stehen in `IMPORT_REVIEW.md`.
