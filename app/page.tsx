"use client";

import { useMemo, useState } from "react";
import {
  Clock,
  Utensils,
  Search,
  Settings2,
  ShoppingBag,
  Sparkles,
  Store,
  Phone,
  MapPin,
  ChevronLeft,
} from "lucide-react";
import { useMenu } from "@/lib/use-menu";
import { useCart } from "@/lib/use-cart";
import { computeTotals, formatPrice, pick } from "@/lib/format";
import { cx } from "@/lib/cx";
import { DishCard, DishImage } from "@/components/public/dish-card";
import { CartSheet } from "@/components/public/cart-sheet";

const ALL = "all";

export default function Home() {
  const { data } = useMenu();
  const { brand, commerce, contact, categories, items } = data;
  const lang = brand.language;
  const en = lang === "en";

  const [activeCategory, setActiveCategory] = useState<string>(ALL);
  const [query, setQuery] = useState("");
  const [cartOpen, setCartOpen] = useState(false);

  const cart = useCart(items);
  const totals = useMemo(() => computeTotals(cart.lines, commerce, "delivery"), [cart.lines, commerce]);

  const visibleCategories = useMemo(() => categories.filter((category) => category.visible), [categories]);
  const nameOf = (value: { name: string; nameEn?: string }) => pick(lang, value.name, value.nameEn);

  const searched = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) =>
      [item.name, item.nameEn, item.description, item.descriptionEn]
        .filter(Boolean)
        .some((text) => String(text).toLowerCase().includes(term)),
    );
  }, [items, query]);
  const featured = useMemo(
    () => (commerce.enableFeatured && activeCategory === ALL && !query ? items.filter((item) => item.bestseller && item.available) : []),
    [commerce.enableFeatured, activeCategory, query, items],
  );

  const sections = useMemo(() => {
    const pool = searched.filter((item) => item.available || query);
    if (activeCategory !== ALL) {
      const category = categories.find((c) => c.id === activeCategory);
      return category ? [{ category, items: pool.filter((item) => item.categoryId === category.id) }] : [];
    }
    return visibleCategories
      .map((category) => ({ category, items: pool.filter((item) => item.categoryId === category.id) }))
      .filter((section) => section.items.length > 0);
  }, [searched, activeCategory, categories, visibleCategories, query]);

  const isEmpty = sections.every((section) => section.items.length === 0);

  return (
    <div className="min-h-screen bg-bg pb-28 text-ink" dir={en ? "ltr" : "rtl"}>
      {/* شريط الإعلان */}
      {brand.announcementEnabled && brand.announcementText.trim() ? (
        <div className="overflow-hidden border-b border-accent/25 bg-accent text-accent-contrast">
          <div className="marquee-track flex w-max gap-10 py-2 text-xs font-black">
            {Array.from({ length: 4 }).map((_, index) => (
              <span key={index} className="whitespace-nowrap">
                {brand.announcementText}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* الهيدر */}
      <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {brand.logo ? (
              <DishImage src={brand.logo} alt="" className="h-11 w-11 rounded-xl border border-line" />
            ) : (
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-contrast">
                <Utensils className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-base font-black leading-tight">
                {pick(lang, brand.restaurantName, brand.restaurantNameEn)}
              </h1>
              <p className="truncate text-[11px] text-muted">{pick(lang, brand.tagline, brand.taglineEn)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cx(
                "hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold sm:inline-flex",
                contact.isOpen ? "bg-emerald-500/12 text-emerald-400" : "bg-red-500/12 text-red-400",
              )}
            >
              <span className={cx("h-1.5 w-1.5 rounded-full", contact.isOpen ? "bg-emerald-400" : "bg-red-400")} />
              {contact.isOpen ? (en ? "Open now" : "مفتوح الآن") : en ? "Closed" : "مقفل"}
            </span>
            <a
              href="/admin"
              title={en ? "Admin panel" : "لوحة التحكم"}
              className="hidden h-9 w-9 place-items-center rounded-full border border-line text-muted transition hover:text-accent sm:grid"
            >
              <Settings2 className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-accent transition hover:border-accent/60"
              aria-label={en ? "Open cart" : "فتح السلة"}
            >
              <ShoppingBag className="h-4.5 w-4.5" />
              {totals.itemCount > 0 ? (
                <span className="absolute -end-1 -top-1 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-accent px-1 text-[10px] font-black text-accent-contrast">
                  {totals.itemCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4">
        {/* الهيرو */}
        {brand.showHero ? (
          <section className="relative mt-5 overflow-hidden rounded-xl2 border border-line">
            <DishImage src={brand.heroImage} alt="" className="absolute inset-0 h-full w-full" />
            <div className="relative bg-[linear-gradient(100deg,rgba(0,0,0,.86),rgba(0,0,0,.35))] p-6 sm:p-8">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-black text-accent">
                <Sparkles className="h-3 w-3" />
                {pick(lang, brand.tagline, brand.taglineEn)}
              </span>
              <h2 className="mt-3 max-w-md text-2xl font-black leading-snug text-white sm:text-3xl">
                {brand.heroTitle}
              </h2>
              <p className="mt-2 max-w-md text-xs leading-relaxed text-white/75 sm:text-sm">{brand.heroSubtitle}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <a
                  href="#menu"
                  className="rounded-xl bg-accent px-4 py-2.5 text-xs font-black text-accent-contrast transition hover:brightness-110"
                >
                  {en ? "Browse the menu" : "تفرّج على الأكل 👀"}
                </a>
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 px-3 py-2.5 text-[11px] font-bold text-white/80">
                  <Clock className="h-3.5 w-3.5" /> {contact.openingHours}
                </span>
              </div>
            </div>
          </section>
        ) : null}

        {!contact.isOpen ? (
          <div className="mt-4 flex items-center gap-2 rounded-card border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs font-bold text-amber-400">
            <Store className="h-4 w-4" /> {contact.closedMessage}
          </div>
        ) : null}

        {/* البحث + الأقسام */}
        <div id="menu" className="sticky top-[68px] z-30 -mx-4 mt-5 bg-bg/92 px-4 py-3 backdrop-blur-md">
          {commerce.enableSearch ? (
            <div className="mb-2.5 flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 focus-within:border-accent">
              <Search className="h-4 w-4 shrink-0 text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={en ? "Search for a dish…" : "دوّر على أي صنف… بيتزا، برجر، عصير"}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted/70"
              />
              {query ? (
                <button onClick={() => setQuery("")} className="text-[11px] font-bold text-muted hover:text-ink">
                  ✕
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            <CategoryChip
              active={activeCategory === ALL}
              onClick={() => setActiveCategory(ALL)}
              label={en ? "All" : "الكل"}
              emoji="🍽️"
            />
            {visibleCategories.map((category) => (
              <CategoryChip
                key={category.id}
                active={activeCategory === category.id}
                onClick={() => setActiveCategory(category.id)}
                label={nameOf(category)}
                emoji={category.emoji}
              />
            ))}
          </div>
        </div>

        {/* الأكثر طلباً */}
        {featured.length > 0 ? (
          <section className="mt-3">
            <h3 className="mb-2 text-sm font-black text-accent">{commerce.featuredLabel}</h3>
            <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
              {featured.slice(0, 8).map((item) => (
                <button
                  key={item.id}
                  onClick={() => cart.add(item.id)}
                  className="w-40 shrink-0 snap-start overflow-hidden rounded-card border border-line bg-surface text-start transition hover:border-accent/50"
                >
                  <DishImage src={item.image} alt={nameOf(item)} className="h-24 w-full" />
                  <div className="p-2.5">
                    <p className="truncate text-xs font-bold">{nameOf(item)}</p>
                    <p className="mt-1 text-[11px] font-black text-accent">
                      {formatPrice(item.price, lang, commerce)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {/* شبكة الأصناف */}
        <div className="mt-5 space-y-7">
          {sections.map((section) => (
            <section key={section.category?.id ?? "none"}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-base font-black">
                  <span aria-hidden>{section.category?.emoji}</span>
                  {section.category ? nameOf(section.category) : en ? "Menu" : "القائمة"}
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold text-muted">
                    {section.items.length}
                  </span>
                </h3>
                {activeCategory === ALL ? (
                  <button
                    onClick={() => setActiveCategory(section.category!.id)}
                    className="flex items-center gap-0.5 text-[11px] font-bold text-muted transition hover:text-accent"
                  >
                    {en ? "See all" : "عرض الكل"}
                    <ChevronLeft className={cx("h-3.5 w-3.5", en && "rotate-180")} />
                  </button>
                ) : null}
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {section.items.map((item) => (
                  <DishCard
                    key={item.id}
                    item={item}
                    lang={lang}
                    commerce={commerce}
                    quantity={cart.quantityOf(item.id)}
                    onAdd={() => cart.add(item.id)}
                    onRemoveOne={() => cart.setQuantity(item.id, cart.quantityOf(item.id) - 1)}
                    disabled={!contact.isOpen || !commerce.enableCart}
                  />
                ))}
              </div>
            </section>
          ))}

          {isEmpty ? (
            <div className="rounded-xl2 border border-dashed border-line py-14 text-center">
              <p className="text-sm font-black">{en ? "Nothing matches your search" : "مفيش حاجة يطابق البحث 🤷‍♂️"}</p>
              <p className="mt-1 text-xs text-muted">
                {en ? "Try another word or pick another category" : "جرّب كلمة تانية أو اختار قسم تاني"}
              </p>
            </div>
          ) : null}
        </div>

        {/* الفوتر */}
        <footer className="mt-10 rounded-xl2 border border-line bg-surface p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="text-sm font-black">{pick(lang, brand.restaurantName, brand.restaurantNameEn)}</h4>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">{contact.footerNote}</p>
            </div>
            <div className="space-y-1.5 text-xs text-muted">
              <p className="flex items-start gap-2">
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" /> {contact.openingHours}
              </p>
              {contact.address ? (
                <a href={contact.mapUrl || undefined} target="_blank" rel="noopener" className="flex items-start gap-2 transition hover:text-accent">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" /> {contact.address}
                </a>
              ) : null}
              {contact.phone ? (
                <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="flex items-start gap-2 transition hover:text-accent">
                  <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" /> {contact.phone}
                </a>
              ) : null}
              {contact.instagram || contact.facebook ? (
                <p className="flex flex-wrap gap-2 pt-1">
                  {contact.instagram ? (
                    <a href={contact.instagram} target="_blank" rel="noopener" className="rounded-lg border border-line px-2.5 py-1 font-bold transition hover:border-accent hover:text-accent">
                      Instagram
                    </a>
                  ) : null}
                  {contact.facebook ? (
                    <a href={contact.facebook} target="_blank" rel="noopener" className="rounded-lg border border-line px-2.5 py-1 font-bold transition hover:border-accent hover:text-accent">
                      Facebook
                    </a>
                  ) : null}
                </p>
              ) : null}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[11px] text-muted">
            <span>
              © {new Date().getFullYear()} — {pick(lang, brand.restaurantName, brand.restaurantNameEn)}
            </span>
            <a href="/admin" className="inline-flex items-center gap-1 font-bold transition hover:text-accent">
              <Settings2 className="h-3 w-3" /> {en ? "Admin" : "لوحة التحكم"}
            </a>
          </div>
        </footer>
      </main>

      {/* شريط السلة العائم */}
      {commerce.enableCart && totals.itemCount > 0 ? (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md items-center justify-between gap-3 rounded-card bg-accent px-4 py-3 text-accent-contrast shadow-[0_18px_45px_-18px_var(--accent)] transition hover:brightness-110 active:scale-[.99]"
        >
          <span className="flex items-center gap-2 text-xs font-black">
            <ShoppingBag className="h-4 w-4" />
            {totals.itemCount} {en ? "items" : "صنف"}
          </span>
          <span className="text-sm font-black">
            {formatPrice(totals.subtotal, lang, commerce)} {en ? "→ Review order" : "— راجع الطلب ←"}
          </span>
        </button>
      ) : null}

      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        lines={cart.lines}
        setQuantity={cart.setQuantity}
        remove={cart.remove}
        clear={cart.clear}
      />
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  label,
  emoji,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  emoji?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold whitespace-nowrap transition",
        active
          ? "border-accent bg-accent text-accent-contrast shadow-[0_10px_24px_-14px_var(--accent)]"
          : "border-line bg-surface text-muted hover:border-accent/50 hover:text-ink",
      )}
    >
      {emoji ? <span aria-hidden>{emoji}</span> : null}
      {label}
    </button>
  );
}
