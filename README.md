# 🍔 قائمة مطعم متكاملة — Frontend + Backend

تطبيق مطعم عربي مبني بـ **Next.js 16 + TypeScript**، يشمل واجهة العملاء ولوحة تحكم وباك إند حقيقي لحفظ القائمة والطلبات والمخزون.

## المميزات

- قائمة RTL سريعة ومتجاوبة، بحث وأقسام وسلة طلبات وإرسال الطلب على واتساب.
- لوحة تحكم بدخول **Supabase Auth بالإيميل والباسورد** لتعديل الهوية، الأقسام، الأصناف، الأسعار، الخصومات والعروض.
- كل API خاص بالأدمن يتحقق من Supabase access token على السيرفر؛ والـPIN مجرد fallback محلي عند غياب إعدادات Supabase.
- مخزون مستقل لكل صنف: كمية حالية وحد تنبيه قابل للتعديل.
- تسجيل الطلب في الباك إند أولاً، ثم خصم الكميات آلياً وفتح رسالة واتساب برقم الطلب.
- عند وصول المخزون إلى 2 (أو الحد الذي يحدده الأدمن) يظهر تنبيه في لوحة التحكم، ويمكن إرساله إلى أي خدمة خارجية عبر `LOW_STOCK_WEBHOOK_URL`.
- سجل للطلبات والتنبيهات محفوظ في قاعدة البيانات.
- حفظ لحظي مركزي: تعديل الأدمن يظهر لكل الأجهزة، وليس في متصفح واحد فقط.

## الباك إند وقاعدة البيانات

المسارات الأساسية:

- `GET/PUT /api/menu` — قراءة القائمة وتعديلها (التعديل للأدمن فقط).
- `POST /api/orders` — تسجيل الطلب والتحقق من الكمية وخصم المخزون.
- `/api/admin/login` و`/api/admin/session` — مصادقة الأدمن.
- `/api/admin/overview` — الطلبات وتنبيهات المخزون.

محلياً تُحفظ البيانات في `data/restaurant.json`. في الإنتاج استخدم **Upstash Redis** بوضع متغيرات البيئة الموجودة في `.env.example`، لكي تكون البيانات دائمة على Vercel والمنصات Serverless.

## التشغيل

```bash
npm install
cp .env.example .env.local
npm run dev
```

- الموقع: `http://localhost:3000`
- لوحة التحكم: `http://localhost:3000/admin`
- عند إعداد Supabase: استخدم الإيميل والباسورد الخاصين باليوزر الموجود في Supabase Authentication.
- بدون إعدادات Supabase محلياً فقط: الرقم الاحتياطي الافتراضي `1234`.

## متغيرات الإنتاج

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
ADMIN_PIN=change-me # fallback محلي فقط
SESSION_SECRET=a-long-random-secret
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
LOW_STOCK_WEBHOOK_URL=https://... # اختياري
```

الـ webhook يستقبل JSON يحتوي `type: low_stock` وقائمة الأصناف التي وصلت إلى حد التنبيه، ويمكن ربطه بـ WhatsApp Business API أو Make أو n8n أو Slack.

## التحقق

```bash
npm run lint
npm run build
```
