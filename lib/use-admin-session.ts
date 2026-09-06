"use client";

import { useCallback, useSyncExternalStore } from "react";
import { ADMIN_SERVER_SNAPSHOT, adminLogin, adminLogout, getAdminSnapshot, getAdminReadySnapshot, subscribeAdmin } from "./admin-session-core";
import {
  AUTH_SERVER_STATE,
  clearAuthError,
  getAuthSnapshot,
  signInWithPassword,
  signOutFromCloud,
  subscribeAuth,
} from "./supabase-auth-core";
import { refreshMenu } from "./menu-store-core";

export type AdminAuthMode = "supabase" | "pin";

export function useAdminSession(_pin: string, locked: boolean) {
  const auth = useSyncExternalStore(subscribeAuth, getAuthSnapshot, () => AUTH_SERVER_STATE);
  const fallbackGranted = useSyncExternalStore(subscribeAdmin, getAdminSnapshot, () => ADMIN_SERVER_SNAPSHOT);
  const fallbackReady = useSyncExternalStore(subscribeAdmin, getAdminReadySnapshot, () => 0);
  const mode: AdminAuthMode = auth.enabled ? "supabase" : "pin";

  const login = useCallback(async (attempt: string, remember = false) => {
    const ok = await adminLogin(attempt, remember);
    if (ok) await refreshMenu();
    return ok;
  }, []);
  const signIn = useCallback(async (email: string, password: string) => {
    const ok = await signInWithPassword(email, password);
    if (ok) await refreshMenu();
    return ok;
  }, []);
  const logout = useCallback(async () => {
    if (auth.enabled) await signOutFromCloud();
    else await adminLogout();
    window.location.reload();
  }, [auth.enabled]);

  return {
    mode,
    authed: mode === "supabase" ? Boolean(auth.userId) : (!locked || fallbackGranted),
    checked: mode === "supabase" ? auth.checked : fallbackReady === 1,
    login,
    signIn,
    logout,
    email: auth.email,
    busy: auth.busy,
    authError: auth.error,
    clearAuthError,
  };
}
