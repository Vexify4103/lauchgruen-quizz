import { getScoringRule, scoringRuleLabels } from "@/lib/scoring-rules";

interface Props {
  boardIndex: number;
  isBonus?: boolean;
  compact?: boolean;
  className?: string;
}

export function ScoringRules({
  boardIndex,
  isBonus = false,
  compact = false,
  className = "",
}: Props) {
  const rule = getScoringRule(boardIndex, isBonus);

  return (
    <div
      className={`flex min-w-0 max-w-full flex-wrap items-center gap-x-3 gap-y-1 overflow-hidden border-y border-emerald-300/10 bg-emerald-950/28 px-3 ${compact ? "py-1.5" : "py-2"} ${className}`}
      aria-label={`Punkteregeln: ${rule.name}`}
    >
      <span className="text-[10px] font-black uppercase text-lime-200/80">
        Punkteregeln · {rule.name}
      </span>
      {scoringRuleLabels(boardIndex, isBonus).map((label) => (
        <span key={label} className="max-w-full text-[10px] font-bold leading-4 text-emerald-100/62">
          {label}
        </span>
      ))}
    </div>
  );
}
