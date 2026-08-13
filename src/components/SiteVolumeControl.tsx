"use client";

import { setSiteVolume, useSiteVolume } from "@/lib/site-volume";

export function SiteVolumeControl() {
  const volume = useSiteVolume();
  const percent = Math.round(volume * 100);

  return (
    <div className="mt-5 border-t border-white/8 pt-4">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor="site-volume"
          className="text-xs font-black uppercase text-emerald-100/72"
        >
          Lautstärke
        </label>
        <span className="min-w-10 text-right font-mono text-xs tabular-nums text-lime-200">
          {percent}%
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span className="w-5 text-center text-base text-amber-200" aria-hidden="true">
          {percent === 0 ? "🔇" : percent < 50 ? "🔉" : "🔊"}
        </span>
        <input
          id="site-volume"
          type="range"
          min={0}
          max={100}
          step={1}
          value={percent}
          onChange={(event) => setSiteVolume(Number(event.currentTarget.value) / 100)}
          className="site-volume-slider min-w-0 flex-1 cursor-pointer"
          style={{
            background: `linear-gradient(to right, rgb(251 146 60) ${percent}%, rgb(6 78 59) ${percent}%)`,
          }}
          aria-valuetext={`${percent} Prozent`}
        />
      </div>
      <p className="mt-2 text-xs leading-5 text-emerald-100/48">
        Regelt Buzzer-, Antwort- und Fragen-Audio auf diesem Gerät.
      </p>
    </div>
  );
}
