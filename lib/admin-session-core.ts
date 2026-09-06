export const ADMIN_SERVER_SNAPSHOT = false;
let granted = false;
let initialized = false;
const listeners = new Set<() => void>();
function emit() { for (const listener of [...listeners]) listener(); }

async function checkSession() {
  try {
    const response = await fetch("/api/admin/session", { cache: "no-store" });
    const result = await response.json();
    granted = Boolean(result.authenticated);
  } catch { granted = false; }
  initialized = true;
  emit();
}

function ensureInit() { if (initialized || typeof window === "undefined") return; initialized = true; void checkSession(); }
export function subscribeAdmin(listener: () => void) { listeners.add(listener); ensureInit(); return () => listeners.delete(listener); }
export function getAdminSnapshot() { return granted; }
export function getAdminReadySnapshot() { return initialized ? 1 : 0; }

export async function adminLogin(attempt: string, remember = false) {
  const response = await fetch("/api/admin/login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ pin: attempt, remember }),
  });
  granted = response.ok; initialized = true; emit();
  return response.ok;
}
export async function adminLogout() {
  await fetch("/api/admin/session", { method: "DELETE" });
  granted = false; emit();
}
