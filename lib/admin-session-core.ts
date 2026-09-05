import { SESSION_KEY } from "./defaults";

/**
 * حالة الدخول للوحة التحكم — مخزنة في متصفح الجهاز فقط.
 * للتوضيح: دي حماية للواجهة بس (مفيش باك إند أصلًا)، كفاية عشان حد ما يفتحش اللوحة بالغلط.
 */
export const ADMIN_SERVER_SNAPSHOT = false;

let granted = ADMIN_SERVER_SNAPSHOT;
let initialized = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of [...listeners]) listener();
}

function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  granted =
    window.sessionStorage.getItem(SESSION_KEY) === "granted" ||
    window.localStorage.getItem(SESSION_KEY) === "granted";
}

export function subscribeAdmin(listener: () => void) {
  listeners.add(listener);
  ensureInit();
  return () => {
    listeners.delete(listener);
  };
}

export function getAdminSnapshot() {
  return granted;
}

/** 1 بعد ما المتصفح يقرأ الجلسة — 0 وقت الـ SSR */
export function getAdminReadySnapshot(): number {
  return initialized ? 1 : 0;
}

export function adminLogin(pin: string, attempt: string, remember = false) {
  if (!pin.trim() || attempt.trim() !== pin.trim()) return false;
  try {
    (remember ? window.localStorage : window.sessionStorage).setItem(SESSION_KEY, "granted");
  } catch {
    /* تجاهل */
  }
  granted = true;
  emit();
  return true;
}

export function adminLogout() {
  window.sessionStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(SESSION_KEY);
  granted = false;
  emit();
}
