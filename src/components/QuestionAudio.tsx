"use client";

/**
 * Custom audio player for question modals.
 *
 * Why custom instead of <audio controls>?
 *   - Browser default UI varies wildly across Chrome/Firefox/Safari and looks
 *     out of place in the game theme.
 *   - When the audio file 404s, the default control just sits there grey with
 *     no feedback. This player shows a clear error state.
 *   - Autoplay policies vary — non-host clients haven't necessarily made a
 *     user gesture when the modal opens, so autoplay can silently fail.
 *     A big amber Play button is unambiguous.
 *
 * No socket-level sync (each client plays locally) — for tight sync we'd
 * broadcast a play_at timestamp from the server. That's a separate change.
 */

import { useEffect, useRef, useState } from "react";
import { useSiteVolume } from "@/lib/site-volume";

interface Props {
  src: string;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function QuestionAudio({ src }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const siteVolume = useSiteVolume();

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = siteVolume;
  }, [siteVolume]);

  // Reset when src changes.
  useEffect(() => {
    setError(null);
    setPlaying(false);
    setPosition(0);
    setDuration(0);
  }, [src]);

  // Wire up audio element events.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlay  = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnd   = () => { setPlaying(false); setPosition(el.duration || 0); };
    const onTime  = () => setPosition(el.currentTime);
    const onMeta  = () => setDuration(el.duration || 0);
    const onErr   = () => setError("Audio konnte nicht geladen werden — Dateipfad prüfen");

    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnd);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("error", onErr);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnd);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("error", onErr);
    };
  }, [src]);

  const toggle = async () => {
    const el = audioRef.current;
    if (!el) return;
    try {
      if (el.paused) {
        await el.play();
      } else {
        el.pause();
      }
    } catch {
      // Autoplay blocked or other playback error — surface it.
      setError("Browser hat Wiedergabe blockiert — erneut auf Play klicken");
    }
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = audioRef.current;
    if (!el) return;
    const t = Number(e.target.value);
    el.currentTime = t;
    setPosition(t);
  };

  const pct = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <div className="mx-auto flex w-full max-w-md items-center gap-3 rounded-lg border border-white/10 bg-black/25 p-3 shadow-lg">
      {/* Native element — hidden, we drive it via the custom UI. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={src} preload="metadata" />

      <button
        type="button"
        onClick={toggle}
        disabled={!!error}
        aria-label={playing ? "Pause" : "Abspielen"}
        className={[
          "shrink-0 w-12 h-12 rounded-full font-extrabold text-xl transition-all border-2 flex items-center justify-center",
          error
            ? "bg-red-900 border-red-700 text-red-300 cursor-not-allowed"
            : "border-orange-200 bg-orange-500 text-orange-50 shadow-lg shadow-orange-950/30 hover:scale-105 active:scale-95",
        ].join(" ")}
      >
        {playing ? "❚❚" : "▶"}
      </button>

      <div className="flex-1 flex flex-col gap-1 min-w-0">
        {error ? (
          <div className="text-red-300 text-xs font-bold truncate">{error}</div>
        ) : (
          <>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={position}
              onChange={onSeek}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-emerald-900 accent-lime-300"
              style={{
                background: `linear-gradient(to right, rgb(190 242 100) ${pct}%, rgb(6 78 59) ${pct}%)`,
              }}
              disabled={!duration}
            />
            <div className="flex justify-between font-mono text-[10px] tabular-nums text-lime-100/55">
              <span>{formatTime(position)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
