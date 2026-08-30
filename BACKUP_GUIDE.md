# Backup कैसे लें (फ़ोन से भी हो जाएगा)

**कब:** महीने में एक बार · बड़ा content बदलाव करने से पहले
**समय:** 2 मिनट

---

## Backup क्यों ज़रूरी है

आपका सारा content (dishes, दाम, reviews, settings) Turso में है.

Turso का free plan सिर्फ़ **1 दिन पीछे** तक ले जा सकता है:

| स्थिति | नतीजा |
|---|---|
| आज ग़लती हुई, आज पता चला | ✅ वापस मिल जाएगा |
| एक हफ़्ते बाद पता चला | ❌ **हमेशा के लिए गया** |

इसलिए अपनी एक copy रखना समझदारी है.

---

## तरीक़ा A — Admin panel से (सबसे आसान) ⭐

फ़ोन से 10 सेकंड में हो जाता है.

1. **`/admin`** में login करें
2. Dashboard पर **Backup** card ढूँढें
3. **Download backup** दबाएँ

`sutra-backup-2026-08-30.sql` नाम की file download हो जाएगी.

### file को सुरक्षित रखें

फ़ोन में पड़ी रहने से कोई फ़ायदा नहीं — फ़ोन खो गया तो backup भी गया:

- Google Drive में डाल दें, **या**
- अपने आप को email कर दें (subject में तारीख़ लिख दें)

**बस — backup हो गया** ✅

> File में **कोई password नहीं** है (admin account, sessions और security log
> जान-बूझकर छोड़े गए हैं), इसलिए इसे Drive या email में रखना सुरक्षित है.

---

## तरीक़ा B — Computer से (एक command)

Node.js वाला computer हो तो:

```bash
npm run build
TURSO_URL="आपका-url" TURSO_AUTH_TOKEN="आपका-token" \
  node scripts/backup-turso.mjs
```

वही file बनती है जो admin panel देता है.

---

## 🔄 Restore कैसे करें (अगर कुछ बिगड़ जाए)

1. Turso → **SQL Console**
2. अपनी backup file **पूरी** copy करके paste करें → **Run**
3. Render → **Manual Deploy** (ताज़ा data दिखाने के लिए)

पुराना data हटाने की अलग से ज़रूरत **नहीं** — file खुद हर table को पहले
साफ़ करती है, इसलिए आधा-अधूरा restore या duplicate वाली error नहीं आएगी.

> ✅ मैंने यह पूरा test किया है: सारा content मिटाकर सिर्फ़ इस file से वापस
> लाया — settings 27, dishes 11, gallery 9, reviews, hours 7 सब वापस आए,
> नेपाली text और ordering setting सही, integrity `ok`, और restore की हुई
> database पर site पूरी चली.

---

## ⚠️ ध्यान रखें

**Backup में क्या नहीं है:** admin password, sessions — जान-बूझकर छोड़े गए हैं
ताकि file सुरक्षित रहे. Password Render के environment variables में है.

**Turso console से copy करें तो line numbers न आएँ** — सिर्फ़ SQL text चाहिए.
(admin panel वाली file में यह दिक़्क़त नहीं आती.)

**तस्वीरें:** Cloudinary पर अलग सुरक्षित हैं, backup में नहीं चाहिए.

---

## 📅 सुझाव

| कब | क्या |
|---|---|
| महीने में एक बार | Backup लें |
| बड़ा बदलाव करने से पहले | Backup लें |
| 3 पुराने backup रखें | पुराने हटा दें |
