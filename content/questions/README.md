# Question content

Each quiz board has its own directory. Category file names and image names
should use lowercase words separated by underscores.

```text
content/questions/
  board_1/
    emoji.yml
    fehler.yml
    geographie.yml
    jutsu.yml
    random_wissen.yml
    tode.yml
    images/
      geographie_100.png
  board_2/
  board_3/
  buzzer/
    buzzer.yml
```

## Board category

Question media is optional. `answerImageUrl` is shown with the revealed answer.

```yaml
category: geographie
displayName: Geographie
questions:
  - points: 100
    prompt: "Wo sind wir hier?"
    imageUrl: "/questions/board_1/images/geographie_100.png"
    answer: "Am Haupttor von Konohagakure."
    answerImageUrl: "/questions/board_1/images/geographie_100_answer.png"
```

Every category should contain one question for each point value: `100`, `200`,
`300`, `400`, and `500`.

## Buzzer rounds

A buzzer round can be text-only, image-only with `default_prompt`, or text and
image together. Every round needs an answer.

```yaml
default_points: 250
default_prompt: "Wo sind wir hier?"
rounds:
  - prompt: "Welches Dorf liegt im Land des Feuers?"
    answer: "Konohagakure."

  - image: geographie_konoha_gate.png
    answer: "Am Haupttor von Konohagakure."

  - prompt: "Welches Gebäude sehen wir?"
    image: geographie_konoha_hospital.png
    answer: "Das Krankenhaus von Konohagakure."
```

Buzzer images live next to `buzzer.yml`. The prebuild and predev scripts copy
them into `public/buzzer/` automatically.

## Validation

Run `pnpm validate:questions` after changing content. Development and production
builds run the same check automatically and report malformed YAML, incomplete
point sets, duplicate categories, blank text, and missing media paths.
