"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * ربط التبويب الحالي بالـ hash في اللينك (مثال: /admin#items)
 * عشان الريفريش ما يرجعكش على أول لوحة.
 */
const listeners = new Set<() => void>();

function emit() {
  for (const listener of [...listeners]) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("hashchange", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("hashchange", listener);
  };
}

function getSnapshot() {
  return window.location.hash.replace(/^#/, "");
}

function getServerSnapshot() {
  return "";
}

export function setHash(value: string) {
  if (window.location.hash === `#${value}`) return;
  window.history.replaceState(null, "", `#${value}`);
  emit();
}

export function useHashValue<T extends string>(allowed: readonly T[], fallback: T) {
  const hash = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const value = (allowed as readonly string[]).includes(hash) ? (hash as T) : fallback;
  const setValue = useCallback((next: T) => setHash(next), []);
  return [value, setValue] as const;
}
