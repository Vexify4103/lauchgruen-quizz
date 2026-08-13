"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "lauchgruen-quiz-volume";
const DEFAULT_VOLUME = 1;
const listeners = new Set<() => void>();

let currentVolume = DEFAULT_VOLUME;
let storageLoaded = false;

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_VOLUME;
  return Math.min(1, Math.max(0, value));
}

function loadStoredVolume(): void {
  if (storageLoaded || typeof window === "undefined") return;
  storageLoaded = true;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored !== null) currentVolume = clampVolume(Number(stored));
}

export function getSiteVolume(): number {
  loadStoredVolume();
  return currentVolume;
}

export function setSiteVolume(value: number): void {
  const nextVolume = clampVolume(value);
  if (nextVolume === currentVolume && storageLoaded) return;

  storageLoaded = true;
  currentVolume = nextVolume;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, String(nextVolume));
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    currentVolume = clampVolume(Number(event.newValue ?? DEFAULT_VOLUME));
    storageLoaded = true;
    listeners.forEach((subscriber) => subscriber());
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useSiteVolume(): number {
  return useSyncExternalStore(subscribe, getSiteVolume, () => DEFAULT_VOLUME);
}
