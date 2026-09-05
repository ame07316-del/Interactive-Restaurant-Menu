"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  ADMIN_SERVER_SNAPSHOT,
  adminLogin,
  adminLogout,
  getAdminSnapshot,
  getAdminReadySnapshot,
  subscribeAdmin,
} from "./admin-session-core";
import {
  AUTH_SERVER_STATE,
  clearAuthError,
  getAuthSnapshot,
  signInWithPassword,
  signOutFromCloud,
  subscribeAuth,
} from "./supabase-auth-core";

export type AdminAuthMode = "supabase" | "demo";

/**
 * الدخول للوحة التحكم:
 *  - لو Supabase متظبط → إيميل + باسورد من Supabase Auth (حماية حقيقية بالـ RLS).
 *  - لو متغيرات البيئة ناقصة → وضع الديمو بالرقم السري وبيانات المتصفح بس.
 */
export function useAdminSession(pin: string, locked: boolean) {
  const auth = useSyncExternalStore(subscribeAuth, getAuthSnapshot, () => AUTH_SERVER_STATE);
  const granted = useSyncExternalStore(subscribeAdmin, getAdminSnapshot, () => ADMIN_SERVER_SNAPSHOT);
  const initialized = useSyncExternalStore(subscribeAdmin, getAdminReadySnapshot, () => 0);

  const mode: AdminAuthMode = auth.enabled ? "supabase" : "demo";
  const authed = mode === "supabase" ? Boolean(auth.userId) : !locked || granted;
  const checked = mode === "supabase" ? auth.checked && initialized === 1 : initialized === 1;

  const login = useCallback(
    (attempt: string, remember = false) => adminLogin(pin, attempt, remember),
    [pin],
  );

  const signIn = useCallback(
    (email: string, password: string) => signInWithPassword(email, password),
    [],
  );

  const logout = useCallback(() => {
    adminLogout();
    if (auth.enabled) void signOutFromCloud();
  }, [auth.enabled]);

  return {
    authed,
    checked,
    mode,
    login,
    logout,
    signIn,
    email: auth.email,
    busy: auth.busy,
    authError: auth.error,
    clearAuthError,
  };
}
