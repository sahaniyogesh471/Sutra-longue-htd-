# Cloudinary Setup — तस्वीरें हमेशा के लिए सुरक्षित

**समय: ~10 मिनट · खर्च: ₹0 · Card/KYC: नहीं चाहिए**

---

## समस्या

Render का free disk **ephemeral** है — हर redeploy पर मिट जाता है.
इसलिए admin panel से upload की तस्वीरें कुछ दिन बाद ग़ायब हो जाती हैं.

## हल

Cloudinary पर तस्वीरें रखें. Code तैयार है — बस 3 keys डालनी हैं.

**Free plan:** 25 credits/महीना (~25 GB storage या 25 GB delivery) · हमेशा free ·
**कोई credit card नहीं**

---

## Step 1 — Account बनाएँ (3 मिनट)

1. खोलें: **<https://cloudinary.com/users/register_free>**
2. Sign up करें (Google से सबसे आसान)
3. Email verify करें
4. पूछे तो: *Programming Language* → **Node.js**

> कोई card नहीं माँगेगा. माँगे तो रुकिए और मुझे बताइए.

---

## Step 2 — तीन keys लें (2 मिनट)

1. Cloudinary **Dashboard** खोलें
2. ऊपर **Product Environment Credentials** दिखेगा
3. तीन चीज़ें copy करें:

| Key | कैसा दिखेगा |
|---|---|
| **Cloud Name** | `dxxxxxxxx` |
| **API Key** | `123456789012345` |
| **API Secret** | 👁️ icon दबाकर देखें, फिर copy |

> 🔒 **API Secret गुप्त है** — किसी को न भेजें, मुझे भी नहीं.
> सिर्फ़ Render के dashboard में डालना है.

---

## Step 3 — Render में डालें (3 मिनट)

1. **Render dashboard** → आपकी service → **Environment**
2. **Add Environment Variable** से तीन जोड़ें:

```
CLOUDINARY_CLOUD_NAME  = आपका cloud name
CLOUDINARY_API_KEY     = आपकी api key
CLOUDINARY_API_SECRET  = आपका api secret
```

3. **Save Changes** → Render अपने आप redeploy करेगा

⚠️ **paste करते वक़्त आगे-पीछे space या नई line न आए** (code खुद साफ़ कर देता है,
पर सावधानी अच्छी है).

---

## Step 4 — जाँचें (2 मिनट)

1. Deploy पूरा होने पर `/admin` खोलें
2. कोई भी तस्वीर upload करें (Dishes या Gallery में)
3. Site पर वो तस्वीर देखें → **right-click → Copy image address**
4. URL ऐसा होना चाहिए:

```
https://res.cloudinary.com/आपका-cloud/image/upload/.../sutra-lounge/xxxx.webp
```

`/uploads/...` दिखे तो keys सही नहीं लगीं.

### 🔥 असली test

1. तस्वीर upload करें → **Publish**
2. Render → **Manual Deploy** → **Deploy latest commit**
3. Deploy के बाद site खोलें → **तस्वीर अब भी दिखनी चाहिए** ✅

पहले यहीं मिट जाती थी.

---

## क्या-क्या अपने आप होता है

| | |
|---|---|
| आकार | 1600px तक सीमित (बड़ी तस्वीरें अपने आप छोटी) |
| Format | WebP/AVIF — browser जो सपोर्ट करे |
| Quality | `auto:good` — अच्छी दिखे, हल्की रहे |
| CDN | दुनिया भर में तेज़ delivery |
| हटाना | admin से delete करें → Cloudinary से भी हट जाती है |

`sharp` वाली local processing अब नहीं चलती — Cloudinary बेहतर करता है.

---

## ज़रूरी बातें

**पुरानी तस्वीरें** — जो पहले upload हुई थीं वो मिट चुकी हैं. दोबारा upload
करनी होंगी. अब की सब सुरक्षित रहेंगी.

**Keys न डालें तो?** कुछ नहीं टूटेगा — app पहले की तरह local disk इस्तेमाल
करेगा (और तस्वीरें redeploy पर मिटती रहेंगी).

**Quota** — 25 credits/महीना एक restaurant site के लिए बहुत है.
Cloudinary dashboard पर usage दिख जाता है.

---

## दिक़्क़त आए तो

| समस्या | हल |
|---|---|
| "Image upload failed" | तीनों keys दोबारा जाँचें (Secret सबसे आम ग़लती) |
| URL अब भी `/uploads/` | keys save नहीं हुईं या deploy नहीं हुआ |
| Card माँगा | रुकें, मुझे बताएँ |

Render → **Logs** में `[upload] Cloudinary upload failed:` ढूँढें — असली कारण
वहीं लिखा होगा. मुझे भेज दीजिए.
