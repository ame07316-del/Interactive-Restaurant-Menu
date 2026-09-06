"use client";

import { useCallback, useSyncExternalStore } from "react";
import { ADMIN_SERVER_SNAPSHOT, adminLogin, adminLogout, getAdminSnapshot, getAdminReadySnapshot, subscribeAdmin } from "./admin-session-core";
import { refreshMenu } from "./menu-store-core";

export function useAdminSession(_pin: string, locked: boolean) {
  const granted = useSyncExternalStore(subscribeAdmin, getAdminSnapshot, () => ADMIN_SERVER_SNAPSHOT);
  const initialized = useSyncExternalStore(subscribeAdmin, getAdminReadySnapshot, () => 0);
  const login = useCallback(async (attempt: string, remember = false) => {
    const ok = await adminLogin(attempt, remember);
    if (ok) await refreshMenu();
    return ok;
  }, []);
  const logout = useCallback(async () => { await adminLogout(); window.location.reload(); }, []);
  return { authed: !locked || granted, checked: initialized === 1, login, logout };
}
