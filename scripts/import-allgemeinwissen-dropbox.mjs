import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import yaml from "js-yaml";

const root = process.cwd();
const sourceRoot = resolve(root, "DropboxDownload");
const targetRoot = resolve(root, "content", "questions");
const points = [100, 200, 300, 400, 500];

if (!existsSync(sourceRoot)) {
  throw new Error(`Dropbox source directory is missing: ${sourceRoot}`);
}

const category = (id, displayName, questions) => ({ id, displayName, questions });
const question = (prompt, answer, extra = {}) => ({ prompt, answer, ...extra });

const boards = [
  [
    category("geographie", "Geographie", [
      question("Was ist die Hauptstadt von Portugal?", "Lissabon."),
      question("Welcher Fluss fließt durch Ägypten und mündet ins Mittelmeer?", "Der Nil."),
      question(
        "Welche Bewässerungsmethode eignet sich bei großer Hitze, Trockenheit und schwierigen Böden besonders gut?",
        "Die Tröpfchenbewässerung.",
      ),
      question(
        "Welches Land erstreckt sich durch seine Überseegebiete über die meisten Zeitzonen?",
        "Frankreich.",
      ),
      question("Wie heißt die Meerenge zwischen Russland und Alaska?", "Die Beringstraße."),
    ]),
    category("geschichte", "Geschichte", [
      question("Wer überquerte mit Kriegselefanten die Alpen?", "Hannibal."),
      question("In welchem Jahr fiel die Berliner Mauer?", "1989."),
      question(
        "Wer entwickelte um 1440 den modernen Buchdruck mit beweglichen Metalllettern?",
        "Johannes Gutenberg.",
      ),
      question("Welcher russische Zar wurde auch „der Schreckliche“ genannt?", "Iwan IV."),
      question(
        "Welcher englische König hatte sechs Ehefrauen, von denen zwei hingerichtet wurden?",
        "Heinrich VIII.",
      ),
    ]),
    category("kultur", "Kultur", [
      question("Wer malte die Mona Lisa?", "Leonardo da Vinci."),
      question("Welches Land schenkte den USA die Freiheitsstatue?", "Frankreich."),
      question(
        "Bringe diese Epochen in die richtige zeitliche Reihenfolge: Barock, Gotik, Renaissance.",
        "Gotik, Renaissance, Barock.",
      ),
      question(
        "Wie heißt die hinduistische Asketengemeinschaft, die für extreme Rituale auf Verbrennungsplätzen bekannt ist?",
        "Die Aghori.",
      ),
      question(
        "Welches Werk gilt als das älteste erhaltene schriftliche Epos der Menschheit? Tipp: Der Name beginnt mit G.",
        "Das Gilgamesch-Epos.",
      ),
    ]),
    category("naturwissenschaften", "Naturwissenschaften", [
      question("Wie lautet die chemische Formel von Wasser?", "H₂O."),
      question(
        "Wie nennt man den Vorgang, bei dem Pflanzen Licht zur Energiegewinnung nutzen?",
        "Fotosynthese.",
      ),
      question(
        "Welcher zentrale Mechanismus treibt laut Charles Darwin die Evolution an?",
        "Natürliche Selektion: besser angepasste Lebewesen haben häufiger überlebende Nachkommen.",
      ),
      question("Welcher Teil des Gehirns steuert vor allem Gleichgewicht und Koordination?", "Das Kleinhirn."),
      question(
        "Nenne vier der sechs Quark-Arten.",
        "Up, Down, Charm, Strange, Top und Bottom; vier davon genügen.",
      ),
    ]),
    category("sport", "Sport", [
      question("In welchem Abstand finden die Olympischen Sommerspiele normalerweise statt?", "Alle vier Jahre."),
      question("Wie lang ist eine offizielle Marathonstrecke?", "42,195 Kilometer."),
      question("Um welche Trophäe spielen die Teams der nordamerikanischen Eishockeyliga NHL?", "Um den Stanley Cup."),
      question(
        "Was ist ein Triple-Double im Basketball?",
        "Zweistellige Werte in drei statistischen Kategorien innerhalb eines Spiels, etwa Punkte, Rebounds und Assists.",
      ),
      question(
        "In welchem Jahr und in welcher Stadt fanden die ersten Olympischen Spiele der Neuzeit statt?",
        "1896 in Athen.",
      ),
    ]),
    category("flaggenkunde", "Flaggenkunde", [
      question("Zu welchem Land gehört diese Flagge?", "Italien."),
      question("Zu welchem Land gehört diese Flagge?", "Südafrika."),
      question("Zu welchem Land gehört diese Flagge?", "Panama."),
      question("Zu welchem Land gehört diese Flagge?", "Libanon."),
      question("Zu welchem Land gehört diese Flagge?", "Kiribati."),
    ]),
  ],
  [
    category("geographie", "Geographie", [
      question("Welcher Ozean ist der größte der Erde?", "Der Pazifische Ozean."),
      question("Was ist der kleinste souveräne Staat der Welt?", "Die Vatikanstadt."),
      question("Was bezeichnet man als Punkt Nemo?", "Den Punkt im Ozean, der am weitesten von jeder Landfläche entfernt ist."),
      question("Welcher europäische Fluss berührt oder durchquert zehn Länder?", "Die Donau."),
      question("Wie viele Berge über 8.000 Meter gibt es auf der Erde?", "14."),
    ]),
    category("geschichte", "Geschichte", [
      question("Wer war der erste Präsident der Vereinigten Staaten?", "George Washington."),
      question("Welcher französische Herrscher krönte sich 1804 selbst zum Kaiser?", "Napoleon Bonaparte."),
      question("Welcher berühmte Handelsweg verband China mit Europa?", "Die Seidenstraße."),
      question(
        "Wie heißt die Schlacht, in der germanische Verbände im Jahr 9 n. Chr. drei römische Legionen besiegten?",
        "Die Varusschlacht, auch Schlacht im Teutoburger Wald.",
      ),
      question(
        "Nenne die sieben Weltwunder der Antike.",
        "Pyramiden von Gizeh, Hängende Gärten von Babylon, Artemistempel von Ephesos, Zeusstatue von Olympia, Mausoleum von Halikarnassos, Koloss von Rhodos und Leuchtturm von Alexandria.",
      ),
    ]),
    category("kultur", "Kultur", [
      question("Was ist Goethes berühmtestes Drama?", "Faust."),
      question("Welcher Maler verletzte sich selbst am Ohr?", "Vincent van Gogh."),
      question(
        "Welche Basilika in Barcelona ist seit 2025 das höchste Kirchengebäude der Welt?",
        "Die Sagrada Família.",
      ),
      question(
        "Welche vier Grundzutaten werden heute mit dem deutschen Reinheitsgebot verbunden?",
        "Wasser, Malz, Hopfen und Hefe.",
      ),
      question("Welche Fachrichtung studierte die Rapperin Ikkimel?", "Sprachwissenschaften beziehungsweise Deutsche Philologie."),
    ]),
    category("naturwissenschaften", "Naturwissenschaften", [
      question("Welche Kraft zieht Gegenstände zur Erde?", "Die Gravitation beziehungsweise Schwerkraft."),
      question("Welches Gas macht den größten Teil der Erdatmosphäre aus und ungefähr wie viel?", "Stickstoff mit rund 78 Prozent."),
      question("Warum erscheint ein Schwarzes Loch schwarz?", "Weil jenseits des Ereignishorizonts kein Licht entkommen kann."),
      question("Welche mathematische Reihe trägt denselben Namen wie die Sängerin Taylor Swift?", "Die Taylorreihe."),
      question(
        "Wie hoch ist das Preisgeld für die Lösung eines der noch ungelösten Millennium-Probleme?",
        "Eine Million US-Dollar.",
      ),
    ]),
    category("sport", "Sport", [
      question("In welcher Sportart wird häufig Harz für besseren Halt am Ball verwendet?", "Im Handball."),
      question("Wie nennt man im Tennis den Spielstand von 40:40?", "Einstand beziehungsweise Deuce."),
      question(
        "Nach welchen drei Spielfortsetzungen kann ein Fußballspieler den Ball direkt erhalten, ohne im Abseits zu stehen?",
        "Nach Einwurf, Abstoß oder Eckstoß.",
      ),
      question(
        "Wie viele Punkte benötigt ein Spieler im aktuellen 14-Partien-Format der Schachweltmeisterschaft zum vorzeitigen Matchsieg?",
        "7,5 Punkte.",
      ),
      question("Wie heißt die von Dick Fosbury bekannt gemachte Hochsprungtechnik?", "Fosbury-Flop."),
    ]),
    category("flaggenkunde", "Flaggenkunde", [
      question("Zu welchem Land oder Gebiet gehört diese Flagge?", "Griechenland."),
      question("Zu welchem Land oder Gebiet gehört diese Flagge?", "Schottland."),
      question("Zu welchem Land oder Gebiet gehört diese Flagge?", "Uganda."),
      question("Zu welchem Land oder Gebiet gehört diese Flagge?", "Laos."),
      question("Zu welchem Land oder Gebiet gehört diese Flagge?", "Die Isle of Man."),
    ]),
  ],
  [
    category("geographie", "Geographie", [
      question("Nach welchem Windsystem ist ein bekanntes VW-Modell benannt?", "Nach den Passatwinden."),
      question("Wie heißt die Hauptstadt Kanadas?", "Ottawa."),
      question("Welche Anbauform eignet sich besonders für steile Hänge?", "Terrassenanbau."),
      question(
        "Welche Stadt ist die höchstgelegene verfassungsmäßige Hauptstadt der Welt?",
        "Quito in Ecuador.",
      ),
      question(
        "Nenne die drei Hauptstädte Südafrikas und ihre jeweiligen Staatsfunktionen.",
        "Pretoria für die Exekutive, Kapstadt für die Legislative und Bloemfontein für die Judikative.",
      ),
    ]),
    category("geschichte", "Geschichte", [
      question("Wer leitete mit seinen 95 Thesen die Reformation ein?", "Martin Luther."),
      question("Welcher Vulkan zerstörte im Jahr 79 n. Chr. Pompeji?", "Der Vesuv."),
      question("Wie hieß der erste Hund, der die Erde im Weltraum umkreiste?", "Laika."),
      question("Welcher US-Präsident erließ 1863 die Emanzipationsproklamation?", "Abraham Lincoln."),
      question(
        "Welcher Vulkanausbruch in Indonesien verursachte 1816 das sogenannte Jahr ohne Sommer? A: Krakatau, B: Tambora, C: Toba, D: Merapi",
        "B: Tambora.",
      ),
    ]),
    category("kultur", "Kultur", [
      question("Wer komponierte die Oper Die Zauberflöte?", "Wolfgang Amadeus Mozart."),
      question("In welchem Land wurde Papier erfunden?", "In China."),
      question("Wie hießen die sagenhaften Gründer Roms, und wer tötete wen?", "Romulus und Remus; Romulus tötete Remus."),
      question("Aus welchem Holz werden Whiskyfässer überwiegend gefertigt?", "Aus Eichenholz."),
      question("Welcher ägyptische Pharao führte vorübergehend den Aton-Kult ein?", "Echnaton beziehungsweise Amenophis IV."),
    ]),
    category("naturwissenschaften", "Naturwissenschaften", [
      question("Was ist das größte Organ des Menschen?", "Die Haut."),
      question("Aus welchen Teilchen besteht ein Atomkern?", "Aus Protonen und Neutronen."),
      question(
        "Nenne alle acht anerkannten Planeten unseres Sonnensystems.",
        "Merkur, Venus, Erde, Mars, Jupiter, Saturn, Uranus und Neptun.",
      ),
      question("Was sind Tranquilizer?", "Beruhigende Medikamente, die unter anderem Angst und starke Unruhe reduzieren."),
      question("Wie nennt man die Grenze eines Schwarzen Lochs, hinter der nichts mehr entkommen kann?", "Ereignishorizont."),
    ]),
    category("sport", "Sport", [
      question("Wie heißt der Bereich einer Rennstrecke, in dem Formel-1-Autos Reifen wechseln und repariert werden?", "Die Boxengasse beziehungsweise Pit Lane."),
      question("Aus wie vielen Spielern besteht ein Beachvolleyball-Team auf dem Feld?", "Aus zwei Spielern."),
      question("Wie heißt der kurz gemähte Bereich auf einem Golfplatz, in dem sich das Loch befindet?", "Das Green."),
      question("Wie heißt die aus Harry Potter bekannte Sportart Quidditch heute offiziell?", "Quadball."),
      question("Wie viele Punkte erzielte Wilt Chamberlain 1962 in einem einzigen NBA-Spiel?", "100 Punkte."),
    ]),
    category("flaggenkunde", "Flaggenkunde", [
      question("Zu welchem Land gehört diese Flagge?", "Schweden."),
      question("Zu welchem Land gehört diese Flagge?", "Kolumbien."),
      question("Zu welchem Land gehört diese Flagge?", "Andorra."),
      question("Zu welchem Land gehört diese Flagge?", "Sri Lanka."),
      question("Zu welchem Land gehört diese Flagge?", "Ruanda."),
    ]),
  ],
];

