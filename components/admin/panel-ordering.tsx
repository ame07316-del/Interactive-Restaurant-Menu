"use client";

import { useState } from "react";
import { Bell, CircleDollarSign, MessageCircle, Phone, Save } from "lucide-react";
import { useMenu } from "@/lib/use-menu";
import { buildOrderMessage, computeTotals, TEMPLATE_TOKENS } from "@/lib/format";
import type { MenuItem, OrderType } from "@/lib/types";
import type { DetailedLine } from "@/lib/use-cart";
import {
  Button,
  CheckboxPill,
  Field,
  NumberInput,
  Panel,
  TextArea,
  TextInput,
  Toast,
  Toggle,
  useToast,
} from "@/components/ui";

const TYPE_LABELS: Record<OrderType, string> = {
  delivery: "🛵 توصيل",
  takeaway: "🥡 استلام من الفرع",
  dinein: "🍽️ أكل في المطعم",
};

export function OrderingPanel() {
  const { data, patchContact, patchCommerce } = useMenu();
  const { contact, commerce, brand } = data;
  const [sample, setSample] = useState(true);
  const { toast, show } = useToast();

  const demoItem = (id: string, name: string, price: number): MenuItem => ({
    id,
    categoryId: data.categories[0]?.id ?? "",
    name,
    price,
    available: true,
    bestseller: false,
    isNew: false,
    spicy: 0,
    order: 1,
  });

  const demoLines: DetailedLine[] = [
    { line: { itemId: "demo1", quantity: 2 }, item: demoItem("demo1", data.items[0]?.name ?? "برجر دبل تشيز", data.items[0]?.price ?? 180) },
    { line: { itemId: "demo2", quantity: 1 }, item: demoItem("demo2", "بطاطس كريسبي بالجبنة", 65) },
  ];
  const demoTotals = computeTotals(demoLines, commerce, "delivery");

  const preview = buildOrderMessage(
    {
      name: "أحمد محمود",
      phone: "0101 234 5678",
      address: "التجمع الخامس، شارع التسعين، كمبوند النخيل، عمارة ٤ شقة ١٢",
      table: "",
      notes: "من غير مخلل + استعجال",
      orderType: "delivery",
      lines: demoLines,
      totals: demoTotals,
    },
    { lang: brand.language, brand, contact, commerce },
  );

  return (
    <div className="space-y-4">
      <Panel title="بيانات التواصل والاستلام" description="الرقم ده اللي الطلبات هتروحه على واتساب" icon={<MessageCircle className="h-4 w-4" />}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="رقم واتساب المطعم" hint="بصيغة دولية من غير + أو صفر في الأول (مثال: 2010xxxxxxxx)">
            <TextInput
              value={contact.whatsapp}
              onChange={(event) => patchContact({ whatsapp: event.target.value })}
              placeholder="201000000000"
              inputMode="tel"
            />
          </Field>
          <Field label="رقم التليفون (للاتصال)">
            <TextInput value={contact.phone} onChange={(event) => patchContact({ phone: event.target.value })} placeholder="0100 000 0000" />
          </Field>
          <Field label="العنوان">
            <TextInput value={contact.address} onChange={(event) => patchContact({ address: event.target.value })} />
          </Field>
          <Field label="رابط الخريطة">
            <TextInput value={contact.mapUrl} onChange={(event) => patchContact({ mapUrl: event.target.value })} placeholder="https://maps.google.com/?q=…" />
          </Field>
          <Field label="مواعيد العمل">
            <TextInput value={contact.openingHours} onChange={(event) => patchContact({ openingHours: event.target.value })} />
          </Field>
          <Field label="رسالة القفل" hint="بتظهر فوق القائمة وفي السلة لما المطعم مقفول">
            <TextInput value={contact.closedMessage} onChange={(event) => patchContact({ closedMessage: event.target.value })} />
          </Field>
        </div>

        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          <Toggle
            label="المطعم مفتوح الآن"
            description="لما تقفله الموقع يفضل يعرض الأكل بس يقفل زر الإرسال"
            checked={contact.isOpen}
            onChange={(checked) => patchContact({ isOpen: checked })}
          />

        </div>
      </Panel>

      <Panel title="الأسعار والمصاريف" icon={<CircleDollarSign className="h-4 w-4" />}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="علامة العملة (عربي)">
            <TextInput value={commerce.currency} onChange={(event) => patchCommerce({ currency: event.target.value })} placeholder="ج.م" />
          </Field>
          <Field label="علامة العملة (إنجليزي)">
            <TextInput value={commerce.currencyEn} onChange={(event) => patchCommerce({ currencyEn: event.target.value })} placeholder="EGP" />
          </Field>
          <Field label="أقل مبلغ للطلب" hint="0 = من غير حد أدنى">
            <NumberInput value={commerce.minimumOrder} onValueChange={(value) => patchCommerce({ minimumOrder: value })} suffix={commerce.currency} />
          </Field>
          <Field label="مصروف التوصيل">
            <NumberInput value={commerce.deliveryFee} onValueChange={(value) => patchCommerce({ deliveryFee: value })} suffix={commerce.currency} />
          </Field>
          <Field label="توصيل مجاني بعد" hint="0 = الخاصية معطلة — لو كتبنا 300 التوصيل بيصير مجاني للطلبات فوق 300">
            <NumberInput value={commerce.freeDeliveryOver} onValueChange={(value) => patchCommerce({ freeDeliveryOver: value })} suffix={commerce.currency} />
          </Field>
          <Field label="نسبة الخدمة %" hint="بتتحسب على الإجمالي + التوصيل">
            <NumberInput
              value={commerce.serviceChargePercent}
              onValueChange={(value) => patchCommerce({ serviceChargePercent: Math.min(50, value) })}
              suffix="%"
            />
          </Field>
        </div>

        <div className="mt-3 space-y-3">
          <Field label="أنواع الطلب المتاحة">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TYPE_LABELS) as OrderType[]).map((type) => {
                const active = commerce.orderTypes.includes(type);
                return (
                  <CheckboxPill
                    key={type}
                    active={active}
                    onClick={() => {
                      const next = active ? commerce.orderTypes.filter((t) => t !== type) : [...commerce.orderTypes, type];
                      if (!next.length) {
                        show("لازم نوع طلب واحد على الأقل", "error");
                        return;
                      }
                      patchCommerce({ orderTypes: next });
                    }}
                  >
                    {TYPE_LABELS[type]}
                  </CheckboxPill>
                );
              })}
            </div>
          </Field>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            <Toggle label="الاسم مطلوب" checked={commerce.requireName} onChange={(v) => patchCommerce({ requireName: v })} />
            <Toggle label="رقم الموبايل مطلوب" checked={commerce.requirePhone} onChange={(v) => patchCommerce({ requirePhone: v })} />
            <Toggle label="العنوان مطلوب (للتوصيل)" checked={commerce.requireAddress} onChange={(v) => patchCommerce({ requireAddress: v })} />
            <Toggle label="خانة الملاحظات" checked={commerce.enableNotes} onChange={(v) => patchCommerce({ enableNotes: v })} />
            <Toggle label="إظهار الأسعار" checked={commerce.showPrices} onChange={(v) => patchCommerce({ showPrices: v })} />
            <Toggle label="تفعيل السلة" checked={commerce.enableCart} onChange={(v) => patchCommerce({ enableCart: v })} />
          </div>
        </div>
      </Panel>

      <Panel title="قالب رسالة واتساب" description="اضغط على أي متغيّر يتحط في مكان الكيرسر — وكل حاجة بتتبدل أوتوماتيك" icon={<Bell className="h-4 w-4" />}>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {TEMPLATE_TOKENS.map((token) => (
            <button
              key={token}
              type="button"
              onClick={() => patchCommerce({ orderTemplate: `${commerce.orderTemplate}${token}` })}
              className="rounded-lg border border-line bg-surface-2 px-2 py-1 font-mono text-[11px] text-accent transition hover:border-accent/50"
            >
              {token}
            </button>
          ))}
        </div>
        <TextArea
          value={commerce.orderTemplate}
          onChange={(event) => patchCommerce({ orderTemplate: event.target.value })}
          className="min-h-[220px] font-mono text-[12px] leading-relaxed"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setSample((s) => !s)}>
              {sample ? "إخفاء المعاينة" : "معاينة الرسالة"}
            </Button>
            <Button
              size="sm"
              variant="soft"
              onClick={() => {
                navigator.clipboard?.writeText(preview).then(
                  () => show("الرسالة التجريبية اتنسخت"),
                  () => show("المتصفح منع النسخ", "error"),
                );
              }}
            >
              <Save className="h-3.5 w-3.5" /> نسخ المعاينة
            </Button>
          </div>
          <a
            href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("✅ تم ربط رقم الواتساب بنجاح")}`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 hover:underline"
          >
            <Phone className="h-3 w-3" /> تجربة إرسال على {contact.whatsapp || "—"}
          </a>
        </div>
        {sample ? (
          <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-surface-2 p-3.5 text-[12px] leading-relaxed text-ink">
            {preview}
          </pre>
        ) : null}
      </Panel>

      {toast ? <Toast message={toast.text} tone={toast.tone} /> : null}
    </div>
  );
}
