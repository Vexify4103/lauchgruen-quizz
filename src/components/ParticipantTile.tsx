"use client";

import { useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { Track, type VideoTrack } from "livekit-client";
import { useLiveKitRoom } from "@/lib/livekit-context";
import type { Player } from "@/server/types";

interface Props {
  player: Player;
  gameId: string;
  isCurrentTurn: boolean;
  isHost: boolean;
  hideVideo?: boolean;
  variant?: "host" | "contestant";
  showStats?: boolean;
  isLeader?: boolean;
}

export function ParticipantTile({
  player,
  isCurrentTurn,
  isHost,
  hideVideo,
  variant = "contestant",
  showStats = true,
  isLeader = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { getParticipant, revision } = useLiveKitRoom();
  const participant = getParticipant(player.id);
  const videoTrack = useMemo(() => {
    const publication = participant?.getTrackPublication(Track.Source.Camera);
    const track = publication?.track;
    return track?.kind === Track.Kind.Video ? (track as VideoTrack) : null;
  }, [participant, revision]);

  const frameClasses = isCurrentTurn
    ? "border-[3px] border-orange-300 shadow-[0_0_26px_rgba(249,115,22,0.38)]"
    : isHost
      ? "border-2 border-cyan-200/30"
      : "border border-white/10";
  const isOffline = player.connected === false && !videoTrack;
  const offlineClasses = isOffline ? "opacity-55 grayscale" : "";
  const avatarSize = variant === "host" ? 46 : 38;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoTrack || hideVideo) return;

    videoTrack.attach(video);
    return () => {
      videoTrack.detach(video);
    };
  }, [hideVideo, videoTrack]);

  return (
    <div
      className={[
        "relative h-full w-full overflow-hidden rounded-lg bg-[#160d09] transition-all",
        frameClasses,
        offlineClasses,
      ].join(" ")}
    >
      {player.avatarUrl ? (
        <Image
          src={player.avatarUrl}
          alt=""
          width={120}
          height={120}
          className="pointer-events-none absolute inset-0 m-auto rounded-full border-2 border-emerald-800/75 opacity-35"
          unoptimized
        />
      ) : null}

      {!hideVideo && videoTrack ? (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          playsInline
          title={`${player.displayName} cam`}
        />
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/30 to-transparent" />

      {showStats ? (
        <div className="absolute left-2 top-2 z-10 rounded-full border border-amber-300/30 bg-emerald-950/82 px-2.5 py-1 text-[11px] font-black text-amber-200 shadow">
          {player.score}
        </div>
      ) : null}

      {isHost ? (
        <div className="absolute right-2 top-2 z-10 rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-black uppercase text-orange-50 shadow">
          Host
        </div>
      ) : isOffline ? (
        <div className="absolute right-2 top-2 z-10 rounded-full border border-red-400/30 bg-red-950/65 px-2.5 py-1 text-[10px] font-black uppercase text-red-200">
          Offline
        </div>
      ) : null}

      {player.avatarUrl ? (
        <div
          className={[
            "absolute bottom-2 left-2 z-10 rounded-full p-0.5 shadow-lg",
            isCurrentTurn
              ? "bg-orange-400 shadow-orange-950/35"
              : "bg-emerald-950/88 shadow-black/30",
          ].join(" ")}
        >
          <Image
            src={player.avatarUrl}
            alt={player.displayName}
            width={avatarSize}
            height={avatarSize}
            className="rounded-full border-2 border-emerald-950 object-cover"
            unoptimized
          />
          {isLeader ? (
            <div className="absolute -right-1.5 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-amber-100/75 bg-gradient-to-br from-amber-200 via-amber-400 to-orange-400 shadow-lg shadow-amber-400/30">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5 fill-emerald-950"
              >
                <path d="M5.2 18.4h13.6l1.1-9.6-4.5 3.2-3.4-6.4L8.6 12 4.1 8.8l1.1 9.6Zm.4 2.4h12.8v-1.6H5.6v1.6Z" />
              </svg>
              <span className="sr-only">Führend</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="absolute bottom-2 right-2 z-10 max-w-[58%] rounded-md border border-white/10 bg-[#0b0807]/88 px-2.5 py-1 text-[10px] font-black text-emerald-50 shadow-lg shadow-black/25 backdrop-blur-sm">
        <div className="truncate">{player.displayName}</div>
      </div>
    </div>
  );
}