const flagSources = [
  [
    "allgquiz.flagge.100.1.png",
    "allgquiz.flagge.200.1.png",
    "allgquiz.flagge.300.1.png",
    "allgquiz.flagge.400.1.png",
    "allgquiz.flagge.500.1.png",
  ],
  [
    "allgquiz.flagge.100.2.png",
    "allgquiz.flagge.200.2.png",
    "allgquiz.flagge.300.2.png",
    "allgquiz.flagge.400.2.png",
    "allgquiz.flagge.500.2.png",
  ],
  [
    "allgquiz.flagge.100.3.png",
    "allgquiz.flagge.200.3png.png",
    "allgquiz.flagge.300.3.png",
    "allgquiz.flagge.300.4.png",
    "allgquiz.flagge.500.3.png",
  ],
];

const buzzerRounds = [
  question("Du bist ein Feuerwerk – zeig allen deine Farben.", "Katy Perry – Firework."),
  question("Es riecht nach jugendlichem Protestgeist.", "Nirvana – Smells Like Teen Spirit."),
  question("Ich habe 99 Probleme, aber eine Frau gehört nicht dazu.", "Jay-Z – 99 Problems."),
  question("Sag mir, was du wirklich, wirklich willst.", "Spice Girls – Wannabe."),
  question("Sag mir warum – ist es nichts als Herzschmerz?", "Backstreet Boys – I Want It That Way."),
  question("Ich bin ein Außenseiter und frage mich, was ich hier eigentlich mache.", "Radiohead – Creep."),
  question("Ich habe dir so sehr vertraut und bin trotzdem nur so weit gekommen.", "Linkin Park – In the End."),
  question("Ich finde keinen Schlaf; meine Gedanken lassen mich nicht los.", "Faithless – Insomnia."),
  question("Es ging hinab, während die Flammen immer höher stiegen.", "Johnny Cash – Ring of Fire."),
  question("Nimm es mit mir auf – ich bin bald fort.", "a-ha – Take On Me."),
  question("Stell dir eine Welt ohne Länder, Grenzen und Religionen vor.", "John Lennon – Imagine."),
  question("Du warst ein Kind und krochst auf deinen Knien darauf zu.", "MGMT – Kids."),
  question("Nichts, nicht einmal hundert Männer, könnte mich von dir wegziehen.", "Toto – Africa."),
  question("Ich wache auf und spüre es in meinen Knochen; mein System ist aufgeladen.", "Imagine Dragons – Radioactive."),
  question("Wir können die Sache auf dem Flur austragen – so hast du noch nie getanzt.", "Milky Chance – Stolen Dance."),
  question("Er war ein Junge, sie war ein Mädchen – deutlicher geht es kaum.", "Avril Lavigne – Sk8er Boi."),
  question("Spiel uns heute ein Lied; wir sind alle in Stimmung für eine Melodie.", "Billy Joel – Piano Man."),
  question("Ist das das wirkliche Leben oder nur Fantasie?", "Queen – Bohemian Rhapsody."),
];

