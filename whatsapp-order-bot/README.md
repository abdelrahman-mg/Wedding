# WhatsApp → Google Sheets Order Logger

يستقبل رسائل العملاء اللي بتيجي على رقم الواتساب بتاعك عن طريق **WhatsApp Cloud API الرسمية من ميتا** (مفيش خطر حظر)، وكل رسالة بتتسجل تلقائيًا كصف جديد في Google Sheet.

الأعمدة اللي بتتسجل: التاريخ/الوقت، رقم العميل، اسم العميل (لو ظاهر في واتساب)، نص الرسالة كامل، وبشكل اختياري (لو فعّلت AI parsing): اسم العميل المستخرج، المنتج، الكمية، المنطقة.

---

## الخطوة 1: عمل الـ Google Sheet + Service Account

1. اعمل Google Sheet جديد، وحط في الصف الأول العناوين دي بالترتيب:
   `Timestamp | Phone | Sender Name | Raw Message | Customer Name | Product | Quantity | Area`
2. خد الـ Spreadsheet ID من رابط الشيت (الجزء اللي بين `/d/` و `/edit`).
3. روح على [Google Cloud Console](https://console.cloud.google.com/):
   - اعمل مشروع جديد (أو استخدم مشروع موجود).
   - فعّل **Google Sheets API** من "APIs & Services > Library".
   - روح "IAM & Admin > Service Accounts" واعمل Service Account جديد.
   - من تبويب "Keys" اعمل **Create new key > JSON**، هيتحمل ملف — سمّيه `credentials.json` وحطه جوه فولدر `whatsapp-order-bot/` (الفولدر ده متجاهل في `.gitignore` عشان الأمان).
4. افتح الشيت بتاعك واعمل Share، وحط الإيميل بتاع الـ Service Account (شكله زي `xxx@xxx.iam.gserviceaccount.com`) كـ **Editor**.

## الخطوة 2: عمل WhatsApp Cloud API (مجاني)

1. روح [developers.facebook.com](https://developers.facebook.com/) وسجل دخول بحساب فيسبوك، واعمل App جديد من نوع "Business".
2. من داخل الـ App، ضيف منتج **WhatsApp**.
3. هيديك ميتا رقم تجريبي (Test Number) مجاني تقدر تجرب بيه فورًا، وكمان **Temporary Access Token** (بيصلح 24 ساعة، كويس للتجربة).
4. لما تبقى جاهز تشتغل بشكل دائم:
   - اربط رقم الواتساب الحقيقي بتاعك بالتطبيق (System User + Permanent Access Token).
   - هتحتاج توثيق الـ Business (Business Verification) عشان تبعت لأي حد، مش بس أرقام مسجلة كـ testers.
5. في وضع التجربة (Test Number)، لازم تضيف رقم موبايلك (أو أرقام العملاء اللي هتجرب بيهم) في "API Setup > To" كـ recipient number، لأن الرقم التجريبي مبيستقبلش من أي حد إلا الأرقام دي.

## الخطوة 3: إعداد المتغيرات (.env)

انسخ `.env.example` باسم `.env` واملأ القيم:

```
WHATSAPP_VERIFY_TOKEN=  # اختار أي string عشوائي، هتحطه في ميتا كمان
WHATSAPP_ACCESS_TOKEN=  # الـ token من خطوة 2
SPREADSHEET_ID=         # من خطوة 1
SHEET_NAME=Orders
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
ANTHROPIC_API_KEY=      # اختياري — شرح تحت
```

## الخطوة 4: تشغيل السيرفر

```bash
cd whatsapp-order-bot
npm install
npm start
```

هيشتغل السيرفر على `http://localhost:3000/webhook`.

عشان ميتا تقدر توصله وهو شغال على جهازك، محتاج رابط عام (HTTPS) — استخدم [ngrok](https://ngrok.com/) للتجربة:

```bash
ngrok http 3000
```

هياخدلك رابط زي `https://xxxx.ngrok-free.app` — استخدمه في الخطوة الجاية.

للتشغيل الدائم (مش هينفع تسيب اللابتوب شغال 24 ساعة)، ارفع نفس الكود على استضافة زي **Render** أو **Railway** (فيه باقة مجانية كافية للبداية)، وحط فيها نفس متغيرات الـ `.env`.

## الخطوة 5: ربط الـ Webhook في ميتا

1. في نفس صفحة الـ WhatsApp product في developers.facebook.com، روح "Configuration".
2. حط:
   - **Callback URL**: `https://<رابطك>/webhook`
   - **Verify Token**: نفس القيمة اللي حطيتها في `WHATSAPP_VERIFY_TOKEN`
3. دوس "Verify and Save" — لو السيرفر شغال هيتظبط لوحده.
4. من "Webhook fields"، اعمل Subscribe لحقل **messages**.

من اللحظة دي، أي رسالة نصية جاية من عميل هتتسجل تلقائيًا في الشيت خلال ثواني.

## استخراج البيانات تلقائيًا بالـ AI (اختياري)

من غير `ANTHROPIC_API_KEY`، هيتسجل نص الرسالة الخام بس، وأنت تراجعه وتصنفه يدويًا. لو حطيت مفتاح Anthropic API في `.env`، السيرفر هيحاول يستخرج تلقائيًا: اسم العميل، المنتج، الكمية، المنطقة من نص الرسالة الحرة، ويحطهم في أعمدة منفصلة. لو الاستخراج فشل لأي سبب، بيرجع يسجل الرسالة الخام عادي من غير ما يوقف حاجة.

## ملاحظات مهمة

- السيرفر بيسجل بس الرسائل الجايه من العملاء (مش رسايلك انت اللي بترد بيها).
- الرسائل اللي مش نصية (صور، صوت، ملصقات) دلوقتي بيتسجل إنها "skipped" في اللوج بس مش بتتحط في الشيت — لو عايز تسجلها كمان قولي أضيفها.
- الحل ده رسمي 100% من ميتا، مفيش خطر حظر على رقمك زي الطرق الغير رسمية.
