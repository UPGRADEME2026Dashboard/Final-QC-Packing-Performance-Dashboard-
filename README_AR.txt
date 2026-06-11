# UPGRADE Dashboard - Firebase Auth Version

تم تعديل الملفات لتعمل بتسجيل دخول حقيقي عبر Firebase Authentication.

بيانات الدخول التي تم ضبط صفحة الدخول عليها:
Email: upgrade@upgrade.com
Password: UPGRADE2026

مهم جداً:
- كلمة المرور غير محفوظة داخل ملفات الكود.
- التحقق يتم من Firebase Authentication مباشرة.
- auth.js لا يحتوي على PASSWORD ثابت كما كان سابقاً.
- زر Logout يستخدم Firebase signOut.
- Dashboard لا تفتح إلا إذا كان المستخدم مسجلاً دخوله.
- data.csv ما زال ملف قراءة فقط داخل ملفات الموقع لأن Firebase Storage غير متاح على خطة Spark الحالية لديك.

طريقة تغيير الإيميل أو كلمة السر لاحقاً:
1. افتح Firebase Console.
2. ادخل إلى Authentication.
3. افتح Users.
4. اضغط على المستخدم upgrade@upgrade.com.
5. من الثلاث نقاط (...) اختر Reset password أو Delete/Create حسب المطلوب.
6. لو غيرت الإيميل، غيّر القيمة الافتراضية فقط في login.html داخل حقل value، أو اتركها فارغة.

ملفات التشغيل المطلوبة في نفس المجلد:
- index.html
- login.html
- auth.js
- script.js
- style.css
- data.csv
- upgrade-logo.png

للنشر على Firebase Hosting:
1. ضع هذه الملفات داخل مجلد المشروع.
2. شغّل firebase init hosting.
3. اختر نفس مشروع UPGRADE Dashboard.
4. Public directory: اكتب . أو اسم المجلد الذي يحتوي الملفات.
5. Configure as single-page app: اختر No.
6. شغّل firebase deploy.
