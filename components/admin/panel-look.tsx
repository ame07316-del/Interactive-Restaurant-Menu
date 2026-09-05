"use client";

import { Moon, Palette, Sun } from "lucide-react";
import { useMenu } from "@/lib/use-menu";
import { FONT_OPTIONS } from "@/lib/fonts";
import { ColorField, Field, Panel, RangeField, Select, Segmented, TextInput, Toggle } from "@/components/ui";

export function LookPanel() {
  const { data, patchBrand, patchCommerce } = useMenu();
  const { brand, commerce } = data;

  return (
    <div className="space-y-4">
      <Panel title="النمط والألوان" description="الفورم ده بيعدّي على الموقع كله: الأزرار، الأسعار، الشريط العلوي" icon={<Palette className="h-4 w-4" />}>
        <div className="space-y-4">
          <Field label="الوضع الليلي / النهاري">
            <Segmented
              className="w-full [&>button]:flex-1"
              value={brand.theme}
              onChange={(value) => patchBrand({ theme: value })}
              options={[
                { value: "dark", label: <span className="inline-flex items-center gap-1.5"><Moon className="h-3.5 w-3.5" /> دارك</span> },
                { value: "light", label: <span className="inline-flex items-center gap-1.5"><Sun className="h-3.5 w-3.5" /> لايت</span> },
              ]}
            />
          </Field>
          <ColorField
            label="لون الأكسنت"
            value={brand.accent}
            onChange={(value) => patchBrand({ accent: value })}
            swatches={["#f59e0b", "#ef4444", "#f43f5e", "#a855f7", "#6366f1", "#3b82f6", "#14b8a6", "#22c55e", "#eab308", "#78716c"]}
          />
          <Field label="خط الموقع" hint="بيتحمّل من Google Fonts ولو النت مقطوع بيرجع لخط الجهاز">
            <Select value={brand.font} onChange={(event) => patchBrand({ font: event.target.value })}>
              {FONT_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <RangeField
            label="انحناء الحواف"
            value={brand.radius}
            min={0}
            max={28}
            suffix="px"
            onChange={(value) => patchBrand({ radius: value })}
          />
        </div>
      </Panel>

      <Panel title="عناصر الواجهة" description="تتحكم في اللي ظاهر واللي مختفي من غير ما تمسح أي حاجة">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Toggle
            label="إظهار الأسعار"
            description="اقفله لو عايز السعر يبقى عند الطلب"
            checked={commerce.showPrices}
            onChange={(checked) => patchCommerce({ showPrices: checked })}
          />
          <Toggle
            label="خانة البحث"
            checked={commerce.enableSearch}
            onChange={(checked) => patchCommerce({ enableSearch: checked })}
          />
          <Toggle
            label="قسم الأكثر طلباً"
            description="كاروسيفي أفقي للأصناف المتعلمة «الأكثر طلباً»"
            checked={commerce.enableFeatured}
            onChange={(checked) => patchCommerce({ enableFeatured: checked })}
          />
          <Toggle
            label="احتفال بعد الطلب 🎉"
            description="كونفيتي لما العميل يبعت الطلب"
            checked={commerce.enableConfetti}
            onChange={(checked) => patchCommerce({ enableConfetti: checked })}
          />
          <Toggle
            label="تفعيل السلة والطلب"
            description="اقفله لو عايز الموقع معرض بدون طلبات"
            checked={commerce.enableCart}
            onChange={(checked) => patchCommerce({ enableCart: checked })}
          />
          <Field label="عنوان قسم الأكثر طلباً">
            <TextInput
              value={commerce.featuredLabel}
              onChange={(event) => patchCommerce({ featuredLabel: event.target.value })}
              placeholder="الأكثر طلباً ⭐"
            />
          </Field>
        </div>
      </Panel>
    </div>
  );
}
