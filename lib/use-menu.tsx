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
  patchAdmin,
  patchBrand,
  patchCommerce,
  patchContact,
  publishNow,
  refreshFromCloud,
  resetToDefaults,
  retryCloud,
  saveDraftNow,
  setCategoryAvailability,
  subscribeMenu,
  updateCategory,
  updateItem,
  updateMenu,
} from "./menu-store-core";

/** كل مكونات الموقع بتقرا البيانات من هنا — والتعديلات بتتحفظ أوتوماتيك */
export function useMenu() {
  const state = useSyncExternalStore(subscribeMenu, getMenuSnapshot, () => MENU_SERVER_STATE);
  return {
    ...state,
    update: updateMenu,
    patchBrand,
    patchContact,
    patchCommerce,
    patchAdmin,
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
    // المزامنة مع Supabase (بتتجاهل نفسها لو Supabase مش متظبط)
    publishNow,
    saveDraftNow,
    retryCloud,
    refreshFromCloud,
  };
}
