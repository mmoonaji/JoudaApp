# AGENTS.md - Jouda System Reference

> المرجع السريع لأي Agent أو مطور يعدل على Jouda.
> اقرأه قبل التعديل، وحدثه بعد أي تغيير جوهري في البنية أو التدفق أو الأمان.

آخر تحديث: 2026-08-13

---

## 1. صورة النظام

Jouda يتكون من تطبيق عميل React/Capacitor ومشروعين Supabase:

| الجزء | المعرف / المسار | الدور |
|---|---|---|
| JoudaApp | `unsqyovqzsgmxacrqunh` | تطبيق العميل، لوحة الإدارة، دوال Edge، نسخة المنتجات المعروضة |
| JoudaStockManager / Inventory | `tfecwguylsxbfknrxrlx` | نظام المخزون/POS: المنتجات، الفواتير، المستودعات، المحصلين |
| Frontend | `React 18 + Vite + Tailwind` | تطبيق الويب ولوحة الإدارة |
| Android | `Capacitor 8` | تطبيق Android native مبني من `dist/` |

تطبيق العميل يقرأ المنتجات والمحتوى من JoudaApp. المخزون النهائي والحجز والفواتير تتم في Inventory.

---

## 2. هيكل الملفات المهم

```text
Jouda-main/
├── App.tsx, pages/, components/, services/, hooks/, utils/
├── context/folder-structure-guidelines.md
├── capacitor.config.ts
├── android/
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   └── functions/
│       ├── telegram-bot/
│       ├── submit-order/
│       ├── sync-products/
│       ├── update-inventory/
│       └── analyze-product/
└── docs/security/
```

لا تفترض أن migrations وحدها تمثل حالة قاعدة البيانات الحية. عند تغييرات RLS أو RPC أو Edge Functions، تحقق من Supabase الحي عند الإمكان.

قبل إضافة ملفات frontend جديدة أو نقل ملفات قديمة، راجع `context/folder-structure-guidelines.md`.

---

## 3. Android / Capacitor

الإعدادات الفعلية:

| الخاصية | القيمة |
|---|---|
| App ID | `com.joudafood.app` |
| App Name | `Jouda - جودة` |
| Web Dir | `dist` |
| Hostname | `joudafood.com` |
| Android Scheme | `https` |
| AGP | `8.13.2` |
| Gradle Wrapper | `8.13` |

الحزم المهمة في `package.json`:

| الحزمة | الدور |
|---|---|
| `@capacitor/core`, `@capacitor/cli`, `@capacitor/android` | تشغيل Android native |
| `@capacitor/camera` | تصوير/اختيار صورة من الجهاز |
| `@capacitor/geolocation` | الموقع وحساب التوصيل |

دورة Android:

```bash
npm run build
npx cap sync android
npx cap open android
```

`components/ui/Scanner.tsx` يستخدم `Camera.getPhoto()` على المنصة الأصلية مع `CameraSource.Prompt`، ويبقي `<input type="file">` كـ fallback للويب.

---

## 4. Edge Functions

| الدالة | المسار | التوثيق/الحماية | الدور |
|---|---|---|---|
| `telegram-bot` | `supabase/functions/telegram-bot/` | `verify_jwt=false`; Telegram يمر بدون JWT، والـ DB/Cron يتطلب `x-webhook-secret` | أوامر وأزرار تيليجرام واستقبال Webhooks |
| `submit-order` | `supabase/functions/submit-order/index.ts` | `verify_jwt=true` في `supabase/config.toml` | استقبال طلب التطبيق، إنشاء quotation في Inventory، إنشاء `customer_orders` في JoudaApp |
| `sync-products` | `supabase/functions/sync-products/index.ts` | `verify_jwt=false`; يتحقق من `WEBHOOK_SECRET` | مزامنة منتجات Inventory إلى JoudaApp |
| `update-inventory` | `supabase/functions/update-inventory/index.ts` | يتحقق من JWT داخل الكود ويقبل فقط `joudafood@gmail.com`; تحقق من JWT deployment setting في Supabase Dashboard | تحديث حقول مملوكة للمخزون مثل `category` و`is_stock_tracked` |
| `analyze-product` | `supabase/functions/analyze-product/index.ts` | يستخدم `GEMINI_API_KEY` ويقرأ المنتجات النشطة؛ تحقق من JWT deployment setting في Supabase Dashboard | تحليل صورة/اسم منتج للمستخدم |

