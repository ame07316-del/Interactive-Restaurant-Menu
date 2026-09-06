import { createBrowserClient, isSupabaseConfigured } from "./supabase";

/**
 * حالة دخول صاحب المطعم عن طريق Supabase Auth (إيميل + باسورد).
 * لو متغيرات البيئة ناقصة → enabled = false واللوحة بترجع لوضع الرقم السري (demo).
 */
export interface AuthState {
  /** Supabase متظبط ومتاح */
  enabled: boolean;
  /** خلّصنا قراءة الجلسة من المتصفح */
  checked: boolean;
  email: string | null;
  userId: string | null;
  busy: boolean;
  error: string | null;
}

export const AUTH_SERVER_STATE: AuthState = {
  enabled: false,
  checked: false,
  email: null,
  userId: null,
  busy: false,
  error: null,
};

let state: AuthState = AUTH_SERVER_STATE;
let initialized = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of [...listeners]) listener();
}

function set(patch: Partial<AuthState>) {
  state = { ...state, ...patch };
  emit();
}

function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  if (!isSupabaseConfigured()) {
    // وضع الديمو: مفيش Supabase — اللوحة هتستعمل الرقم السري
    set({ enabled: false, checked: true });
    return;
  }

  const client = createBrowserClient();
  if (!client) {
    set({ enabled: false, checked: true });
    return;
  }

  set({ enabled: true });

  client.auth
    .getSession()
    .then(({ data }) => {
      set({
        checked: true,
        email: data.session?.user.email ?? null,
        userId: data.session?.user.id ?? null,
      });
    })
    .catch(() => {
      // النت مقطوع مثلاً — بنكمل شغل بالكاش المحلي
      set({ checked: true });
    });

  client.auth.onAuthStateChange((_event, session) => {
    set({
      checked: true,
      email: session?.user.email ?? null,
      userId: session?.user.id ?? null,
    });
  });
}

export function subscribeAuth(listener: () => void): () => void {
  listeners.add(listener);
  ensureInit();
  return () => {
    listeners.delete(listener);
  };
}

export function getAuthSnapshot(): AuthState {
  return state;
}

/** true لو نقدر نكتب على Supabase دلوقتي (متظبط + مسجّل دخول) */
export function canWriteToCloud(): boolean {
  return state.enabled && Boolean(state.userId);
}

export async function signInWithPassword(email: string, password: string): Promise<boolean> {
  const client = createBrowserClient();
  if (!client) {
    set({ error: "Supabase مش متظبط على النسخة دي" });
    return false;
  }
  set({ busy: true, error: null });
  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      set({ busy: false, error: translateAuthError(error.message) });
      return false;
    }
    set({
      busy: false,
      error: null,
      email: data.user?.email ?? null,
      userId: data.user?.id ?? null,
    });
    return true;
  } catch (error) {
    set({
      busy: false,
      error: error instanceof Error ? translateAuthError(error.message) : "تعذّر الاتصال بالسيرفر",
    });
    return false;
  }
}

export async function signOutFromCloud() {
  const client = createBrowserClient();
  if (!client) return;
  set({ busy: true });
  try {
    await client.auth.signOut();
  } catch {
    /* حتى لو الشبكة فشلت بنمسح الحالة محلياً */
  }
  set({ busy: false, email: null, userId: null, error: null });
}

export function clearAuthError() {
  if (state.error) set({ error: null });
}

/** يضيف access token الحالي لطلبات API المحمية. */
export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const client = createBrowserClient();
  const token = client ? (await client.auth.getSession()).data.session?.access_token : null;
  const headers = new Headers(init.headers);
  if (token) headers.set("authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

function translateAuthError(message: string): string {
  const text = message.toLowerCase();
  if (text.includes("invalid login")) return "الإيميل أو الباسورد غلط";
  if (text.includes("email not confirmed")) return "الإيميل لسه متأكدش — افتح رسالة التأكيد";
  if (text.includes("rate limit") || text.includes("too many")) return "محاولات كتير — استنى شوية وجرّب تاني";
  if (text.includes("failed to fetch") || text.includes("network")) return "مفيش اتصال بالسيرفر — الشغل هيفضل محلي";
  return message;
}
