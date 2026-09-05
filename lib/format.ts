import type {
  CartLine,
  CommerceSettings,
  ContactSettings,
  MenuItem,
  OrderType,
  SiteLanguage,
} from "./types";

export const ORDER_TYPE_LABEL: Record<OrderType, { ar: string; en: string }> = {
  delivery: { ar: "توصيل", en: "Delivery" },
  takeaway: { ar: "استلام من الفرع", en: "Takeaway" },
  dinein: { ar: "أكل داخل المطعم", en: "Dine-in" },
};

/** يرجّع النص المناسب للغة الحالية مع رجوع للغة التانية لو فاضية */
export function pick(
  lang: SiteLanguage,
  ar: string | undefined,
  en: string | undefined,
): string {
  if (lang === "en") return (en?.trim() || ar || "").trim();
  return (ar?.trim() || en || "").trim();
}

export function formatPrice(value: number, lang: SiteLanguage, commerce: CommerceSettings) {
  const amount = Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
  const num = amount.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  const unit = lang === "en" ? commerce.currencyEn : commerce.currency;
  return lang === "en" ? `${unit} ${num}` : `${num} ${unit}`;
}

export interface CartTotals {
  subtotal: number;
  delivery: number;
  service: number;
  total: number;
  itemCount: number;
  freeDeliveryGap: number;
}

export function computeTotals(
  lines: { line: CartLine; item: MenuItem }[],
  commerce: CommerceSettings,
  orderType: OrderType,
): CartTotals {
  const subtotal = lines.reduce((sum, { line, item }) => sum + item.price * line.quantity, 0);
  const itemCount = lines.reduce((sum, { line }) => sum + line.quantity, 0);
  const isDelivery = orderType === "delivery";
  const qualifiesFree =
    isDelivery && commerce.freeDeliveryOver > 0 && subtotal >= commerce.freeDeliveryOver;
  const delivery = isDelivery && !qualifiesFree ? Math.max(0, commerce.deliveryFee) : 0;
  const service =
    commerce.serviceChargePercent > 0
      ? Math.round(((subtotal + delivery) * commerce.serviceChargePercent) / 100)
      : 0;
  return {
    subtotal,
    delivery,
    service,
    total: subtotal + delivery + service,
    itemCount,
    freeDeliveryGap:
      isDelivery && commerce.freeDeliveryOver > 0
        ? Math.max(0, commerce.freeDeliveryOver - subtotal)
        : 0,
  };
}

/** يحوّل رقم الموبايل المصري (أو أي دولة) لصيغة واتساب دولية */
export function toWhatsappNumber(input: string): string {
  const digits = (input || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return `2${digits}`;
  if (digits.length === 10) return `2${digits}`;
  return digits;
}

export interface OrderPayload {
  name: string;
  phone: string;
  address: string;
  table: string;
  notes: string;
  orderType: OrderType;
  lines: { line: CartLine; item: MenuItem }[];
  totals: CartTotals;
}

/**
 * يبني رسالة واتساب من القالب اللي الأدمين كاتبه — يدعم البلايسهولدرز دي:
 * {restaurantName} {name} {phone} {orderType} {addressLine} {items}
 * {notes} {total} {subtotal} {delivery} {service} {currency} {count} {date}
 */
export function buildOrderMessage(
  payload: OrderPayload,
  opts: {
    lang: SiteLanguage;
    brand: { restaurantName: string; restaurantNameEn: string };
    contact: ContactSettings;
    commerce: CommerceSettings;
  },
): string {
  const { lang, commerce } = opts;
  const en = lang === "en";
  const restaurantName = en ? opts.brand.restaurantNameEn || opts.brand.restaurantName : opts.brand.restaurantName;
  const typeLabel = ORDER_TYPE_LABEL[payload.orderType][en ? "en" : "ar"];
  const unit = en ? commerce.currencyEn : commerce.currency;

  const itemsText = payload.lines
    .map(({ line, item }) => {
      const name = pick(lang, item.name, item.nameEn);
      const price = formatPrice(item.price, lang, commerce);
      const lineTotal = formatPrice(item.price * line.quantity, lang, commerce);
      return en
        ? `- ${line.quantity}x ${name} — ${lineTotal}`
        : `- ${line.quantity}x ${name} (${price} × ${line.quantity} = ${lineTotal})`;
    })
    .join("\n");

  const addressLine =
    payload.orderType === "delivery" && payload.address
      ? en
        ? `📍 *Address:* ${payload.address}`
        : `📍 *العنوان:* ${payload.address}`
      : payload.orderType === "dinein" && payload.table
        ? en
          ? `🪑 *Table:* ${payload.table}`
          : `🪑 *الترابيزة:* ${payload.table}`
        : "";

  const notesValue = payload.notes.trim();
  const fallbackNotes = en ? "None" : "لا يوجد";

  const map: Record<string, string> = {
    restaurantName,
    name: payload.name || (en ? "Guest" : "عميل"),
    phone: payload.phone || (en ? "-" : "—"),
    orderType: typeLabel,
    addressLine,
    items: itemsText,
    notes: notesValue || fallbackNotes,
    total: `${formatPrice(payload.totals.total, lang, commerce)}`,
    subtotal: `${formatPrice(payload.totals.subtotal, lang, commerce)}`,
    delivery: payload.totals.delivery ? `${formatPrice(payload.totals.delivery, lang, commerce)}` : "0",
    service: payload.totals.service ? `${formatPrice(payload.totals.service, lang, commerce)}` : "0",
    currency: unit,
    count: String(payload.totals.itemCount),
    date: new Date().toLocaleString(en ? "en-GB" : "ar-EG", {
      dateStyle: "short",
      timeStyle: "short",
    }),
  };

  const template = (commerce.orderTemplate || "").trim() || defaultMessage(lang);
  const rendered = template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in map ? map[key] : match,
  );
  // تنظيف السطور الفاضلة اللي بتنتج عن {addressLine} فاضي
  return rendered
    .split("\n")
    .reduce<string[]>((acc, line) => {
      if (!line.trim() && acc.length && !acc[acc.length - 1].trim()) return acc;
      acc.push(line);
      return acc;
    }, [])
    .join("\n")
    .trim();
}

function defaultMessage(lang: SiteLanguage): string {
  return lang === "en"
    ? `*New order — {restaurantName}*\n\n👤 *Customer:* {name}\n📞 *Phone:* {phone}\n🧾 *Type:* {orderType}\n{addressLine}\n\n*Order:*\n{items}\n\n📝 *Notes:* {notes}\n💰 *Total:* {total}`
    : `*طلب جديد — {restaurantName}*\n\n👤 *العميل:* {name}\n📞 *الموبايل:* {phone}\n🧾 *نوع الطلب:* {orderType}\n{addressLine}\n\n*تفاصيل الطلب:*\n{items}\n\n📝 *ملاحظات:* {notes}\n💰 *الإجمالي:* {total}`;
}

export const TEMPLATE_TOKENS = [
  "{restaurantName}",
  "{name}",
  "{phone}",
  "{orderType}",
  "{addressLine}",
  "{items}",
  "{notes}",
  "{count}",
  "{subtotal}",
  "{delivery}",
  "{service}",
  "{total}",
  "{currency}",
  "{date}",
] as const;