`telegram-bot` فقط هو مجلد متعدد الملفات. بقية الدوال مستقلة في مجلداتها.

ملفات `telegram-bot` الحالية:

| الملف | الدور |
|---|---|
| `index.ts` | نقطة الدخول والتوجيه والتحقق |
| `config.ts` | متغيرات البيئة و`isAdmin()` وخرائط السائقين |
| `db.ts` | عملاء Supabase لـ JoudaApp وInventory |
| `telegram.ts` | Telegram API helpers |
| `format.ts` | `fmtDate()`, `formatPhone()`, `whatsappButton()`, `paymentLabel()` |
| `workflow.ts` | State machines وأزرار `wf_*` و`inv_*` |
| `commands.ts` | أوامر الإدارة النصية: `/help`, `/today`, `/queue`, `/money` |
| `wf-callbacks.ts` | أزرار طلبات التطبيق |
| `inv-callbacks.ts` | أزرار فواتير POS |
| `incoming.ts` | استقبال فواتير Inventory الجديدة |
| `confirmations.ts` | تأكيد الإجراءات الحساسة |

---

## 5. تدفقات العمل

### فاتورة POS من Inventory

```text
Inventory invoices INSERT
→ Database Webhook / pg_net مع x-webhook-secret
→ telegram-bot handleNewInvoice
→ customer_orders في JoudaApp
→ رسالة تيليجرام للمجموعة مع أزرار inv_*
```

### طلب تطبيق Jouda

```text
Frontend → Supabase direct للكتالوج والوسائط والإعدادات والطلبات
→ بيانات العرض + الصور + إرسال الطلب
→ submit-order
→ Inventory RPC: create_quotation
→ JoudaApp: customer_orders + order_items باستخدام service_role، مع حفظ نسخة تاريخية لمكوّنات كل عرض داخل سطر الطلب
→ إشعار تيليجرام للمدير مع wf_approve_
```

### اعتماد الطلب

```text
Admin يضغط wf_approve_
→ status = confirmed
→ إرسال الطلب للمجموعة مع أزرار wf_*
```

### مزامنة المنتجات

```text
pg_cron / net.http_post
→ sync-products مع WEBHOOK_SECRET
→ قراءة Inventory products + product_stock_summary
→ upsert في JoudaApp products
→ كتابة sync_logs
```

---

## 6. قاعدة البيانات وRLS

### JoudaApp

| الجدول | القراءة | الكتابة الحالية المتوقعة |
|---|---|---|
| `products` | عامة للمنتجات النشطة | لوحة الإدارة/الدوال حسب RLS الحي، و`sync-products` عبر service_role |
| `package_items` | عامة للقراءة | لوحة البكجات و`submit-order`/`sync-products` تعتمد عليه؛ تحقق من RLS الحي قبل تغييره |
| `app_categories` | عامة/لوحة الإدارة حسب RLS الحي | لوحة الإدارة تستخدمه لإدارة تصنيفات التطبيق |
| `customer_orders` | service_role، وبعض سياسات قراءة العميل بالهاتف | `submit-order` و`telegram-bot` عبر service_role |
| `order_items` | service_role، وبعض سياسات قراءة العميل بالهاتف | `submit-order` عبر service_role؛ `package_items_snapshot` يحفظ أسماء وكميات مكوّنات العرض وقت الطلب ولا يُعاد بناؤه لاحقًا |
| `app_settings` | service_role/RPC إداري | RPC إداري |
| `app_settings_public` | `anon`, `authenticated` | View فقط |
| `recipes`, `articles`, `banners`, `faq` | عامة | لوحة الإدارة تتوقع كتابة مستخدم authenticated حسب إعدادات RLS الحية |
| `sync_logs` | service_role وauthenticated للوحة الإدارة | `sync-products` عبر service_role |

