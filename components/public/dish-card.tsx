"use client";

import { useState } from "react";
import { Flame, Minus, Plus, Star } from "lucide-react";
import { pick, formatPrice } from "@/lib/format";
import type { CommerceSettings, MenuItem, SiteLanguage } from "@/lib/types";
import { cx } from "@/lib/cx";

export function DishImage({
  src,
  alt,
  className,
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <div
        className={cx(
          "grid shrink-0 place-items-center bg-[linear-gradient(135deg,color-mix(in_oklab,var(--accent)_28%,transparent),var(--surface-2))] text-2xl",
          className,
        )}
        aria-hidden
      >
        🍽️
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setBroken(true)}
      className={cx("shrink-0 object-cover", className)}
    />
  );
}

export function DishCard({
  item,
  lang,
  commerce,
  quantity,
  onAdd,
  onRemoveOne,
  disabled,
}: {
  item: MenuItem;
  lang: SiteLanguage;
  commerce: CommerceSettings;
  quantity: number;
  onAdd: () => void;
  onRemoveOne: () => void;
  disabled?: boolean;
}) {
  const en = lang === "en";
  const price = formatPrice(item.price, lang, commerce);
  const hasDiscount = !!item.oldPrice && item.oldPrice > item.price;
  const off = hasDiscount ? Math.round(((item.oldPrice! - item.price) / item.oldPrice!) * 100) : 0;
  const stockReached = !!item.trackStock && quantity >= (item.stock ?? 0);

  return (
    <article
      className={cx(
        "group relative flex gap-3.5 rounded-card border border-line bg-surface p-3 transition hover:border-accent/45",
        !item.available && "opacity-70",
      )}
    >
      <div className="relative">
        <DishImage src={item.image} alt={pick(lang, item.name, item.nameEn)} className="h-24 w-24 rounded-xl sm:h-28 sm:w-28" />
        {!item.available ? (
          <span className="absolute inset-0 grid place-items-center rounded-xl bg-black/65 text-[11px] font-black tracking-wide text-white">
            {en ? "SOLD OUT" : "خلصت"}
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate text-[15px] font-extrabold">{pick(lang, item.name, item.nameEn)}</h3>
            {item.bestseller ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                <Star className="h-2.5 w-2.5 fill-current" /> {en ? "Best" : "الأكثر طلباً"}
              </span>
            ) : null}
            {item.isNew ? (
              <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                {en ? "NEW" : "جديد"}
              </span>
            ) : null}
            {item.spicy > 0 ? (
              <span className="inline-flex items-center gap-0.5 text-red-500" title={en ? "Spicy" : "حار"}>
                {Array.from({ length: item.spicy }).map((_, index) => (
                  <Flame key={index} className="h-3 w-3 fill-red-500/25" />
                ))}
              </span>
            ) : null}
          </div>
          {pick(lang, item.description, item.descriptionEn) ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">
              {pick(lang, item.description, item.descriptionEn)}
            </p>
          ) : null}
        </div>

        <div className="flex items-end justify-between gap-2">
          <div className="flex items-baseline gap-2">
            {commerce.showPrices ? (
              <>
                <span className="text-lg font-black text-accent">{price}</span>
                {hasDiscount ? (
                  <span className="text-[11px] text-muted line-through">
                    {formatPrice(item.oldPrice!, lang, commerce)}
                  </span>
                ) : null}
                {hasDiscount ? (
                  <span className="rounded-md bg-red-500/15 px-1.5 py-0.5 text-[10px] font-black text-red-400">
                    -{off}%
                  </span>
                ) : null}
              </>
            ) : (
              <span className="text-xs font-bold text-muted">{en ? "Ask for price" : "السعر عند الطلب"}</span>
            )}
          </div>

          {commerce.enableCart && item.available && !disabled ? (
            quantity > 0 ? (
              <div className="flex items-center gap-1 rounded-xl border border-accent/40 bg-accent/10 p-1">
                <button
                  type="button"
                  onClick={onRemoveOne}
                  aria-label={en ? "Remove one" : "تقليل"}
                  className="grid h-7 w-7 place-items-center rounded-lg text-accent transition hover:bg-accent hover:text-accent-contrast"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-5 text-center text-sm font-black">{quantity}</span>
                <button
                  type="button"
                  onClick={onAdd}
                  disabled={stockReached}
                  aria-label={en ? "Add one" : "زيادة"}
                  className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-accent-contrast transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onAdd}
                disabled={stockReached}
                className="inline-flex items-center gap-1 rounded-xl border border-accent/35 bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent transition hover:bg-accent hover:text-accent-contrast disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" /> {stockReached ? (en ? "Sold out" : "خلصت") : en ? "Add" : "إضافة"}
              </button>
            )
          ) : null}
        </div>
      </div>
    </article>
  );
}
