# 🍔 Interactive Restaurant Menu — Full Stack (Next.js + Supabase)

تطبيق مطعم عربي **Full Stack**: واجهة عملاء RTL + لوحة تحكم + باك إند حقيقي يحفظ
القائمة والطلبات والمخزون في قاعدة بيانات Supabase (Postgres).

## المميزات

- قائمة RTL سريعة ومتجاوبة: بحث، أقسام، سلة، وإرسال الطلب على واتساب برقم طلب حقيقي.
- **دخول لوحة التحكم حصرياً بـ Supabase Auth (إيميل + باسورد)** من الحساب الموجود في
  `Authentication → Users`. مفيش أي دخول محلي أو رقم سري في المشروع.
- كل API خاص بالأدمن بيتحقق من **Supabase access token على السيرفر** — أي طلب من غير توكن صالح بيرجع `401`.
- **كمية (مخزون) لكل صنف** مع حد تنبيه قابل للتعديل، و**خصم تلقائي** للكمية عند تسجيل الطلب.
- **تنبيه نقص المخزون** داخل لوحة التحكم عند وصول الكمية للحد (الافتراضي **2**) + إرساله لأي خدمة خارجية عبر webhook.
- سجل الطلبات والتنبيهات محفوظ في قاعدة البيانات ويظهر في لوحة التحكم.
- حفظ لحظي مركزي: تعديل الأدمن يظهر لكل العملاء على كل الأجهزة.

## الباك إند

| المسار | الوصف | الصلاحيات |
| --- | --- | --- |
| `GET /api/menu` | قراءة القائمة | عام |
| `PUT /api/menu` | حفظ القائمة | أدمن (Supabase token) |
| `POST /api/orders` | تسجيل طلب + خصم المخزون + إنشاء تنبيه النقص | عام |
| `GET /api/admin/overview` | الطلبات + تنبيهات المخزون + حالة التخزين | أدمن (Supabase token) |
| `PATCH /api/admin/overview` | تحديد التنبيهات كمقروءة | أدمن (Supabase token) |
| `GET /api/admin/session` | التحقق من جلسة الأدمن على السيرفر | أدمن (Supabase token) |

التحقق من التوكن بيتم في `lib/server-auth.ts` بمخاطبة `SUPABASE_URL/auth/v1/user`،
والبيانات بتتحفظ عن طريق `lib/server-database.ts`.

## قاعدة البيانات

نفّذ [`supabase/schema.sql`](supabase/schema.sql) مرة واحدة في Supabase → SQL Editor.
الملف بينشئ:

- `menu_data` — القائمة (قراءة عامة، كتابة للأدمن).
- `orders` — الطلبات (قراءة للأدمن).
- `stock_notifications` — تنبيهات نقص المخزون.
- `place_order(payload jsonb)` — دالة `SECURITY DEFINER` بتسجّل الطلب وتخصم المخزون
  بشكل ذرّي (`SELECT … FOR UPDATE`) وتنشئ تنبيه النقص.
- تفعيل **Supabase Realtime** على الجداول (`alter publication supabase_realtime add table ...`)
  عشان التحديث اللحظي يوصل فوراً لكل الأجهزة عبر WebSocket.

> **التحديث اللحظي الفوري:** تعديلات الأدمن، خصم المخزون بعد أي طلب، الطلبات الجديدة،
> وتنبيهات النقص بتوصل لكل الأجهزة في نفس اللحظة عن طريق Supabase Realtime (مع فحص
> دوري احتياطي كل 30-60 ثانية لو الـ WebSocket انقطع). لو البيانات مش بتتحدث لحظياً،
> نفّذ جزء **Realtime** في آخر `supabase/schema.sql` في SQL Editor — أو شغّل الأمر:
> `alter publication supabase_realtime add table public.menu_data, public.orders, public.stock_notifications;`

> لحد ما تنفّذ الملف، الموقع بيشتغل على ملف مؤقت للتطوير، وتظهر لك لافتة حمراء في لوحة
> التحكم تطلب تنفيذ الـ schema.

## متغيرات البيئة

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
LOW_STOCK_WEBHOOK_URL=https://...   # اختياري
```

القيم متظبطة في **Vercel → Project Settings → Environment Variables**.
المشروع بيستخدم مفتاح `anon` العام فقط — **مفيش `service_role` في أي مكان في الكود**.

### شكل رسالة الـ webhook

```json
{
  "type": "low_stock",
  "sentAt": "2026-09-06T12:00:00.000Z",
  "count": 1,
  "notifications": [
    { "id": "…", "itemId": "i1", "itemName": "برجر السعادة", "remaining": 2, "threshold": 2 }
  ]
}
```

ممكن تربطه بـ WhatsApp Business API أو Make أو n8n أو Slack.

## التشغيل محلياً

```bash
npm install
cp .env.example .env.local   # وحط قيم مشروعك في Supabase
npm run dev
```

- الموقع: `http://localhost:3000`
- لوحة التحكم: `http://localhost:3000/admin` — بالإيميل والباسورد بتوع يوزر Supabase.

## التحقق

```bash
npm run lint
npm run build
```
