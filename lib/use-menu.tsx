"use client";

import { useSyncExternalStore } from "react";
import {
  MENU_SERVER_STATE,
  addItem,
  addCategory,
  deleteCategory,
  deleteItem,
  duplicateItem,
  exportJson,
  getMenuSnapshot,
  importJson,
  moveCategory,
  moveItem,
  patchBrand,
  patchCommerce,
  patchContact,
  resetToDefaults,
  setCategoryAvailability,
  subscribeMenu,
  updateCategory,
  updateItem,
  updateMenu,
} from "./menu-store-core";

/** كل مكونات الموقع بتقرا البيانات من الباك إند عن طريق هنا — والتعديلات بتتحفظ أوتوماتيك */
export function useMenu() {
  const state = useSyncExternalStore(subscribeMenu, getMenuSnapshot, () => MENU_SERVER_STATE);
  return {
    ...state,
    update: updateMenu,
    patchBrand,
    patchContact,
    patchCommerce,
    addCategory,
    updateCategory,
    deleteCategory,
    moveCategory,
    addItem,
    updateItem,
    deleteItem,
    duplicateItem,
    moveItem,
    setCategoryAvailability,
    exportJson,
    importJson,
    resetToDefaults,
  };
}
