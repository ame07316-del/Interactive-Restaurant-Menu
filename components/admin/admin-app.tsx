"use client";

import { useMemo, useState } from "react";
import {
  CircleCheck,
  Cloud,
  Database,
  ExternalLink,
  FolderTree,
  LayoutDashboard,
  LoaderCircle,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Monitor,
  Palette,
  Phone,
  QrCode,
  Receipt,
  RefreshCw,
  Store,
  Smartphone,
  Tablet,
  TriangleAlert,
  UtensilsCrossed,
} from "lucide-react";
import { useMenu } from "@/lib/use-menu";
import { useAdminSession } from "@/lib/use-admin-session";
import { pick } from "@/lib/format";
import { useHashValue } from "@/lib/use-hash";
import { cx } from "@/lib/cx";
import { Button, Field, TextInput } from "@/components/ui";
import { CloudBar } from "./cloud-bar";
import { DashboardPanel } from "./panel-dashboard";
import { BrandPanel } from "./panel-brand";
import { LookPanel } from "./panel-look";
import { CategoriesPanel } from "./panel-categories";
import { ItemsPanel } from "./panel-items";
import { OrderingPanel } from "./panel-ordering";
import { DataPanel } from "./panel-data";

type TabKey = "dashboard" | "brand" | "look" | "categories" | "items" | "ordering" | "data" | "preview";

const TABS: { key: TabKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", label: "نظرة عامة", icon: LayoutDashboard },
  { key: "brand", label: "الهوية", icon: Store },
  { key: "look", label: "المظهر", icon: Palette },
  { key: "categories", label: "الأقسام", icon: FolderTree },
  { key: "items", label: "الأصناف", icon: UtensilsCrossed },
  { key: "ordering", label: "الطلب والأسعار", icon: Receipt },
  { key: "preview", label: "معاينة", icon: QrCode },
  { key: "data", label: "البيانات والحماية", icon: Database },
];

