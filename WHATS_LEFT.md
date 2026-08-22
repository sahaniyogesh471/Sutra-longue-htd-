# अब क्या बाक़ी है?

**हालत: website LIVE और काम कर रही है** ✅
🌐 https://sutra-lounge.onrender.com

---

## ✅ जो पूरा हो चुका

| काम | हालत |
|---|---|
| Turso database (Mumbai) | ✅ |
| Render deploy (free, no card) | ✅ |
| UptimeRobot (site कभी नहीं सोती) | ✅ |
| Title, address, phone, email, WhatsApp | ✅ |
| सारे 11 dishes + दाम | ✅ |
| Gallery (8 images) | ✅ |
| Reviews दिख रहे | ✅ |
| Opening hours | ✅ |
| नेपाली ↔ English switch | ✅ |
| Reservation form + phone validation | ✅ |
| HTTPS | ✅ |
| **खर्च** | **₹0/महीना** |

---

## 🔴 ज़रूरी (पहले करें)

### 1. नक़ली reviews हटाएँ ⚠️

अभी site पर 4 **काल्पनिक** reviews हैं:
- Rabina Shrestha · Prakash Adhikari · Sunita Gurung · Aayush Shrestha

ये असली ग्राहक नहीं हैं. असली restaurant पर नक़ली reviews:
- ग्राहकों को गुमराह करते हैं
- Google Business Profile पर penalty ला सकते हैं

**करें:** Admin → Reviews → चारों delete → **Publish**

### 2. Yogesh Sahani का असली review जोड़ें

आपका असली review अभी site पर नहीं है.

**करें:** Admin → Reviews → **Add Review**
- नाम: `Yogesh Sahani` · नेपाली: `योगेश साहनी`
- Rating: 5
- Text + नेपाली text (form दोनों माँगेगा)
- Photo: `img/review-yogesh.webp` (repo में मौजूद है)

### 3. असली food photos डालें

अभी सारी तस्वीरें **Unsplash की stock photos** हैं — असली Sutra Lounge की नहीं.
यह सबसे बड़ा सुधार है जो आप कर सकते हैं.

**करें:** Admin → Dishes / Gallery → असली तस्वीरें upload करें

> ⚠️ **ध्यान:** Render का disk ephemeral है — admin से upload की तस्वीरें
> redeploy पर मिट जाएँगी. स्थायी हल के लिए नीचे "Cloudinary" देखें.

---

## 🟡 अगले हफ़्ते

### 4. `.com.np` domain (free)

अभी URL `sutra-lounge.onrender.com` है. सरकारी free domain लें:

1. **Cloudflare** पर free signup → 2 nameservers मिलेंगे
2. **<https://register.com.np>** → apply करें (वही nameservers डालें)
   - चाहिए: citizenship scan + cover letter
   - Approval: 1-3 दिन
3. Render → Settings → **Custom Domain** → जोड़ें

पूरी जानकारी: `CLOUDFLARE_SETUP.md`

### 5. Google पर दिखें

- **Google Business Profile** बनाएँ/claim करें ⭐ local restaurant के लिए सबसे ज़रूरी
- **Google Search Console** → site verify करें → sitemap submit करें:
  `https://sutra-lounge.onrender.com/sitemap.xml`

### 6. Photos स्थायी बनाएँ (Cloudinary)

Admin से upload की तस्वीरें redeploy पर मिटती हैं. Cloudinary (free, कोई card
नहीं) से यह हमेशा के लिए ठीक हो जाएगा — ~1 घंटे का काम.

---

## 🟢 बाद में (वैकल्पिक)

- **Backup** — Turso का free plan 1 दिन का point-in-time restore देता है.
  महीने में एक बार manual export भी कर लें.
- **Admin password बदलें** — पुराने commits में पुराना hash है. एक बार बदल
  देने से वो बेकार हो जाएगा.
- **Menu और दाम जाँचें** — Admin → Dishes में सब सही है या नहीं

---

## 📋 सबसे छोटा रास्ता

अगर सिर्फ़ **आज** एक काम करना हो:

> **Admin में जाकर 4 नक़ली reviews हटा दें.**

बाक़ी सब site को बेहतर बनाते हैं, पर ये एक भरोसे का सवाल है.

---

## 🔧 रोज़मर्रा के काम

| काम | कहाँ |
|---|---|
| Content बदलना | `/admin` → बदलें → **Publish** |
| Site की हालत | Render dashboard → Logs |
| Uptime | UptimeRobot dashboard |
| Code update | GitHub push → Render अपने आप deploy |
