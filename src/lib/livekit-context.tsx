"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createLocalVideoTrack,
  Room,
  RoomEvent,
  Track,
  type LocalParticipant,
  type RemoteParticipant,
} from "livekit-client";

type LiveKitStatus = "idle" | "connecting" | "connected" | "disabled" | "error";
type CameraStatus = "idle" | "requesting" | "live" | "error";

type LiveKitTokenResponse =
  | {
      token: string;
      url: string;
      room: string;
      identity: string;
    }
  | { error: string };

type LiveKitContextValue = {
  room: Room | null;
  status: LiveKitStatus;
  cameraStatus: CameraStatus;
  error: string | null;
  revision: number;
  videoDevices: MediaDeviceInfo[];
  selectedVideoDeviceId: string;
  setSelectedVideoDeviceId: (deviceId: string) => void;
  refreshVideoDevices: () => Promise<void>;
  publishCamera: () => Promise<void>;
  getParticipant: (identity: string) => LocalParticipant | RemoteParticipant | null;
};

const LiveKitContext = createContext<LiveKitContextValue | null>(null);
const VIDEO_DEVICE_STORAGE_KEY = "quizduell.videoDeviceId";
const VIDEO_AUTO_PUBLISH_STORAGE_KEY = "quizduell.videoAutoPublish";

async function publishCameraTrack(room: Room, deviceId?: string) {
  const existing = room.localParticipant.getTrackPublication(Track.Source.Camera);
  if (existing?.track) {
    await room.localParticipant.unpublishTrack(existing.track, true);
  }

  const track = await createLocalVideoTrack({
    deviceId: deviceId || undefined,
    resolution: { width: 1280, height: 720 },
    frameRate: 30,
  });

  await room.localParticipant.publishTrack(track, {
    source: Track.Source.Camera,
    simulcast: true,
  });
}

export function LiveKitRoomProvider({
  gameId,
  publish,
  children,
}: {
  gameId: string;
  publish: boolean;
  children: ReactNode;
}) {
  const roomRef = useRef<Room | null>(null);
  const [status, setStatus] = useState<LiveKitStatus>("idle");
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceIdState] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(VIDEO_DEVICE_STORAGE_KEY) ?? "";
  });
  const [shouldAutoPublish, setShouldAutoPublish] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(VIDEO_AUTO_PUBLISH_STORAGE_KEY) === "1";
  });
  const selectedVideoDeviceIdRef = useRef(selectedVideoDeviceId);

  const bump = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    selectedVideoDeviceIdRef.current = selectedVideoDeviceId;
  }, [selectedVideoDeviceId]);

  const setSelectedVideoDeviceId = useCallback((deviceId: string) => {
    setSelectedVideoDeviceIdState(deviceId);
    if (typeof window === "undefined") return;
    if (deviceId) {
      window.localStorage.setItem(VIDEO_DEVICE_STORAGE_KEY, deviceId);
    } else {
      window.localStorage.removeItem(VIDEO_DEVICE_STORAGE_KEY);
    }
  }, []);

  const refreshVideoDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === "videoinput");
    setVideoDevices(cameras);
    setSelectedVideoDeviceIdState((current) => {
      if (!current) return current;
      if (cameras.some((device) => device.deviceId === current)) return current;
      window.localStorage.removeItem(VIDEO_DEVICE_STORAGE_KEY);
      return "";
    });
  }, []);

  const publishCamera = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;

    try {
      setCameraStatus("requesting");
      setError(null);
      await publishCameraTrack(room, selectedVideoDeviceIdRef.current);
      setCameraStatus("live");
      setShouldAutoPublish(true);
      window.localStorage.setItem(VIDEO_AUTO_PUBLISH_STORAGE_KEY, "1");
      await refreshVideoDevices();
      bump();
    } catch (err) {
      console.error("[livekit] camera publish failed", err);
      setCameraStatus("error");
      setError(err instanceof Error ? err.message : "Camera could not start");
    }
  }, [bump, refreshVideoDevices]);

  useEffect(() => {
    void refreshVideoDevices();
    navigator.mediaDevices?.addEventListener?.("devicechange", refreshVideoDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener?.(
        "devicechange",
        refreshVideoDevices,
      );
    };
  }, [refreshVideoDevices]);

  useEffect(() => {
    let cancelled = false;
    let room: Room | null = null;

    async function connect() {
      setStatus("connecting");
      setError(null);

      const role = publish ? "publisher" : "viewer";
      const response = await fetch(
        `/api/livekit/token?gameId=${encodeURIComponent(gameId)}&role=${role}`,
      );
      const data = (await response.json().catch(() => null)) as
        | LiveKitTokenResponse
        | null;

      if (cancelled) return;

      if (!response.ok || !data || "error" in data) {
        const code = data && "error" in data ? data.error : "token_failed";
        if (code === "livekit_not_configured") {
          setStatus("disabled");
          return;
        }
        throw new Error(code);
      }

      room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      const events = [
        RoomEvent.Connected,
        RoomEvent.Disconnected,
        RoomEvent.ParticipantConnected,
        RoomEvent.ParticipantDisconnected,
        RoomEvent.TrackSubscribed,
        RoomEvent.TrackUnsubscribed,
        RoomEvent.LocalTrackPublished,
        RoomEvent.LocalTrackUnpublished,
      ];
      events.forEach((event) => room?.on(event, bump));

      await room.connect(data.url, data.token);
      if (cancelled) {
        room.disconnect();
        return;
      }

      roomRef.current = room;
      setStatus("connected");
      bump();

      if (publish && shouldAutoPublish) {
        await publishCamera();
      }
    }

    connect().catch((err) => {
      if (cancelled) return;
      console.error("[livekit] connect failed", err);
      setStatus("error");
      setCameraStatus("error");
      setError(err instanceof Error ? err.message : "LiveKit connection failed");
    });

    return () => {
      cancelled = true;
      roomRef.current = null;
      room?.disconnect();
      setStatus("idle");
      setCameraStatus("idle");
    };
  }, [bump, gameId, publish, publishCamera, shouldAutoPublish]);

  const getParticipant = useCallback(
    (identity: string) => {
      const room = roomRef.current;
      if (!room) return null;
      if (room.localParticipant.identity === identity) return room.localParticipant;
      return room.remoteParticipants.get(identity) ?? null;
    },
    [revision],
  );

  const value = useMemo<LiveKitContextValue>(
    () => ({
      room: roomRef.current,
      status,
      cameraStatus,
      error,
      revision,
      videoDevices,
      selectedVideoDeviceId,
      setSelectedVideoDeviceId,
      refreshVideoDevices,
      publishCamera,
      getParticipant,
    }),
    [
      cameraStatus,
      error,
      getParticipant,
      publishCamera,
      refreshVideoDevices,
      revision,
      selectedVideoDeviceId,
      setSelectedVideoDeviceId,
      status,
      videoDevices,
    ],
  );

  return (
    <LiveKitContext.Provider value={value}>{children}</LiveKitContext.Provider>
  );
}

export function useLiveKitRoom(): LiveKitContextValue {
  const value = useContext(LiveKitContext);
  if (!value) {
    return {
      room: null,
      status: "disabled",
      cameraStatus: "idle",
      error: null,
      revision: 0,
      videoDevices: [],
      selectedVideoDeviceId: "",
      setSelectedVideoDeviceId: () => {},
      refreshVideoDevices: async () => {},
      publishCamera: async () => {},
      getParticipant: () => null,
    };
  }
  return value;
}
