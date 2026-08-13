"use client";

import { useState } from "react";

interface Props {
  src: string;
  alt?: string;
}

export function QuestionImage({ src, alt = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = failedSrc === src;

  if (failed) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-red-700/50 bg-red-950/30 p-3 font-mono text-xs text-red-300">
        Bild konnte nicht geladen werden:
        <span className="ml-1 max-w-full truncate text-red-200">{src}</span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block aspect-video w-full cursor-zoom-in overflow-hidden rounded-lg border border-white/10 bg-black shadow-lg transition-colors hover:border-lime-200/42"
        aria-label="Bild vergrößern"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          onError={() => setFailedSrc(src)}
          className="absolute inset-0 h-full w-full object-contain"
          draggable={false}
        />
        <div className="absolute inset-0 flex items-end justify-end bg-transparent p-2 transition-colors group-hover:bg-black/10">
          <div className="rounded-md bg-black/82 px-2 py-1 text-xs font-bold text-lime-100 opacity-0 transition-opacity group-hover:opacity-100">
            Vergrößern
          </div>
        </div>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex cursor-zoom-out items-center justify-center bg-black/95 p-6"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Vergrößerte Bildansicht"
        >
          <div className="h-[calc(100vh-3rem)] w-[calc(100vw-3rem)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="h-full w-full object-contain drop-shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            />
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full border border-lime-200/30 bg-black/85 text-2xl font-bold text-lime-100 transition-colors hover:bg-emerald-950"
            aria-label="Vergrößerte Bildansicht schließen"
          >
            ×
          </button>
        </div>
      ) : null}
    </>
  );
}
