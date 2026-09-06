"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  AUTH_SERVER_STATE,
  clearAuthError,
  getAuthSnapshot,
  signInWithPassword,
  signOutFromCloud,
  subscribeAuth,
} from "./supabase-auth-core";
import { refreshMenu } from "./menu-store-core";

/**
 * جلسة الأدمن — دخول حصري عن طريق Supabase Auth (إيميل + باسورد)
 * من الحساب الموجود في Supabase → Authentication → Users.
 */
export function useAdminSession() {
  const auth = useSyncExternalStore(subscribeAuth, getAuthSnapshot, () => AUTH_SERVER_STATE);

  const signIn = useCallback(async (email: string, password: string) => {
    const ok = await signInWithPassword(email, password);
    if (ok) await refreshMenu();
    return ok;
  }, []);

  const logout = useCallback(async () => {
    await signOutFromCloud();
    window.location.reload();
  }, []);

  return {
    configured: auth.configured,
    authed: Boolean(auth.userId),
    checked: auth.checked,
    signIn,
    logout,
    email: auth.email,
    busy: auth.busy,
    authError: auth.error,
    clearAuthError,
  };
}