export function AdminApp() {
  const { ready, data, saveState, cloud } = useMenu();
  const session = useAdminSession(data.admin.pin, data.admin.lockAdmin);
  const { authed, checked, login, logout } = session;
  const [tab, setTab] = useHashValue<TabKey>(
    TABS.map((item) => item.key),
    "dashboard",
  );
  const [jump, setJump] = useState<{ intent?: string; nonce: number }>({ nonce: 0 });

  const go = (next: string, intent?: string) => {
    setTab(next as TabKey);
    setJump((prev) => ({ intent, nonce: prev.nonce + 1 }));
  };

  const siteTitle = useMemo(
    () => pick(data.brand.language, data.brand.restaurantName, data.brand.restaurantNameEn),
    [data.brand],
  );

  if (!ready || !checked) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg text-muted">
        <span className="flex items-center gap-2 text-sm font-bold">
          <LoaderCircle className="h-4 w-4 animate-spin" /> جاري تحميل اللوحة…
        </span>
      </div>
    );
  }

  if (!authed)
    return (
      <AdminLogin
        siteName={siteTitle}
        mode={session.mode}
        login={login}
        signIn={session.signIn}
        busy={session.busy}
        authError={session.authError}
        locked={data.admin.lockAdmin}
        pin={data.admin.pin}
      />
    );

  return (
    <div className="min-h-screen bg-bg text-ink" dir="rtl">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {data.brand.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.brand.logo} alt="" className="h-9 w-9 rounded-xl border border-line object-cover" />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-contrast">
                <UtensilsCrossed className="h-4 w-4" />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-black leading-tight">{siteTitle}</p>
              <p className="truncate text-[11px] text-muted">
                {session.mode === "supabase" && session.email
                  ? session.email
                  : "لوحة التحكم — كل الإعدادات من هنا"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <SaveChip state={saveState} />
            <CloudBar />
            <a
              href="/"
              target="_blank"
              rel="noopener"
              className="hidden items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-xs font-bold text-muted transition hover:border-accent/60 hover:text-accent sm:inline-flex"
            >
              فتح الموقع <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <Button size="sm" variant="ghost" onClick={logout} title="خروج من اللوحة">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* تابات الموبايل */}
        <nav className="no-scrollbar flex gap-1.5 overflow-x-auto border-t border-line px-3 py-2 lg:hidden">
          {TABS.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={cx(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition",
                tab === item.key ? "bg-accent text-accent-contrast" : "bg-surface text-muted",
              )}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="mx-auto flex max-w-7xl gap-5 px-4 py-5">
        <aside className="sticky top-24 hidden w-56 shrink-0 lg:block">
          <nav className="space-y-1">
            {TABS.map((item) => (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={cx(
                  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-[13px] font-bold transition",
                  tab === item.key
                    ? "bg-accent/12 text-accent ring-1 ring-accent/25"
                    : "text-muted hover:bg-surface hover:text-ink",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
          <div className="mt-4 rounded-card border border-line bg-surface p-3 text-[11px] leading-relaxed text-muted">
            {cloud.enabled ? (
              <>
                <span className="flex items-center gap-1.5 font-black text-accent">
                  <Cloud className="h-3.5 w-3.5" /> متصل بـ Supabase
                </span>
                <p className="mt-1.5">
                  أي تعديل بيتحفظ كمسودة أوتوماتيك. اضغط{" "}
                  <span className="font-black text-ink">«حفظ ونشر»</span> عشان يوصل لكل العملاء في نفس
                  الثانية (Realtime)، والنسخة المحلية بتفضل كـ cache لو النت قطع.
                </p>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1.5 font-black text-ink">وضع محلي</span>
                <p className="mt-1.5">
                  متغيرات Supabase مش موجودة — التعديلات بتتحفظ في المتصفح (localStorage) وبتنشر عن طريق
                  تصدير JSON → استبدال <span className="font-mono text-accent">lib/defaults.ts</span>.
                </p>
              </>
            )}
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-10">
          {tab === "dashboard" ? <DashboardPanel onJump={go} /> : null}
          {tab === "brand" ? <BrandPanel /> : null}
          {tab === "look" ? <LookPanel /> : null}
          {tab === "categories" ? <CategoriesPanel intent={jump.intent} nonce={jump.nonce} /> : null}
          {tab === "items" ? <ItemsPanel intent={jump.intent} nonce={jump.nonce} /> : null}
          {tab === "ordering" ? <OrderingPanel /> : null}
          {tab === "preview" ? <PreviewPanel /> : null}
          {tab === "data" ? <DataPanel /> : null}
        </main>
      </div>
    </div>
  );
}

function SaveChip({ state }: { state: ReturnType<typeof useMenu>["saveState"] }) {
  const map = {
    idle: { label: "محفوظ", className: "text-emerald-400 border-emerald-500/25 bg-emerald-500/10", icon: <CircleCheck className="h-3 w-3" /> },
    dirty: { label: "بيحفظ…", className: "text-muted border-line bg-surface", icon: <LoaderCircle className="h-3 w-3 animate-spin" /> },
    saved: { label: "تم الحفظ", className: "text-accent border-accent/30 bg-accent/10", icon: <CircleCheck className="h-3 w-3" /> },
    error: { label: "التخزين ممتلئ", className: "text-red-400 border-red-500/30 bg-red-500/10", icon: <TriangleAlert className="h-3 w-3" /> },
  } as const;
  const current = map[state];
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black", current.className)}>
      {current.icon}
      {current.label}
    </span>
  );
}

function AdminLogin({
  siteName,
  mode,
  login,
  signIn,
  busy,
  authError,
  locked,
  pin,
}: {
  siteName: string;
  mode: "supabase" | "demo";
  login: (attempt: string, remember?: boolean) => boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  busy: boolean;
  authError: string | null;
  locked: boolean;
  pin: string;
}) {
  const [value, setValue] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState(false);

  const shake = () => {
    setError(true);
    window.setTimeout(() => setError(false), 700);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === "supabase") {
      const ok = await signIn(email, password);
      if (!ok) {
        setPassword("");
        shake();
      }
      return;
    }
    if (!login(value, remember)) {
      setValue("");
      shake();
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-bg px-4" dir="rtl">
      <form
        onSubmit={submit}
        className={cx(
          "w-full max-w-sm rounded-xl2 border border-line bg-surface p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,.8)] transition",
          error && "animate-[shake_.4s_ease-in-out] border-red-500/50",
        )}
      >
        <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-accent text-accent-contrast">
          {mode === "supabase" ? <Cloud className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
        </span>
        <h1 className="text-lg font-black">لوحة تحكم {siteName}</h1>

        {mode === "supabase" ? (
          <>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              سجّل دخول بحساب Supabase بتاع المطعم عشان تقدر تنشر التعديلات لكل العملاء.
            </p>

            <div className="mt-4 space-y-3">
              <Field label="الإيميل">
                <div className="relative">
                  <Mail className="pointer-events-none absolute inset-y-0 start-3 my-auto h-3.5 w-3.5 text-muted" />
                  <TextInput
                    autoFocus
                    type="email"
                    autoComplete="email"
                    dir="ltr"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="owner@restaurant.com"
                    className="ps-9 text-start"
                    required
                  />
                </div>
              </Field>
              <Field label="الباسورد">
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute inset-y-0 start-3 my-auto h-3.5 w-3.5 text-muted" />
                  <TextInput
                    type="password"
                    autoComplete="current-password"
                    dir="ltr"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    className="ps-9 text-start"
                    required
                  />
                </div>
              </Field>
            </div>

            {authError ? (
              <p className="mt-2 text-[11px] font-bold text-red-400">{authError}</p>
            ) : null}

            <Button type="submit" className="mt-4 w-full" size="lg" disabled={busy}>
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              دخول
            </Button>

            <p className="mt-3 rounded-xl border border-line bg-surface-2/50 p-2.5 text-[11px] leading-relaxed text-muted">
              الحسابات بتتدار من Supabase → Authentication. من غير تسجيل دخول أي حد يقدر يتفرّج على القائمة
              المنشورة بس، ومش هيقدر يكتب حاجة (RLS).
            </p>
          </>
        ) : (
          <>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              وضع الديمو: Supabase مش متظبط على النسخة دي، فالتعديلات محلية على الجهاز ده بس.
              اكتب الرقم السري اللي حددته في الإعدادات عشان تكمل.
            </p>

            <div className="mt-4">
              <Field label="الرقم السري">
                <TextInput
                  autoFocus
                  type="password"
                  inputMode="numeric"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder="••••"
                  className={cx("text-center font-mono text-lg tracking-[.4em]", error && "border-red-500/60")}
                />
              </Field>
              {error ? <p className="mt-1.5 text-[11px] font-bold text-red-400">الرقم غلط — حاول تاني</p> : null}
            </div>

            <label className="mt-3 flex items-center gap-2 text-[11px] font-bold text-muted">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                className="h-3.5 w-3.5 accent-[var(--accent)]"
              />
              افتكرني على الجهاز ده
            </label>

            <Button type="submit" className="mt-4 w-full" size="lg">
              دخول
            </Button>

            {locked ? (
              <details className="mt-4 rounded-xl border border-line bg-surface-2/50 p-2.5">
                <summary className="cursor-pointer text-[11px] font-bold text-muted hover:text-ink">
                  نسيت الرقم السري؟
                </summary>
                <p className="mt-2 text-[11px] leading-relaxed text-muted">
                  الرقم الحالي على الجهاز ده:{" "}
                  <code className="rounded-md bg-accent/15 px-2 py-0.5 font-mono font-black text-accent">{pin}</code>{" "}
                  — بيظهر هنا لأن مفيش سيرفر في وضع الديمو. غيّره بعد الدخول من تبويب «البيانات والحماية»،
                  أو امسح بيانات الموقع من إعدادات المتصفح يرجع 1234.
                </p>
              </details>
            ) : (
              <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-amber-500/10 p-2.5 text-[11px] font-bold text-amber-400">
                <Phone className="h-3.5 w-3.5" /> القفل مطفي من الإعدادات — الدخول مفتوح لأي حد عنده اللينك.
              </p>
            )}
          </>
        )}
      </form>
      <style>{`@keyframes shake{10%,90%{transform:translateX(-2px)}20%,80%{transform:translateX(4px)}30%,50%,70%{transform:translateX(-7px)}40%,60%{transform:translateX(7px)}}`}</style>
    </div>
  );
}

function PreviewPanel() {
  const [device, setDevice] = useState<"mobile" | "tablet" | "desktop">("mobile");
  const [nonce, setNonce] = useState(0);
  const width = device === "mobile" ? 390 : device === "tablet" ? 768 : 1280;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-line bg-surface p-3">
        <p className="text-[11px] text-muted">
          المعاينة بتتحدّث لايف مع أي تعديل — أي تبويب تاني مفتوح على نفس المتصفح هيستقبل التحديث نفسه.
        </p>
        <div className="flex items-center gap-1.5">
          {(
            [
              { key: "mobile", icon: Smartphone, label: "موبايل" },
              { key: "tablet", icon: Tablet, label: "تابلت" },
              { key: "desktop", icon: Monitor, label: "ديسكتوب" },
            ] as const
          ).map((option) => (
            <button
              key={option.key}
              onClick={() => setDevice(option.key)}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition",
                device === option.key ? "border-accent bg-accent/12 text-accent" : "border-line text-muted hover:text-ink",
              )}
            >
              <option.icon className="h-3.5 w-3.5" />
              {option.label}
            </button>
          ))}
          <button
            onClick={() => setNonce((n) => n + 1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-bold text-muted transition hover:text-accent"
          >
            <RefreshCw className="h-3.5 w-3.5" /> تحديث
          </button>
        </div>
      </div>

      <div className="flex justify-center rounded-xl2 border border-line bg-surface-2/40 p-3">
        <iframe
          key={nonce}
          src="/"
          title="معاينة الموقع"
          style={{ width, maxWidth: "100%" }}
          className="h-[72vh] rounded-xl border border-line bg-bg"
        />
      </div>
    </div>
  );
}
