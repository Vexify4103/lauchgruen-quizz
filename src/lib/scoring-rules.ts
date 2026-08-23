export interface ScoringRule {
  name: string;
  correctMultiplier: number;
  wrongMultiplier: number;
  pickerFirstWrongFree: boolean;
  oneAttemptOnly: boolean;
}

const CLASSIC_RULE: ScoringRule = {
  name: "Klassisch",
  correctMultiplier: 1,
  wrongMultiplier: 0.5,
  pickerFirstWrongFree: true,
  oneAttemptOnly: false,
};

const FINAL_RULE: ScoringRule = {
  name: "Finalbrett",
  correctMultiplier: 2,
  wrongMultiplier: 1,
  pickerFirstWrongFree: false,
  oneAttemptOnly: false,
};

const BONUS_RULE: ScoringRule = {
  name: "Bonusrunde",
  correctMultiplier: 1,
  wrongMultiplier: 0.5,
  pickerFirstWrongFree: false,
  oneAttemptOnly: true,
};

export function getScoringRule(boardIndex: number, isBonus = false): ScoringRule {
  if (isBonus) return BONUS_RULE;
  return boardIndex === 2 ? FINAL_RULE : CLASSIC_RULE;
}

export function correctMultiplierLabel(boardIndex: number, isBonus = false): string | null {
  const multiplier = getScoringRule(boardIndex, isBonus).correctMultiplier;
  return multiplier > 1 ? `×${multiplier}` : null;
}

function multiplierText(multiplier: number): string {
  if (multiplier === 0.5) return "½";
  return String(multiplier).replace(".", ",");
}

export function scoringRuleLabels(boardIndex: number, isBonus = false): string[] {
  const rule = getScoringRule(boardIndex, isBonus);
  const labels = [`Richtig +${multiplierText(rule.correctMultiplier)}×`];

  if (rule.pickerFirstWrongFree) {
    labels.push("Eigene erste Antwort falsch ±0");
    labels.push(`Nachbuzzern falsch −${multiplierText(rule.wrongMultiplier)}×`);
  } else {
    labels.push(`Falsch −${multiplierText(rule.wrongMultiplier)}×`);
  }

  if (rule.oneAttemptOnly) labels.push("Nur ein Versuch");
  return labels;
}
