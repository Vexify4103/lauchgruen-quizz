"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function CreateGameButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const res = await fetch("/api/games", { method: "POST" });
          if (!res.ok) {
            console.error("Failed to create game");
            return;
          }
          const { gameId } = (await res.json()) as { gameId: string };
          router.push(`/lobby/${gameId}`);
        });
      }}
      className="quiz-button-primary w-full py-3 text-sm disabled:translate-y-0 disabled:opacity-60"
    >
      {pending ? "Spiel wird vorbereitet..." : "Neues Spiel eröffnen"}
    </button>
  );
}