مهم: لوحة الإدارة الحالية تستخدم Supabase Auth (`signInWithPassword`). عميل Supabase في المتصفح صار افتراضيًا `direct` بالكامل. خدمات الإدارة في `services/admin/` تكتب مباشرة إلى جداول المحتوى والمنتجات والبكجات والتصنيفات، وتستدعي `update-inventory` لتحديث Inventory. لا تعد إلى نظام `admin_pin` كمسار رئيسي، حتى لو بقيت migrations قديمة تحتوي RPCs مبنية عليه.

بدء التطبيق العام fail-open: صفحات العميل تظهر فورًا ولا تنتظر فحص الصيانة أو استعادة جلسة الإدارة. إعدادات الصيانة تطبق في الخلفية بطلب مشترك/مخزن مؤقتًا، بينما مسارات `/admin` وحدها تنتظر نتيجة استعادة الجلسة. لا تعِد بوابة تحميل عامة تجمع الفحصين.

رابط استعادة كلمة المرور للإدارة مدعوم الآن داخل الواجهة: إذا وصل `PASSWORD_RECOVERY` أو `type=recovery` إلى الموقع، تعرض الواجهة شاشة تعيين كلمة مرور جديدة بدل تحويل المستخدم مباشرة إلى `/admin/overview`.

الكود الحالي يعتمد على live schema/RLS قد لا يكون ممثلاً بالكامل في migrations الموجودة. قبل تعديل Admin Services أو RLS، تحقق من Supabase الحي.

حقول منتجات مستخدمة في الواجهة ولوحة الإدارة:

| الحقل | الدور |
|---|---|
| `app_category` | تصنيف العرض داخل التطبيق، وقد يختلف عن تصنيف Inventory |
| `is_hidden_in_app` | إخفاء المنتج من واجهة العميل |
| `force_out_of_stock` | إجبار المنتج يظهر غير متوفر في التطبيق |
| `valid_until` | تاريخ انتهاء عروض/بكجات |
| `tags` | شارات واجهة مثل خصم، الأكثر مبيعاً، هدية |

الصور الإدارية ترفع إلى bucket اسمه `public-assets`.

### Inventory

Inventory هو مصدر الحقيقة للمخزون والحجز. `products.stock_quantity` في JoudaApp نسخة عرض فقط، ولا يعتمد عليها للحجز النهائي.

`products.stock_quantity = NULL` يعني منتج غير محدود/غير متتبع في واجهة التطبيق.

خيار "دائماً متوفر" يغيّر `Inventory.products.is_stock_tracked=false` عبر `update-inventory`، ثم ينعكس إلى JoudaApp عبر `sync-products`.

المراقبة في Frontend تقتصر حاليًا على Vercel Analytics. لا توجد حزم أو تهيئة لـ Sentry أو Microsoft Clarity، و`ErrorBoundary` يسجل الأخطاء محليًا في console فقط.

`AppImage` يفحص `HTMLImageElement.complete` و`naturalWidth` عند التركيب حتى تبقى صور الكاش ظاهرة بعد التنقل بين الصفحات، مع تحميل eager لأول صورة ظاهرة وlazy للبقية.

معاينات «وصفات رائجة» و«تعرّف على الجلوتين» تُحفظ منفصلة في IndexedDB بعد أول تحميل ناجح، وتظهر من الكاش فورًا ثم تتحدث من Supabase. نسخة PWA تخزن صور Supabase العامة التي سبق عرضها بحد أقصى 80 صورة لمدة 30 يومًا، وتخزن مسبقًا ملفات JavaScript التي تعتمد عليها الصفحة الرئيسية حتى تعمل بعد إعادة فتح التطبيق دون اتصال.

---

## 7. قواعد العمل

### Workflow طلبات التطبيق `wf_*`

```text
submitted → approve → confirmed → reserve → reserved → prepare → preparing
          → reject  → cancelled                                → deliver → delivered
                                                                          → paid → deposited
```

