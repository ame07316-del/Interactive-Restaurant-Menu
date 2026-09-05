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

export function useAdminSession(pin: string, locked: boolean) {
  const granted = useSyncExternalStore(subscribeAdmin, getAdminSnapshot, () => ADMIN_SERVER_SNAPSHOT);
  const initialized = useSyncExternalStore(subscribeAdmin, getAdminReadySnapshot, () => 0);
  const authed = !locked || granted;
  const login = useCallback((attempt: string, remember = false) => adminLogin(pin, attempt, remember), [pin]);
  const logout = useCallback(() => adminLogout(), []);
  return { authed, checked: initialized === 1, login, logout };
}
