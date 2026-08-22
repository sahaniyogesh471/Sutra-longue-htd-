# अब क्या बाक़ी है?

**हालत: website LIVE है, सब कुछ काम कर रहा है** ✅
**खर्च: ₹0/महीना · कोई credit card नहीं**

---

## ✅ पूरा हो चुका

Turso database · Render deploy · UptimeRobot · Cloudinary (तस्वीरें सुरक्षित) ·
HTTPS · नेपाली↔English · phone validation · **`.com.np` domain** ·
**Google Business Profile** · Yogesh का असली review

---

## 🔴 आपके 2 काम (admin panel में)

### 1. नक़ली reviews हटाएँ ⚠️

Site पर 4 **काल्पनिक** reviews हैं:
**Rabina Shrestha · Prakash Adhikari · Sunita Gurung · Aayush Shrestha**

ये असली ग्राहक नहीं. असली restaurant पर नक़ली reviews ग्राहकों को गुमराह करते
हैं और Google Business Profile पर penalty ला सकते हैं — और आपका profile तो
पहले से है, तो जोखिम असली है.

**करें:** Admin → Reviews → चारों delete → **Publish**

> 1 असली review (Yogesh का) 5 नक़ली से बेहतर है.

### 2. असली food photos डालें ⭐

अभी सारी तस्वीरें **Unsplash की stock photos** हैं — असली Sutra Lounge की नहीं.
अब Cloudinary लगा है, तो तस्वीरें **हमेशा सुरक्षित** रहेंगी.

**करें:** Admin → Dishes / Gallery → असली तस्वीरें upload करें

यह सबसे बड़ा सुधार है जो अब बचा है.

---

## 🟡 महीने में एक बार

### Backup लें

Turso के free plan में सिर्फ़ **1 दिन** का restore है. हफ़्ते/महीने में एक बार:

```bash
TURSO_URL="आपका-url" TURSO_AUTH_TOKEN="आपका-token" \
  node scripts/backup-turso.mjs
```

`sutra-backup-YYYY-MM-DD.sql` file बनेगी — उसे अपने computer/Drive पर रखें.

**Restore कैसे करें:** file की सामग्री Turso के SQL Console में paste करके Run.

> बड़े content बदलाव से पहले backup ज़रूर लें.

### Admin password बदलें (सुझाव)

पुराने git commits में पुराना password hash है. एक बार password बदल देने से वो
बेकार हो जाएगा.

**करें:** Admin → Security → Change password

---

## 🟢 वैकल्पिक

- **Menu और दाम जाँचें** — Admin → Dishes में सब सही है?
- **Google Search Console** — sitemap submit करें:
  `https://आपका-domain/sitemap.xml`
- **Opening hours** — त्योहारों में बदलें तो admin से update कर दें

---

## 📌 अगर आज सिर्फ़ एक काम

> **4 नक़ली reviews हटा दें.** बाक़ी सब बेहतरी है — यह भरोसे का सवाल है.

---

## 🔧 रोज़मर्रा

| काम | कहाँ |
|---|---|
| Content बदलना | `/admin` → बदलें → **Publish** |
| तस्वीर बदलना | `/admin` → upload (Cloudinary पर जाएगी) |
| Site की हालत | Render → Logs |
| Uptime | UptimeRobot dashboard |
| Backup | `node scripts/backup-turso.mjs` |

---

## 📚 Guides

| File | किसलिए |
|---|---|
| `CLOUDINARY_SETUP.md` | तस्वीरों की setup |
| `CLOUDFLARE_SETUP.md` | CDN + सुरक्षा (चाहें तो) |
| `WEBSITE_ANALYSIS.md` | performance/SEO/security जाँच |
