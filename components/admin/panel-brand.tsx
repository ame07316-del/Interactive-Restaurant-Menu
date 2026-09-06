"use client";

import { Globe, Sparkles, Store } from "lucide-react";
import { useMenu } from "@/lib/use-menu";
import { ImageField } from "@/components/image-field";
import { Button, ColorField, Field, Panel, Segmented, TextArea, TextInput, Toggle } from "@/components/ui";

export function BrandPanel() {
  const { data, patchBrand, patchContact } = useMenu();
  const { brand, contact } = data;

  return (
    <div className="space-y-4">
      <Panel
        title="هوية المكان"
        description="اللي العميل بيشوفه في الهيدر والفوتر وبعنوان الصفحة"
        icon={<Store className="h-4 w-4" />}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="اسم المطعم (عربي)">
            <TextInput
              value={brand.restaurantName}
              onChange={(event) => patchBrand({ restaurantName: event.target.value })}
              placeholder="مطعم البرجر الملكي"
            />
          </Field>
          <Field label="اسم المطعم (إنجليزي)">
            <TextInput
              value={brand.restaurantNameEn}
              onChange={(event) => patchBrand({ restaurantNameEn: event.target.value })}
              placeholder="Royal Burger"
            />
          </Field>
          <Field label="الشعار النصي (عربي)">
            <TextInput
              value={brand.tagline}
              onChange={(event) => patchBrand({ tagline: event.target.value })}
              placeholder="أسرع ديليفري وأعلى جودة"
            />
          </Field>
          <Field label="الشعار النصي (إنجليزي)">
            <TextInput
              value={brand.taglineEn}
              onChange={(event) => patchBrand({ taglineEn: event.target.value })}
              placeholder="Fastest delivery, best taste"
            />
          </Field>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <ImageField
            label="لوجو المطعم"
            value={brand.logo}
            onChange={(value) => patchBrand({ logo: value })}
            hint="لو فاضي هيظهر أيقونة Utensils بلون الأكسنت"
            aspect="aspect-square"
          />
          <div className="space-y-3">
            <Field label="لغة الموقع" hint="لو إنجليزي هيتعرض الاسم الوصف الإنجليزي (ولو فاضي بيرجع للعربي)">
              <Segmented
                className="w-full [&>button]:flex-1"
                value={brand.language}
                onChange={(value) => patchBrand({ language: value })}
                options={[
                  { value: "ar", label: "🇪🇬 عربي RTL" },
                  { value: "en", label: "🇬🇧 English LTR" },
                ]}
              />
            </Field>
            <ColorField
              label="لون البراند"
              value={brand.accent}
              onChange={(value) => patchBrand({ accent: value })}
              swatches={["#f59e0b", "#ef4444", "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#eab308", "#14b8a6"]}
            />
          </div>
        </div>
      </Panel>

      <Panel
        title="شريط الإعلان العلوي"
        description="إعلان متحرك فوق الهيدر — عروض، خصومات، أو تنبيه"
        icon={<Sparkles className="h-4 w-4" />}
      >
        <Toggle
          label="إظهار شريط الإعلان"
          description="اتركه مقفل لو عايز صفحة نضيفة بدون بانر"
          checked={brand.announcementEnabled}
          onChange={(checked) => patchBrand({ announcementEnabled: checked })}
        />
        <div className="mt-3">
          <Field label="نص الإعلان" hint="النص بيتكرر في شريط متحرك — اكتب جملة قصيرة">
            <TextInput
              value={brand.announcementText}
              onChange={(event) => patchBrand({ announcementText: event.target.value })}
              placeholder="🚚 توصيل مجاني للطلبات فوق ٣٠٠ ج.م"
            />
          </Field>
        </div>
      </Panel>

      <Panel
        title="قسم الترحيب (Hero)"
        description="البانر الكبير فوق القائمة — تقدر تقفله خالص"
        icon={<Globe className="h-4 w-4" />}
      >
        <Toggle
          label="إظهار قسم الترحيب"
          checked={brand.showHero}
          onChange={(checked) => patchBrand({ showHero: checked })}
        />
        <div className="mt-3 space-y-3">
          <ImageField label="صورة الخلفية" value={brand.heroImage} onChange={(value) => patchBrand({ heroImage: value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="العنوان الرئيسي">
              <TextInput value={brand.heroTitle} onChange={(event) => patchBrand({ heroTitle: event.target.value })} />
            </Field>
            <Field label="الوصف تحت العنوان">
              <TextInput value={brand.heroSubtitle} onChange={(event) => patchBrand({ heroSubtitle: event.target.value })} />
            </Field>
          </div>
        </div>
      </Panel>

      <Panel title="الفوتر والسوشيال" description="آخر الصفحة — ملاحظة أخيرة وروابط التواصل">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="ملاحظة الفوتر">
            <TextArea
              value={contact.footerNote}
              onChange={(event) => patchContact({ footerNote: event.target.value })}
            />
          </Field>
          <Field label="رابط إنستجرام">
            <TextInput
              value={contact.instagram}
              onChange={(event) => patchContact({ instagram: event.target.value })}
              placeholder="https://instagram.com/shop"
            />
          </Field>
          <Field label="رابط فيسبوك">
            <TextInput
              value={contact.facebook}
              onChange={(event) => patchContact({ facebook: event.target.value })}
              placeholder="https://facebook.com/shop"
            />
          </Field>
        </div>
        <p className="mt-3 flex items-center gap-2 text-[11px] text-muted">
          <Button size="sm" variant="soft" onClick={() => window.open("/", "_blank")}>
            معاينة الموقع في تبويب جديد
          </Button>
          التعديلات بتتحفظ في الباك إند وتظهر فوراً لكل العملاء.
        </p>
      </Panel>
    </div>
  );
}
