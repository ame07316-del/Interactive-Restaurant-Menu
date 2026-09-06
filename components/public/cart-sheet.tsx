"use client";

import { useMemo, useState } from "react";
import {
  CircleX,
  Clock,
  MapPin,
  Minus,
  Phone,
  Plus,
  Receipt,
  Send,
  ShoppingBag,
  Trash2,
  Truck,
} from "lucide-react";
import confetti from "canvas-confetti";
import { useMenu } from "@/lib/use-menu";
import { buildOrderMessage, computeTotals, formatPrice, ORDER_TYPE_LABEL, pick, toWhatsappNumber } from "@/lib/format";
import type { OrderType } from "@/lib/types";
import type { DetailedLine } from "@/lib/use-cart";
import { cx } from "@/lib/cx";
import { DishImage } from "./dish-card";

const TYPE_ICON: Record<OrderType, typeof Truck> = {
  delivery: Truck,
  takeaway: Receipt,
  dinein: MapPin,
};

export function CartSheet({
  open,
  onClose,
  lines,
  setQuantity,
  remove,
  clear,
}: {
  open: boolean;
  onClose: () => void;
  lines: DetailedLine[];
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
}) {
  const { data } = useMenu();
  const { brand, commerce, contact } = data;
  const lang = brand.language;
  const en = lang === "en";

  const [pickedType, setOrderType] = useState<OrderType>(commerce.orderTypes[0] ?? "delivery");
  // لو الأدمين قفل نوع الطلب اللي اختاره العميل، نرجع لأول نوع متاح
  const orderType: OrderType = commerce.orderTypes.includes(pickedType)
    ? pickedType
    : (commerce.orderTypes[0] ?? "delivery");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [table, setTable] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  const totals = useMemo(() => computeTotals(lines, commerce, orderType), [lines, commerce, orderType]);
  const belowMinimum = commerce.minimumOrder > 0 && totals.subtotal > 0 && totals.subtotal < commerce.minimumOrder;
  const needsAddress = orderType === "delivery" && commerce.requireAddress;
  const needsPhone = orderType !== "dinein" && commerce.requirePhone;

  if (!open) return null;

  const validate = () => {
    const next: Record<string, string> = {};
    if (commerce.requireName && name.trim().length < 2)
      next.name = en ? "Please write your full name" : "اكتب الاسم بالكامل";
    if (needsPhone && phone.replace(/\D/g, "").length < 10)
      next.phone = en ? "Invalid mobile number" : "رقم الموبايل مش كامل";
    if (needsAddress && address.trim().length < 8)
      next.address = en ? "Please write the detailed address" : "اكتب العنوان بالتفصيل (الشارع، رقم العقار، الدور، الشقة)";
    if (orderType === "dinein" && !table.trim())
      next.table = en ? "Table number is required" : "اكتب رقم الترابيزة";
    if (belowMinimum)
      next.total = en
        ? `Minimum order is ${formatPrice(commerce.minimumOrder, lang, commerce)}`
        : `أقل طلب ${formatPrice(commerce.minimumOrder, lang, commerce)}`;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const send = async () => {
    if (!validate() || sending) return;
    const number = toWhatsappNumber(contact.whatsapp);
    if (!number) {
      setErrors({ total: en ? "The shop did not set a WhatsApp number" : "صاحب المطعم لسه ما حددش رقم واتساب" });
      return;
    }
    const message = buildOrderMessage(
      { name, phone, address, table, notes, orderType, lines, totals },
      { lang, brand, contact, commerce },
    );
    const whatsappWindow = window.open("about:blank", "_blank");
    setSending(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lines: lines.map(({ line }) => line), orderType, total: totals.total,
          customer: { name, phone, address, table, notes },
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذر تسجيل الطلب");
      if (commerce.enableConfetti) {
        confetti({ particleCount: 130, spread: 75, origin: { y: 0.65 }, colors: [brand.accent, "#22c55e", "#ffffff"] });
      }
      const url = `https://wa.me/${number}?text=${encodeURIComponent(`${message}\n\nرقم الطلب: ${result.order.id}`)}`;
      if (whatsappWindow) whatsappWindow.location.href = url;
      else window.location.href = url;
      clear();
      onClose();
    } catch (error) {
      whatsappWindow?.close();
      setErrors({ total: error instanceof Error ? error.message : (en ? "Could not submit order" : "تعذر تسجيل الطلب") });
    } finally { setSending(false); }
  };

  const field = (
    key: string,
    label: string,
    value: string,
    setter: (next: string) => void,
    props: Record<string, unknown> = {},
  ) => (
    <div>
      <input
        value={value}
        onChange={(event) => setter(event.target.value)}
        placeholder={label}
        aria-label={label}
        className={cx(
          "w-full rounded-xl border bg-surface-2 px-3.5 py-3 text-sm outline-none transition focus:border-accent",
          errors[key] ? "border-red-500/60" : "border-line",
        )}
        {...props}
      />
      {errors[key] ? (
        <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-red-400">
          <CircleX className="h-3 w-3" /> {errors[key]}
        </p>
      ) : null}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
      <button
        type="button"
        aria-label={en ? "Close cart" : "إغلاق السلة"}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <aside
        className={cx(
          "drawer relative flex h-full w-full max-w-md flex-col border-s border-line bg-bg",
          en && "ltr",
        )}
        dir={lang === "en" ? "ltr" : "rtl"}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-black">
            <ShoppingBag className="h-5 w-5 text-accent" />
            {en ? "Your order" : "سلة الطلبات"}
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted">{totals.itemCount}</span>
          </h2>
          <button onClick={onClose} className="text-xs font-bold text-muted transition hover:text-ink">
            {en ? "Close ✕" : "إغلاق ✕"}
          </button>
        </header>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-muted">
            <ShoppingBag className="h-14 w-14 opacity-25" />
            <p className="text-sm font-bold">{en ? "Your cart is empty" : "السلة فاضية خالص"}</p>
            <p className="text-xs">{en ? "Pick something tasty first" : "اختار حاجة حلوة الأول وارجعلنا"}</p>
          </div>
        ) : (
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {/* نوع الطلب */}
            <div className="grid grid-cols-3 gap-2">
              {(["delivery", "takeaway", "dinein"] as OrderType[])
                .filter((type) => commerce.orderTypes.includes(type))
                .map((type) => {
                  const Icon = TYPE_ICON[type];
                  const active = orderType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setOrderType(type)}
                      className={cx(
                        "flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-[11px] font-bold transition",
                        active
                          ? "border-accent bg-accent/12 text-accent"
                          : "border-line bg-surface text-muted hover:text-ink",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {ORDER_TYPE_LABEL[type][en ? "en" : "ar"]}
                    </button>
                  );
                })}
            </div>

            {/* الأصناف */}
            <ul className="space-y-2.5">
              {lines.map(({ line, item }) => (
                <li
                  key={line.itemId}
                  className="flex items-center gap-3 rounded-xl border border-line bg-surface p-2.5"
                >
                  <DishImage src={item.image} alt="" className="h-11 w-11 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold">{pick(lang, item.name, item.nameEn)}</p>
                    <p className="text-[11px] text-muted">
                      {formatPrice(item.price, lang, commerce)} × {line.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 rounded-lg border border-line bg-surface-2 p-0.5">
                    <button
                      onClick={() => setQuantity(item.id, line.quantity - 1)}
                      className="grid h-6 w-6 place-items-center rounded text-muted transition hover:text-red-400"
                      aria-label="minus"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="min-w-4 text-center text-xs font-black">{line.quantity}</span>
                    <button
                      onClick={() => setQuantity(item.id, line.quantity + 1)}
                      className="grid h-6 w-6 place-items-center rounded text-muted transition hover:text-accent"
                      aria-label="plus"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <button
                    onClick={() => remove(item.id)}
                    aria-label={en ? "Remove" : "حذف"}
                    className="text-muted transition hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>

            {/* بيانات العميل */}
            <div className="space-y-2.5">
              {commerce.requireName ? field("name", en ? "Full name" : "الاسم بالكامل", name, setName) : null}
              {needsPhone
                ? field("phone", en ? "Mobile number" : "رقم الموبايل", phone, setPhone, {
                    type: "tel",
                    inputMode: "tel",
                  })
                : null}
              {needsAddress
                ? field("address", en ? "Detailed address" : "العنوان بالتفصيل", address, setAddress)
                : null}
              {orderType === "dinein"
                ? field("table", en ? "Table number" : "رقم الترابيزة", table, setTable)
                : null}
              {commerce.enableNotes ? (
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={2}
                  placeholder={en ? "Notes for the kitchen (optional)" : "ملاحظات للمطبخ (اختياري)"}
                  className="w-full resize-none rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-sm outline-none focus:border-accent"
                />
              ) : null}
            </div>

            {orderType === "takeaway" && contact.address ? (
              <p className="flex items-start gap-2 rounded-xl border border-line bg-surface-2/60 p-3 text-[11px] leading-relaxed text-muted">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                {en ? "Pickup address: " : "استلام من: "}
                {contact.address}
              </p>
            ) : null}

            {/* الإجماليات */}
            <div className="space-y-1.5 rounded-xl border border-line bg-surface p-3.5 text-xs">
              <Row
                label={en ? "Subtotal" : "الإجمالي قبل الإضافات"}
                value={formatPrice(totals.subtotal, lang, commerce)}
              />
              {orderType === "delivery" ? (
                <Row
                  label={totals.delivery ? (en ? "Delivery" : "مصروف التوصيل") : en ? "Delivery" : "التوصيل"}
                  value={
                    totals.delivery
                      ? formatPrice(totals.delivery, lang, commerce)
                      : en
                        ? "FREE"
                        : "مجاني 🎉"
                  }
                  accent={!totals.delivery}
                />
              ) : null}
              {totals.service ? (
                <Row
                  label={`${en ? "Service" : "خدمة"} ${commerce.serviceChargePercent}%`}
                  value={formatPrice(totals.service, lang, commerce)}
                />
              ) : null}
              <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-sm font-black">
                <span>{en ? "Total" : "الإجمالي"}</span>
                <span className="text-accent">{formatPrice(totals.total, lang, commerce)}</span>
              </div>
              {totals.freeDeliveryGap > 0 ? (
                <div className="pt-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{
                        width: `${Math.min(100, Math.round((totals.subtotal / commerce.freeDeliveryOver) * 100))}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted">
                    {en
                      ? `Add ${formatPrice(totals.freeDeliveryGap, lang, commerce)} more for free delivery`
                      : `فاضل ${formatPrice(totals.freeDeliveryGap, lang, commerce)} عشان التوصيل المجاني`}
                  </p>
                </div>
              ) : null}
              {belowMinimum ? (
                <p className="flex items-center gap-1 pt-1 text-[11px] font-bold text-red-400">
                  <CircleX className="h-3 w-3" />
                  {en
                    ? `Minimum order ${formatPrice(commerce.minimumOrder, lang, commerce)}`
                    : `أقل طلب ${formatPrice(commerce.minimumOrder, lang, commerce)}`}
                </p>
              ) : null}
              {errors.total ? (
                <p className="text-[11px] font-bold text-red-400">{errors.total}</p>
              ) : null}
            </div>
          </div>
        )}

        <footer className="space-y-2.5 border-t border-line px-5 py-4">
          {!contact.isOpen ? (
            <p className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] font-bold text-amber-400">
              <Clock className="h-3.5 w-3.5" /> {contact.closedMessage}
            </p>
          ) : null}
          {contact.phone ? (
            <a
              href={`tel:${contact.phone.replace(/\s/g, "")}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-line py-2.5 text-xs font-bold text-muted transition hover:text-ink"
            >
              <Phone className="h-3.5 w-3.5" /> {en ? "Call the branch" : "الاتصال بالفرع"}
            </a>
          ) : null}
          <button
            type="button"
            onClick={send}
            disabled={sending || lines.length === 0 || !contact.isOpen || !commerce.enableCart}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
            {sending ? (en ? "Saving order…" : "جاري تسجيل الطلب…") : en ? "Send order on WhatsApp" : "إرسال الطلب على واتساب"}
          </button>
        </footer>
      </aside>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className={cx("font-bold", accent ? "text-emerald-400" : "text-ink")}>{value}</span>
    </div>
  );
}
