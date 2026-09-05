import { CART_KEY } from "./defaults";
import type { CartLine } from "./types";

/** سلة الطلبات: مصدر الحقيقة localStorage، والقراءة عن طريق useSyncExternalStore */
export const CART_SERVER_SNAPSHOT: CartLine[] = [];

let snapshot: CartLine[] = CART_SERVER_SNAPSHOT;
let initialized = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of [...listeners]) listener();
}

function read(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return CART_SERVER_SNAPSHOT;
    const parsed = JSON.parse(raw) as CartLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return CART_SERVER_SNAPSHOT;
  }
}

function write(next: CartLine[]) {
  snapshot = next;
  try {
    if (next.length) window.localStorage.setItem(CART_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(CART_KEY);
  } catch {
    /* التخزين ممتلئ — السلة تفضل شغالة في الذاكرة */
  }
  emit();
}

function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  snapshot = read();
  window.addEventListener("storage", (event) => {
    if (event.key === CART_KEY) {
      snapshot = read();
      emit();
    }
  });
}

export function subscribeCart(listener: () => void) {
  listeners.add(listener);
  ensureInit();
  return () => {
    listeners.delete(listener);
  };
}

export function getCartSnapshot(): CartLine[] {
  return snapshot;
}

export function addToCart(itemId: string) {
  const existing = snapshot.find((line) => line.itemId === itemId);
  write(
    existing
      ? snapshot.map((line) => (line.itemId === itemId ? { ...line, quantity: line.quantity + 1 } : line))
      : [...snapshot, { itemId, quantity: 1 }],
  );
}

export function setCartQuantity(itemId: string, quantity: number) {
  if (quantity <= 0) return removeFromCart(itemId);
  write(snapshot.map((line) => (line.itemId === itemId ? { ...line, quantity } : line)));
}

export function removeFromCart(itemId: string) {
  write(snapshot.filter((line) => line.itemId !== itemId));
}

export function clearCart() {
  write([]);
}
