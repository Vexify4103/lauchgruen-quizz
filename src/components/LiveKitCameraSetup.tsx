"use client";

import { useEffect, useRef, useState } from "react";
import { ParticipantTile } from "@/components/ParticipantTile";
import { useLiveKitRoom } from "@/lib/livekit-context";
import type { Player } from "@/server/types";

export function LiveKitCameraSetup({
  player,
  gameId,
}: {
  player: Player;
  gameId: string;
}) {
  const [cameraMenuOpen, setCameraMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const {
    status,
    cameraStatus,
    error,
    videoDevices,
    selectedVideoDeviceId,
    setSelectedVideoDeviceId,
    refreshVideoDevices,
    publishCamera,
  } = useLiveKitRoom();
  const disabled = status === "connecting" || cameraStatus === "requesting";
  const isLive = status === "connected" && cameraStatus === "live";
  const selectedCameraLabel =
    videoDevices.find((device) => device.deviceId === selectedVideoDeviceId)
      ?.label ?? "Browser-Standardkamera";

  useEffect(() => {
    if (!cameraMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setCameraMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCameraMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [cameraMenuOpen]);

  return (
    <div className="mt-4 grid gap-4">
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-white/10 bg-black/30">
        <ParticipantTile
          player={player}
          gameId={gameId}
          isCurrentTurn={false}
          isHost={false}
          showStats={false}
        />
      </div>

        <div className="flex flex-col gap-3">
        <div className="grid gap-3 rounded-lg border border-white/8 bg-white/[0.025] p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative min-w-0" ref={menuRef}>
            <div className="section-kicker">Kameraquelle</div>
            <button
              type="button"
              onClick={() => setCameraMenuOpen((open) => !open)}
              disabled={disabled || status === "disabled"}
              aria-haspopup="listbox"
              aria-expanded={cameraMenuOpen}
              className="quiz-input mt-2 flex h-12 w-full min-w-0 items-center justify-between gap-3 px-4 text-left text-sm font-black text-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="truncate">{selectedCameraLabel}</span>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-lime-300/20 bg-lime-400/[0.08] text-lime-100">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  className={[
                    "h-4 w-4 fill-current transition-transform",
                    cameraMenuOpen ? "rotate-180" : "",
                  ].join(" ")}
                >
                  <path d="M5.5 7.5 10 12l4.5-4.5h-9Z" />
                </svg>
              </span>
            </button>

            {cameraMenuOpen ? (
              <div
                role="listbox"
                className="themed-scrollbar absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 max-h-64 overflow-y-auto rounded-lg border border-lime-300/20 bg-[#052e1a]/98 p-1.5 shadow-2xl shadow-black/45 backdrop-blur"
              >
                {[
                  { deviceId: "", label: "Browser-Standardkamera" },
                  ...videoDevices.map((device, index) => ({
                    deviceId: device.deviceId,
                    label: device.label || `Kamera ${index + 1}`,
                  })),
                ].map((device, optionIndex) => {
                  const selected = device.deviceId === selectedVideoDeviceId;
                  return (
                    <button
                      key={`${device.deviceId || "default"}-${optionIndex}`}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        setSelectedVideoDeviceId(device.deviceId);
                        setCameraMenuOpen(false);
                        window.setTimeout(() => void publishCamera(), 0);
                      }}
                      className={[
                        "flex min-h-10 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold transition-colors",
                        selected
                          ? "bg-lime-500 text-lime-50"
                          : "text-emerald-100 hover:bg-white/[0.05] hover:text-lime-100",
                      ].join(" ")}
                    >
                      <span className="truncate">{device.label}</span>
                      {selected ? (
                        <span className="shrink-0 text-xs font-black uppercase tracking-[0.12em]">
                          Aktiv
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => void refreshVideoDevices()}
            disabled={disabled || status === "disabled"}
            className="quiz-button-secondary h-12 self-end px-4 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Aktualisieren
          </button>
        </div>

        <div className="rounded-lg border border-white/8 bg-white/[0.025] px-4 py-3 text-sm leading-6 text-emerald-100/58">
          {status === "disabled"
            ? "LiveKit ist noch nicht konfiguriert. Setze LIVEKIT_* Variablen, dann verbindet sich die Kamera hier direkt."
            : isLive
              ? "Kamera ist mit dem Videoraum verbunden. Du kannst die Quelle jederzeit wechseln."
              : "Wähle bei Bedarf OBS Virtual Camera oder eine andere Kamera, dann startet dein Browser den Videostream."}
        </div>

        {error ? (
          <div className="rounded-lg border border-red-400/24 bg-red-950/40 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        {status !== "disabled" ? (
          <button
            type="button"
            onClick={() => void publishCamera()}
            disabled={disabled}
            className="quiz-button-primary w-fit disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {disabled
              ? "Kamera verbindet..."
              : isLive
                ? "Kamera wechseln"
                : "Kamera verbinden"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