الإلغاء متاح من `confirmed`, `reserved`, `preparing`. العكس الإداري متاح بعد التسليم/الدفع/الإيداع حسب `workflow.ts`.

في طلبات التطبيق، `reserved` يعني أن عضو الفريق/المندوب استلم مسؤولية الطلب من تيليجرام. إذا كان الطلب كاش وله فاتورة Inventory، زر الاستلام يستدعي `assign_invoice_to_collector` باستخدام `TELEGRAM_DRIVER_MAP` وينشئ عهدة التحصيل. الطلبات غير الكاش لا تحتاج عهدة محصل.

أزرار الإيداع للكاش تستدعي `settle_single_invoice` قبل تغيير الحالة إلى `deposited`/`deposit`. إذا لم تكن الفاتورة مسندة لمحصل أو لم تكن قابلة للتسوية، يجب أن يفشل الزر ولا يعلّم الطلب كمودع. غير الكاش يغير حالة workflow فقط ولا يدخل في عهد المحصلين.

أزرار `wf_*` تتغير حسب `customer_orders.order_type`:

| النوع | `reserve` | `prepare` | `deliver` |
|---|---|---|---|
| `delivery` | استلمت الطلب | بدء التجهيز | تم التسليم |
| `shipping` | استلمت مهمة الشحن | تجهيز الشحنة | سُلّمت لشركة الشحن |

### Workflow فواتير POS `inv_*`

```text
pending → reserve → prepare → deliver → paid → deposit
```

العكس `reverse` إداري فقط من المراحل بعد `reserve`.

### حسابات المحصلين

- المبلغ = `subtotal - discount` بدون `delivery_fee`.
- الفواتير المضمنة: `status = POSTED` و`is_voided = false`.
- يستبعد `role = admin` أو `name = Manager`.
- الكاش فقط: `payment_method = CASH`.

---

## 8. اتفاقيات الكود

- Frontend: TypeScript + React + Vite.
- Edge Functions: TypeScript على Deno.
- Supabase JS في الدوال: `jsr:@supabase/supabase-js@2`.
- Telegram `parse_mode`: HTML.
- رسائل تيليجرام بالعربية.
- استخدم `fmtDate()` من `supabase/functions/telegram-bot/format.ts` للتواريخ داخل البوت.
- لا تستخدم `toLocaleString('ar-SA')` للتواريخ لأنه قد ينتج تاريخ هجري.
- استخدام `toLocaleString()` للأرقام فقط مقبول.

Callback data:

| النوع | الصيغة |
|---|---|
| POS | `inv_{action}_{invoiceId}` |
| طلبات التطبيق | `wf_{action}_{orderId}` |
| قديم | `order_{newStatus}_{orderId}` |

حد Telegram: `callback_data` لا يتجاوز 64 حرفاً، وإلا يظهر `BUTTON_DATA_INVALID`.

أزرار العمل لفواتير POS وطلبات التطبيق تكون غالباً كل زر في صف مستقل. أزرار الاعتماد/الرفض يمكن أن تكون في صف واحد.

---

## 9. متغيرات البيئة

### Frontend / Vite

| المتغير | الدور |
|---|---|
| `VITE_SUPABASE_URL` | رابط JoudaApp |
| `VITE_SUPABASE_ANON_KEY` | anon key للعميل |
| `VITE_SUPABASE_ANON` | اسم legacy موجود محلياً لنفس anon key؛ يدعمه proxy للتوافق |
| `VITE_TOMTOM_API_KEY` | مفتاح TomTom Search API لبحث موقع العميل في خريطة التوصيل |

### Edge Functions

