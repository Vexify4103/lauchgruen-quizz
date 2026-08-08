"use client";

/**
 * Question image with 16:9 preview and click-to-toggle fullscreen lightbox.
 *
 * The lightbox state lives client-side (per viewer), so each person — host,
 * contestants, OBS — can independently zoom in/out without affecting anyone
 * else. Click the preview to enlarge, click anywhere (or ✕) to shrink back.
 *
 * Falls back to a placeholder if the image 404s, so missing assets don't
 * look like the UI is broken — they show "image failed to load".
 */

import { useState } from "react";

interface Props {
  src: string;
  alt?: string;
}

export function QuestionImage({ src, alt = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-red-700/50 bg-red-950/30 p-3 font-mono text-xs text-red-300">
        ⚠ Bild konnte nicht geladen werden:
        <span className="ml-1 text-red-200 truncate max-w-full">{src}</span>
      </div>
    );
  }

  return (
    <>
      {/* 16:9 preview — same aspect as participant cameras */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block aspect-video w-full cursor-zoom-in overflow-hidden rounded-lg border border-white/10 bg-[#06130b] shadow-lg transition-all hover:border-lime-200/42"
        aria-label="Bild vergrößern"
      >
        {/* Skeleton shown until the image loads */}
        {!loaded && (
          <div className="absolute inset-0 bg-emerald-900/40 animate-pulse flex items-center justify-center">
            <div className="text-emerald-700 text-sm">⏳</div>
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={[
            "absolute inset-0 w-full h-full object-cover transition-all group-hover:scale-[1.02]",
            loaded ? "opacity-100" : "opacity-0",
          ].join(" ")}
          draggable={false}
        />
        {/* Subtle hover hint */}
        <div className="absolute inset-0 bg-emerald-950/0 group-hover:bg-emerald-950/15 transition-colors flex items-end justify-end p-2">
          <div className="rounded-md bg-[#020b07]/82 px-2 py-1 text-xs font-bold text-lime-100 opacity-0 transition-opacity group-hover:opacity-100">
            🔍 Klicken zum Vergrößern
          </div>
        </div>
      </button>

      {/* Fullscreen lightbox */}
      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95 cursor-zoom-out p-6"
          onClick={() => setOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-h-[95vh] max-w-[95vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full border border-lime-200/30 bg-[#020b07]/85 text-2xl font-bold text-lime-100 transition-colors hover:bg-emerald-950"
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>
      ) : null}
    </>
  );
}
