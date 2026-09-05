"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  CART_SERVER_SNAPSHOT,
  addToCart,
  clearCart,
  getCartSnapshot,
  removeFromCart,
  setCartQuantity,
  subscribeCart,
} from "./cart-store-core";
import type { CartLine, MenuItem } from "./types";

export interface DetailedLine {
  line: CartLine;
  item: MenuItem;
}

/** سلة العميل — بتتحفظ في المتصفح فمتضيعش لو الصفحة اتقفلت */
export function useCart(menuItems: MenuItem[]) {
  const lines = useSyncExternalStore(subscribeCart, getCartSnapshot, () => CART_SERVER_SNAPSHOT);

  const detailed = useMemo(
    () =>
      lines
        .map((line) => {
          const item = menuItems.find((candidate) => candidate.id === line.itemId);
          return item ? { line, item } : null;
        })
        .filter((value): value is DetailedLine => value !== null),
    [lines, menuItems],
  );

  const add = useCallback((id: string) => addToCart(id), []);
  const setQuantity = useCallback((id: string, quantity: number) => setCartQuantity(id, quantity), []);
  const remove = useCallback((id: string) => removeFromCart(id), []);
  const clear = useCallback(() => clearCart(), []);
  const quantityOf = useCallback(
    (id: string) => lines.find((line) => line.itemId === id)?.quantity ?? 0,
    [lines],
  );

  return { lines: detailed, loaded: true, add, setQuantity, remove, clear, quantityOf };
}