| المتغير | مستخدم في |
|---|---|
| `SUPABASE_URL` | دوال JoudaApp |
| `SUPABASE_ANON_KEY` | قراءة عامة/تحقق JWT عند الحاجة |
| `SUPABASE_SERVICE_ROLE_KEY` | كتابة حساسة في JoudaApp |
| `INVENTORY_SUPABASE_URL` | الاتصال بـ Inventory |
| `INVENTORY_SERVICE_ROLE_KEY` | عمليات Inventory الحساسة |
| `WEBHOOK_SECRET` | Cron/DB webhooks مثل `sync-products` و`telegram-bot` |
| `ALLOWED_ORIGIN` | CORS؛ إذا غاب يرجع الكود إلى `*` |
| `TELEGRAM_BOT_TOKEN` | بوت تيليجرام |
| `TELEGRAM_ADMIN_CHAT_ID` | معرفات المديرين، مفصولة بفواصل |
| `TELEGRAM_GROUP_CHAT_ID` | معرفات المجموعات، مفصولة بفواصل |
| `TELEGRAM_WEBHOOK_SECRET` | سر اختياري لتيليجرام |
| `TELEGRAM_DRIVER_MAP` | ربط Telegram user id بمستخدم Inventory |
| `SYSTEM_USER_UUID` | المستخدم الآلي في Inventory/Jouda |
| `ONLINE_WAREHOUSE_ID` | مستودع الطلبات الأونلاين |
| `GEMINI_API_KEY` | تحليل المنتجات في `analyze-product` |

---

## 10. النشر

| الجزء | طريقة النشر |
|---|---|
| Frontend | GitHub ثم Vercel |
| Android | `npm run build` ثم `npx cap sync android` ثم Android Studio لإنتاج AAB |
| Edge Functions | Supabase Dashboard أو CLI حسب المتاح |
| Database | Supabase SQL Editor أو migrations |
| Secrets | Supabase Dashboard → Functions → Secrets |

عند نشر Frontend على Vercel، ارفع السورس الكامل لا `dist` فقط. تحقق من `npm run build` قبل النشر. عند نشر Edge Function، لا تنس تحديث المتغيرات المرتبطة بها. عند تغيير واجهة Android، شغل build ثم sync قبل فتح Android Studio.

---

## 11. أخطاء سابقة لا تكررها

| الخطأ | القاعدة الحالية |
|---|---|
| كشف `admin_pin` أو الاعتماد عليه كحماية رئيسية | الإدارة الحالية عبر Supabase Auth؛ لا تضف مسارات PIN جديدة |
| استخدام anon key للكتابة الحساسة داخل Edge Functions | استخدم service_role داخل الدوال فقط |
| `callback_data` أطول من 64 حرف | اختصر الصيغة |
| تواريخ هجرية في تيليجرام | استخدم `fmtDate()` |
| إرسال إشعار لكل الشاتات بدل المدير فقط | استخدم `adminIds()` عندما يكون الإشعار للمدير |
| نسيان `x-webhook-secret` في cron/webhooks | أرسله مع `WEBHOOK_SECRET` |
| تحديث `stock_quantity` يدوياً كأنه مصدر الحقيقة | مصدر الحقيقة Inventory؛ JoudaApp للعرض |
| الخلط بين `reserved` و`reserve` | JoudaApp يستخدم `reserved`; Inventory workflow يستخدم `reserve` |
| إبقاء طبقة proxy بعد رجوع direct الكامل | direct هو الوضع الوحيد الآن؛ لا تعِد إضافة proxy إلا إذا كانت هناك حاجة جديدة مثبتة |

---

## 12. العمل المفتوح

- تدقيق أمان Inventory: RLS، المفاتيح، webhooks، RPCs.
- مراجعة بقايا migrations القديمة المبنية على `admin_pin` وتقرير هل تزال أو تؤرشف.
- رفع أول إصدار Android إلى Google Play.
- إشعارات واتساب مباشرة، إن تقرر تنفيذها لاحقاً.

---

## 13. قاعدة تحديث هذا الملف

حدث هذا الملف عند أي تغيير في:

- بنية الملفات أو الدوال.
- تدفق الطلبات أو المخزون.
- RLS أو auth أو secrets.
- خطوات Android أو النشر.
- قرارات تمنع تكرار خطأ سابق.

لا تضف تفاصيل تنفيذية صغيرة هنا. ضع التفاصيل الطويلة في `docs/` أو `context/`.
