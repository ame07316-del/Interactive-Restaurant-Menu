"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, FolderTree, Plus, Trash2 } from "lucide-react";
import { useMenu } from "@/lib/use-menu";
import { Button, EmptyState, Field, IconButton, Panel, TextInput, Toast, useToast } from "@/components/ui";
import { cx } from "@/lib/cx";

const EMOJIS = ["🍔", "🍕", "🍢", "🍟", "🥤", "🍮", "🥗", "🌯", "🍗", "🍜", "🍣", "🍰", "☕", "🥙", "🍝", "🧃"];

export function CategoriesPanel({ intent, nonce }: { intent?: string; nonce: number }) {
  const { data, addCategory, updateCategory, deleteCategory, moveCategory } = useMenu();
  const [draft, setDraft] = useState({ name: "", nameEn: "", emoji: "🍽️" });
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const addRef = useRef<HTMLInputElement>(null);
  const { toast, show } = useToast();

  useEffect(() => {
    if (intent === "new") {
      addRef.current?.focus();
      addRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [nonce, intent]);

  const submit = () => {
    if (!draft.name.trim()) {
      show("اكتب اسم القسم الأول", "error");
      return;
    }
    addCategory({ name: draft.name.trim(), nameEn: draft.nameEn.trim(), emoji: draft.emoji, visible: true });
    setDraft({ name: "", nameEn: "", emoji: "🍽️" });
    show("تمت إضافة القسم ✅");
  };

  return (
    <div className="space-y-4">
      <Panel
        title="أقسام القائمة"
        description="الترتيب هنا هو ترتيب الأقسام في الموقع، والأسهم تنقل القسم فوق وتحت"
        icon={<FolderTree className="h-4 w-4" />}
      >
        {data.categories.length === 0 ? (
          <EmptyState title="مفيش أقسام" description="أضف قسم على الأقل عشان الأصناف تظهر للعملاء" />
        ) : (
          <ul className="space-y-2.5">
            {data.categories.map((category, index) => {
              const count = data.items.filter((item) => item.categoryId === category.id).length;
              return (
                <li
                  key={category.id}
                  className={cx(
                    "rounded-xl border border-line bg-surface-2/40 p-2.5",
                    !category.visible && "opacity-60",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="grid w-6 shrink-0 place-items-center text-[11px] font-black text-muted">
                      {index + 1}
                    </span>
                    <button
                      onClick={() => updateCategory(category.id, { emoji: category.emoji || "" })}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-surface text-lg"
                      title="الإيموجي"
                    >
                      {category.emoji || "🍽️"}
                    </button>
                    <TextInput
                      value={category.name}
                      onChange={(event) => updateCategory(category.id, { name: event.target.value })}
                      className="h-9 min-w-32 flex-1 py-1.5"
                    />
                    <TextInput
                      value={category.nameEn ?? ""}
                      onChange={(event) => updateCategory(category.id, { nameEn: event.target.value })}
                      className="h-9 min-w-28 flex-1 py-1.5"
                      placeholder="English name"
                    />
                    <span className="shrink-0 rounded-lg bg-surface px-2 py-1 text-[11px] font-bold text-muted">
                      {count} صنف
                    </span>

                    <div className="flex shrink-0 items-center gap-1">
                      <IconButton label="لأعلى" disabled={index === 0} onClick={() => moveCategory(category.id, -1)}>
                        <ChevronUp className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton
                        label="لأسفل"
                        disabled={index === data.categories.length - 1}
                        onClick={() => moveCategory(category.id, 1)}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton
                        label={category.visible ? "إخفاء من الموقع" : "إظهار في الموقع"}
                        onClick={() => updateCategory(category.id, { visible: !category.visible })}
                        className={category.visible ? "text-accent" : ""}
                      >
                        {category.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </IconButton>
                      {confirmId === category.id ? (
                        <button
                          onClick={() => {
                            deleteCategory(category.id);
                            setConfirmId(null);
                            show(`اتحذف «${category.name}» وأصنافه اتنقلت للقسم اللي بعده`);
                          }}
                          className="shrink-0 rounded-lg bg-red-500/15 px-2 py-1 text-[11px] font-black text-red-400"
                        >
                          تأكيد الحذف
                        </button>
                      ) : (
                        <IconButton
                          label="حذف القسم"
                          className="hover:border-red-500/50 hover:text-red-400"
                          onClick={() => {
                            if (data.categories.length <= 1) {
                              show("لازم يفضل قسم واحد على الأقل", "error");
                              return;
                            }
                            setConfirmId(category.id);
                            window.setTimeout(() => setConfirmId((current) => (current === category.id ? null : current)), 4000);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </IconButton>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5 ps-8">
                    <span className="text-[11px] font-bold text-muted">إيموجي:</span>
                    {EMOJIS.slice(0, 10).map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => updateCategory(category.id, { emoji })}
                        className={cx(
                          "h-7 w-7 rounded-lg border text-sm transition hover:scale-110",
                          category.emoji === emoji ? "border-accent bg-accent/15" : "border-line bg-surface",
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel title="قسم جديد" icon={<Plus className="h-4 w-4" />}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="الاسم بالعربي">
            <TextInput ref={addRef} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="فطور" />
          </Field>
          <Field label="الاسم بالإنجليزي">
            <TextInput value={draft.nameEn} onChange={(event) => setDraft({ ...draft, nameEn: event.target.value })} placeholder="Breakfast" />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => setDraft({ ...draft, emoji })}
              className={cx(
                "h-8 w-8 rounded-lg border text-base transition hover:scale-110",
                draft.emoji === emoji ? "border-accent bg-accent/15" : "border-line bg-surface",
              )}
            >
              {emoji}
            </button>
          ))}
          <Button className="ms-auto" onClick={submit}>
            <Plus className="h-4 w-4" /> إضافة القسم
          </Button>
        </div>
      </Panel>

      {toast ? <Toast message={toast.text} tone={toast.tone} /> : null}
    </div>
  );
}
