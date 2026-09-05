# 🍔 قائمة المطعم الذكية + لوحة تحكم كاملة (Next.js + Supabase)

قائمة إلكترونية للمطعم مبنية بـ **Next.js 16 (App Router)** و **TypeScript** و **Tailwind CSS v4**، فيها سلة طلبات وإرسال مباشر على **واتساب**، وكمان **لوحة تحكم `/admin`** تتحكم في كل حاجة في الموقع.

التعديلات من اللوحة **بتتنشر لحظياً لكل العملاء** عن طريق **Supabase** (Postgres + Realtime + Storage + Auth)، و**localStorage** بيفضل موجود كـ **cache + fallback** — يعني الموقع بيشتغل ١٠٠٪ حتى من غير Supabase.

> 🔗 [لايف ديمو على فيرسل](https://interactive-restaurant-menu-one.vercel.app/) · لوحة التحكم: `/admin`

---

## ✨ المميزات

### واجهة العميل
- 📱 تصميم Mobile-First بخط عربي (Cairo) و RTL كامل، ووضع LTR إنجليزي لو حبيت.
- ⚡ **تحديث لحظي**: أي نشر من الأدمن بيوصل لكل المتصفحات المفتوحة في نفس الثانية (Supabase Realtime).
- 🛍️ سلة طلبات محفوظة في المتصفح (لو العميل قفل الصفحة يلاقيها زي ما هي).
- 🔎 بحث لحظي + تبويب أقسام + قسم «الأكثر طلباً».
- 🏷️ شارات على كل صنف: الأكثر طلباً، جديد، درجة الحرافة، خصم بالنسبة المئوية، «خلصت».
- 🧾 أنواع طلب: توصيل / استلام من الفرع / أكل في المطعم — بكل حقوله.
- 💵 مصروف توصيل، توصيل مجاني بعد حد معين، خدمة بالنسبة المئوية، وحد أدنى للطلب.
- 📲 إرسال الطلب على واتساب برسالة مفصّلة بتنسقها إنت بنفسك.

### لوحة التحكم `/admin`
- 🔐 **دخول بحساب Supabase** (إيميل + باسورد). لو متغيرات البيئة ناقصة بترجع تلقائياً لوضع **الديمو بالرقم السري**.
- ☁️ **مؤشر حالة المزامنة**: `بيرفع…` / `منشور ✓` / `مسودة غير منشورة` / `فشل + إعادة المحاولة`.
- 🚀 زرارين: **حفظ ونشر** (يوصل لكل العملاء فوراً) و **حفظ كمسودة** (العميل يفضل شايف آخر نسخة منشورة).
- 🖼️ رفع صور الأصناف واللوجو على **Supabase Storage** (باكت `menu-images`) وتخزين الـ public URL، مع **dataURL كـ fallback** لو الرفع فشل أو النت مقطوع.
- 📊 نظرة عامة + صحة القائمة، 🏪 الهوية، 🎨 المظهر، 📂 الأقسام، 🍽️ الأصناف، 🧾 الطلب والأسعار، 👁️ معاينة موبايل/تابلت/ديسكتوب.
- 🗄️ **البيانات والحماية**: تصدير/نسخ JSON (زي ما هو)، استيراد، إعادة ضبط، كود QR، وحجم التخزين المستخدم.

---

## 🧠 الفكرة المعمارية

```
Supabase  public.menu_data
  ├─ slug = 'main'   → النسخة المنشورة (is_published = true)  ← اللي بيشوفها العملاء
  └─ slug = 'draft'  → المسودة        (is_published = false) ← الأدمن بس (RLS)
        ↕  Realtime (postgres_changes)
lib/supabase.ts          ← createBrowserClient (متصفح فقط — مفيش fetch وقت SSR/البناء)
lib/supabase-menu.ts     ← قراءة/كتابة الصفوف + رفع الصور + الاشتراك في Realtime
lib/menu-store-core.ts   ← المخزن: Supabase (مصدر الحقيقة) + localStorage (cache/fallback)
        ↓
useMenu()                ← useSyncExternalStore بيغذّي كل المكونات (نفس الـ API القديم)
```

**سير العمل:**

1. أول تحميل → القراءة من `localStorage` فوراً (من غير أي انتظار) وبعدين تحديث من Supabase.
2. أي تعديل في اللوحة → يتحفظ في `localStorage` فوراً + **upsert أوتوماتيك لصف المسودة** (بعد ٩٠٠ ملّي ثانية من آخر ضغطة زر).
3. **حفظ ونشر** → صف `main` بيتحدّث → Realtime بيبلّغ كل المتصفحات المفتوحة → القائمة بتتغيّر عندهم من غير ريفريش.
4. مفيش Supabase (متغيرات ناقصة / النت مقطوع)؟ الموقع بيكمّل شغل على `localStorage` من غير أي أخطاء في الكونسول.
5. التبويبات في نفس المتصفح بتتزامن بحدث `storage` المدمج (اتشال `BroadcastChannel` لأنه بقى زيادة).

> ℹ️ **مين بيشوف المسودة؟** المسجّل دخوله بس. الزائر العادي (anon) الـ RLS مانعاه من قراءة صف المسودة أصلاً، فبيشوف آخر نسخة منشورة.

---

## 🗄️ إعداد Supabase (SQL كامل)

### 1) إنشاء المشروع
1. افتح [supabase.com/dashboard](https://supabase.com/dashboard) → **New project** → اختار اسم ومنطقة قريبة (مثلاً `eu-central-1`) وحط باسورد للداتابيز.
2. بعد ما يخلص: **Project Settings → API** فيه **Project URL** و **Publishable key** (`sb_publishable_…`) — دول اللي هنستعملهم.
3. **Authentication → Providers → Email** فعّله، وبعدين **Authentication → Users → Add user** واعمل حساب صاحب المطعم (فعّل *Auto Confirm User*).

### 2) الـ SQL (انسخه كله في **SQL Editor → New query → Run**)

```sql
-- ─────────────────────────────────────────────
-- 1) الجدول
-- ─────────────────────────────────────────────
create table if not exists public.menu_data (
  slug         text primary key default 'main',
  data         jsonb       not null default '{"version":1}'::jsonb,
  is_published boolean     not null default true,
  updated_at   timestamptz not null default now()
);

-- الصف المنشور + صف المسودة
insert into public.menu_data (slug, data, is_published)
values ('main',  '{"version":1}'::jsonb, true)
on conflict (slug) do nothing;

insert into public.menu_data (slug, data, is_published)
values ('draft', '{"version":1}'::jsonb, false)
on conflict (slug) do nothing;

-- ─────────────────────────────────────────────
-- 2) trigger لتحديث updated_at
-- ─────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists menu_data_set_updated_at on public.menu_data;
create trigger menu_data_set_updated_at
  before update on public.menu_data
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- 3) RLS — أربع سياسات
--    anon: يقرأ المنشور بس | authenticated: يقرأ ويكتب
-- ─────────────────────────────────────────────
alter table public.menu_data enable row level security;

drop policy if exists "menu_data anon read published"  on public.menu_data;
drop policy if exists "menu_data auth read all"        on public.menu_data;
drop policy if exists "menu_data auth insert"          on public.menu_data;
drop policy if exists "menu_data auth update"          on public.menu_data;

create policy "menu_data anon read published"
  on public.menu_data for select
  to anon
  using (is_published = true);

create policy "menu_data auth read all"
  on public.menu_data for select
  to authenticated
  using (true);

create policy "menu_data auth insert"
  on public.menu_data for insert
  to authenticated
  with check (true);

create policy "menu_data auth update"
  on public.menu_data for update
  to authenticated
  using (true)
  with check (true);

-- ─────────────────────────────────────────────
-- 4) Realtime
-- ─────────────────────────────────────────────
alter table public.menu_data replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.menu_data;
exception
  when duplicate_object then null;   -- الجدول مضاف قبل كده
end;
$$;

-- ─────────────────────────────────────────────
-- 5) Storage: باكت صور القائمة (قراءة عامة / كتابة للمسجّلين)
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

drop policy if exists "menu-images public read"   on storage.objects;
drop policy if exists "menu-images auth insert"   on storage.objects;
drop policy if exists "menu-images auth update"   on storage.objects;
drop policy if exists "menu-images auth delete"   on storage.objects;

create policy "menu-images public read"
  on storage.objects for select
  to public
  using (bucket_id = 'menu-images');

create policy "menu-images auth insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'menu-images');

create policy "menu-images auth update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'menu-images')
  with check (bucket_id = 'menu-images');

create policy "menu-images auth delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'menu-images');
```

> 🔎 **ليه سياسة `insert` مهمة؟** الكود بيحاول `UPDATE` الأول، ولو الصف مش موجود (أول مسودة مثلاً) بيعمل `INSERT`. من غير سياسة insert أول مسودة هتفشل والمؤشر هيقول «فشل» مع زر إعادة محاولة.

### 3) أول تشغيل
أول ما تفتح `/admin` وتسجّل دخول ولاقى صف `main` لسه فيه `{"version":1}` بس، اللوحة **بتملاه أوتوماتيك من `DEFAULT_DATA`** الموجودة في `lib/defaults.ts` (نفس أصناف الديمو) عشان الموقع ميفضلش فاضي.

---

## 🔑 متغيرات البيئة

| المتغير | القيمة | مطلوب؟ |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` | اختياري (من غيره = وضع localStorage) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_…` (أو anon JWT القديم) | اختياري |

محلياً: انسخ `.env.example` لـ `.env.local` وحط قيمك.

```bash
cp .env.example .env.local
```

⚠️ **مهم جداً:**
- في **Vercel → Settings → Environment Variables** لازم يتضافوا بنوع **Config** (مش **Secret**) لـ **Production** و **Preview** — لأن متغيرات `NEXT_PUBLIC_` بتتحقن جوه الـ client bundle وقت البناء، والـ Secrets مش بتوصل للمتصفح.
- **ممنوع** استخدام الـ `sb_secret_` / `service_role` في أي كود بيوصل للمتصفح. المشروع ده كله فرونت إند، فمفيش مكان آمن للمفتاح السري أصلاً.
- بعد أي تغيير في المتغيرات لازم **Redeploy** عشان القيم تتحقن من جديد.

---

## 🚀 مسودة vs نشر

| | حفظ كمسودة | حفظ ونشر |
| --- | --- | --- |
| الصف في الداتابيز | `slug = 'draft'` · `is_published = false` | `slug = 'main'` · `is_published = true` |
| مين بيشوفه؟ | الأدمن المسجّل دخول بس | كل العملاء |
| Realtime | بيوصل للأدمن على أجهزته | بيوصل لكل المتصفحات المفتوحة فوراً |
| بيحصل أوتوماتيك؟ | ✅ بعد أي تعديل بـ ٩٠٠ms | ❌ بالزرار بس |

المؤشر في الهيدر بيقول: `جاري الاتصال…` → `بيرفع…` → `منشور ✓` / `مسودة غير منشورة` / `فشل الاتصال` (ومعاه زر **إعادة المحاولة**).

---

## 🛠️ التشغيل محلياً

```bash
git clone https://github.com/ame07316-del/Interactive-Restaurant-Menu.git
cd Interactive-Restaurant-Menu
npm install
cp .env.example .env.local     # اختياري — من غيره الموقع شغال localStorage
npm run dev                    # http://localhost:3000  · اللوحة /admin
```

| الأمر | الوظيفة |
| --- | --- |
| `npm run dev` | سيرفر تطوير |
| `npm run build` | بناء الإنتاج (كل الصفحات static prerender — مفيش أي اتصال بـ Supabase وقت البناء) |
| `npm run start` | تشغيل البناء الإنتاجي |
| `npm run lint` | ESLint |

**وضع الديمو:** من غير متغيرات بيئة، اللوحة بتطلب رقم سري (الافتراضي `1234`) وكل حاجة بتتخزن في المتصفح.

---

## ▲ الربط بفيرسل

1. **Import Project** من GitHub (Framework: Next.js — من غير أي إعدادات إضافية).
2. **Settings → Environment Variables** → ضيف `NEXT_PUBLIC_SUPABASE_URL` و `NEXT_PUBLIC_SUPABASE_ANON_KEY` بنوع **Config** لـ Production و Preview.
3. **Deploy** → افتح `/admin` → سجّل دخول بحساب Supabase → عدّل → **حفظ ونشر**.
4. (اختياري) في Supabase → **Authentication → URL Configuration** حط دومين فيرسل في **Site URL**.
5. (اختياري) حماية إضافية على `/admin` بـ **Vercel Password Protection** أو **Cloudflare Access**.

---

## ✅ اختبارات سريعة بعد الديبلوي

| الاختبار | المتوقع |
| --- | --- |
| سجّل دخول → غيّر سعر صنف → **حفظ ونشر**، وافتح `/` في تبويب تاني | السعر بيتغيّر من غير ريفريش |
| افتح `/` في متصفح تاني (أو Incognito) وانشر تعديل | التغيير بيبان في نفس الثانية |
| ارفع صورة صنف من اللوحة | الصورة بتترفع على `menu-images` والرابط `https://<ref>.supabase.co/storage/v1/object/public/menu-images/…` بيتخزن في الصنف |
| شيل متغيرات البيئة واعمل build | الموقع شغال بالكامل بالـ localStorage من غير أخطاء في الكونسول، واللوحة بتطلب الرقم السري |
| جرّب كتابة من غير تسجيل دخول (مثلاً من الكونسول) | الـ RLS بيرفض — `new row violates row-level security policy` |

---

## 📦 التقنيات

- **Next.js 16** (App Router + Turbopack) · **React 19** · **TypeScript** (strict)
- **Tailwind CSS v4** (توكنات CSS Variables: `bg-surface`، `text-accent`، `rounded-card`…)
- **@supabase/supabase-js v2** (Postgres + Realtime + Storage + Auth) — المتصفح بس
- **lucide-react** للأيقونات · **canvas-confetti** لاحتفال الطلب
- تخزين: Supabase + `localStorage` كـ cache/fallback

---

## 🗂️ خريطة الملفات

```
app/
├─ layout.tsx              # الخط + metadata + سكربت Anti-flash
├─ globals.css             # التوكنات (ألوان/حواف/خطوط) ووضع dark-light
├─ page.tsx                # قائمة العملاء
└─ admin/
   ├─ layout.tsx           # noindex للوحة
   └─ page.tsx             # <AdminApp />
components/
├─ ui.tsx                  # أزرار/حقول/مودال/توست…
├─ image-field.tsx         # رفع على Supabase Storage + fallback dataURL
├─ site-theme.tsx          # يترجم الإعدادات لـ CSS variables
├─ public/ (dish-card, cart-sheet)
└─ admin/  (admin-app, cloud-bar, panel-dashboard/brand/look/categories/items/ordering/data)
lib/
├─ types.ts                # كل النماذج
├─ defaults.ts             # DEFAULT_DATA (بذرة أول تشغيل)
├─ supabase.ts             # createBrowserClient + أسماء الجدول/الباكت/الصفوف
├─ supabase-menu.ts        # قراءة/كتابة الصفوف + Realtime + رفع الصور
├─ supabase-auth-core.ts   # حالة الدخول (Supabase Auth)
├─ storage.ts              # localStorage + الدمج مع الافتراضي + مزامنة التابات
├─ menu-store-core.ts      # المخزن (بدون React) + المزامنة + كل الـ mutations
├─ use-menu.tsx            # useMenu()
├─ cart-store-core.ts + use-cart.ts
├─ admin-session-core.ts + use-admin-session.ts
├─ format.ts               # الأسعار، الإجماليات، رسالة واتساب
├─ fonts.ts                # اختيارات الخط
├─ image.ts                # ضغط الصور بـ canvas (Blob + dataURL)
└─ use-hash.ts             # ربط التبويب الحالي بالـ hash
public/menu/               # صور الأصناف المحلية
```

---

## ⚠️ حدود المشروع

| النقطة | التفصيل |
| --- | --- |
| مفيش سيرفر خاص | كل الاتصال من المتصفح مباشرة لـ Supabase — الحماية كلها معتمدة على RLS. |
| الصور بدون سحابة | لو Supabase مش متظبط، الصور بتتحول `dataURL` مضغوطة وبتاخد من حصة الـ 5MB بتاعة localStorage. |
| الطلبات | مفيش سجل طلبات؛ الطلب بيترسل على واتساب. |
| الرقم السري | وضع الديمو بس — مش حماية حقيقية. |

---

## 📝 الخطوات الجاية المقترحة

- [ ] سجل طلبات في Supabase + إحصائيات مبيعات.
- [ ] إضافات للأصناف (حجم، إضافات، اختيارات إجبارية).
- [ ] Multi-branch (أكتر من فرع = أكتر من `slug`).
- [ ] OG image ديناميكية لكل صنف.