function writeYaml(file, data) {
  writeFileSync(
    file,
    yaml.dump(data, {
      noRefs: true,
      lineWidth: 110,
      quotingType: '"',
      forceQuotes: true,
      noCompatMode: true,
    }),
    "utf8",
  );
}

for (let boardIndex = 0; boardIndex < boards.length; boardIndex += 1) {
  const boardNumber = boardIndex + 1;
  const boardDir = join(targetRoot, `board_${boardNumber}`);
  mkdirSync(boardDir, { recursive: true });

  for (const file of readdirSync(boardDir)) {
    if (/\.ya?ml$/i.test(file)) rmSync(join(boardDir, file));
  }

  const imageDir = join(boardDir, "images");
  rmSync(imageDir, { recursive: true, force: true });
  mkdirSync(imageDir, { recursive: true });

  for (const entry of boards[boardIndex]) {
    const questions = entry.questions.map((item, questionIndex) => {
      const value = points[questionIndex];
      return {
        points: value,
        prompt: item.prompt,
        ...(entry.id === "flaggenkunde"
          ? { imageUrl: `/questions/board_${boardNumber}/images/flaggenkunde_${value}.png` }
          : {}),
        answer: item.answer,
      };
    });

    writeYaml(join(boardDir, `${entry.id}.yml`), {
      category: entry.id,
      displayName: entry.displayName,
      questions,
    });
  }

  const flagSourceDir = join(sourceRoot, "Flaggenkunde", `Brett${boardNumber}`);
  flagSources[boardIndex].forEach((file, index) => {
    const source = join(flagSourceDir, file);
    if (!existsSync(source)) throw new Error(`Missing flag image: ${source}`);
    cpSync(source, join(imageDir, `flaggenkunde_${points[index]}.png`));
  });
}

const buzzerDir = join(targetRoot, "buzzer");
mkdirSync(buzzerDir, { recursive: true });
writeYaml(join(buzzerDir, "buzzer.yml"), {
  default_points: 250,
  default_prompt: "Welcher Song ist anhand der umschriebenen Textzeile gesucht?",
  rounds: buzzerRounds.map((round) => ({ prompt: round.prompt, answer: round.answer })),
});

console.log("[import:dropbox] imported 3 boards, 18 categories, 90 questions, 15 images and 18 buzzer rounds");
