import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import yaml from "js-yaml";

const root = resolve(process.cwd(), "content", "questions");
const requiredPoints = [100, 200, 300, 400, 500];
const mediaKeys = ["imageUrl", "answerImageUrl", "audioUrl"];
const errors = [];
let boardCount = 0;
let categoryCount = 0;
let questionCount = 0;

function fail(file, message) {
  errors.push(`${relative(process.cwd(), file)}: ${message}`);
}

function parseYaml(file) {
  try {
    return yaml.load(readFileSync(file, "utf8"));
  } catch (error) {
    fail(file, `invalid YAML (${error.message})`);
    return null;
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateQuestionMedia(file, question, index) {
  for (const key of mediaKeys) {
    const url = question[key];
    if (url === undefined) continue;
    if (!isNonEmptyString(url)) {
      fail(file, `questions[${index}].${key} must be a non-empty string`);
      continue;
    }
    if (!url.startsWith("/questions/")) continue;

    const requested = resolve(join(root, url.slice("/questions/".length)));
    if (!requested.startsWith(root + sep) || !existsSync(requested) || !statSync(requested).isFile()) {
      fail(file, `questions[${index}].${key} points to missing media: ${url}`);
    }
  }
}

if (!existsSync(root)) {
  console.error(`[questions:validate] missing content directory: ${root}`);
  process.exit(1);
}

for (let boardNumber = 1; boardNumber <= 10; boardNumber += 1) {
  const boardDir = join(root, `board_${boardNumber}`);
  if (!existsSync(boardDir)) break;
  boardCount += 1;

  const files = readdirSync(boardDir)
    .filter((name) => /\.ya?ml$/i.test(name))
    .sort((a, b) => a.localeCompare(b, "de"));
  if (files.length === 0) fail(boardDir, "board has no category YAML files");

  const categoryIds = new Set();
  for (const name of files) {
    const file = join(boardDir, name);
    const data = parseYaml(file);
    if (!data || typeof data !== "object" || Array.isArray(data)) continue;

    if (!isNonEmptyString(data.category)) fail(file, "missing non-empty `category`");
    if (!isNonEmptyString(data.displayName)) fail(file, "missing non-empty `displayName`");
    if (!Array.isArray(data.questions)) {
      fail(file, "`questions` must be an array");
      continue;
    }

    if (categoryIds.has(data.category)) fail(file, `duplicate category id on board: ${data.category}`);
    categoryIds.add(data.category);
    categoryCount += 1;

    const points = new Set();
    data.questions.forEach((question, index) => {
      if (!question || typeof question !== "object" || Array.isArray(question)) {
        fail(file, `questions[${index}] must be an object`);
        return;
      }
      if (!requiredPoints.includes(question.points)) {
        fail(file, `questions[${index}].points must be one of ${requiredPoints.join(", ")}`);
      } else if (points.has(question.points)) {
        fail(file, `duplicate point value: ${question.points}`);
      } else {
        points.add(question.points);
      }
      if (!isNonEmptyString(question.prompt)) fail(file, `questions[${index}] has no prompt`);
      if (!isNonEmptyString(question.answer)) fail(file, `questions[${index}] has no answer`);
      validateQuestionMedia(file, question, index);
      questionCount += 1;
    });

    const missing = requiredPoints.filter((pointsValue) => !points.has(pointsValue));
    if (missing.length > 0) fail(file, `missing point values: ${missing.join(", ")}`);
  }
}

const buzzerFile = join(root, "buzzer", "buzzer.yml");
let buzzerCount = 0;
if (existsSync(buzzerFile)) {
  const data = parseYaml(buzzerFile);
  if (data && typeof data === "object" && !Array.isArray(data)) {
    if (!Array.isArray(data.rounds)) {
      fail(buzzerFile, "`rounds` must be an array");
    } else {
      const defaultPrompt = isNonEmptyString(data.default_prompt);
      data.rounds.forEach((round, index) => {
        if (!round || typeof round !== "object" || Array.isArray(round)) {
          fail(buzzerFile, `rounds[${index}] must be an object`);
          return;
        }
        if (!isNonEmptyString(round.prompt) && !defaultPrompt) {
          fail(buzzerFile, `rounds[${index}] needs a prompt or default_prompt`);
        }
        if (!isNonEmptyString(round.answer)) fail(buzzerFile, `rounds[${index}] has no answer`);
        if (round.image !== undefined) {
          if (!isNonEmptyString(round.image)) {
            fail(buzzerFile, `rounds[${index}].image must be a non-empty string`);
          } else {
            const image = resolve(dirname(buzzerFile), round.image);
            if (!image.startsWith(dirname(buzzerFile) + sep) || !existsSync(image)) {
              fail(buzzerFile, `rounds[${index}] points to missing image: ${round.image}`);
            }
          }
        }
        buzzerCount += 1;
      });
    }
  }
}

if (boardCount === 0) errors.push("No board_N directories found");

if (errors.length > 0) {
  console.error(`[questions:validate] found ${errors.length} problem(s):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(
  `[questions:validate] ${boardCount} board(s), ${categoryCount} categories, ${questionCount} questions, ${buzzerCount} buzzer rounds OK`,
);
