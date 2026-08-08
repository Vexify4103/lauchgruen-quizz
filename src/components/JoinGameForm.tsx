"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function JoinGameForm() {
  const router = useRouter();
  const [gameId, setGameId] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = gameId.trim().toUpperCase();
        if (trimmed) router.push(`/lobby/${encodeURIComponent(trimmed)}`);
      }}
      className="flex flex-col gap-2 sm:flex-row"
    >
      <label className="sr-only" htmlFor="game-code">
        Prüfungscode
      </label>
      <input
        id="game-code"
        value={gameId}
        onChange={(e) => setGameId(e.target.value.toUpperCase())}
        placeholder="PRÜFUNGSCODE"
        className="quiz-input flex-1 px-4 font-mono text-base font-black uppercase text-lime-100 placeholder:text-emerald-100/25"
        maxLength={8}
      />
      <button
        type="submit"
        className="quiz-button-primary px-6"
      >
        Beitreten
      </button>
    </form>
  );
}
