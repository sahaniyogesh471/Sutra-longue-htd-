# Step 2 — Render पर Deploy करें (आख़िरी कदम!) 🚀

**समय: ~20 मिनट · Card: नहीं चाहिए**

---

## ✅ पहले एक अच्छी ख़बर — Data import की ज़रूरत नहीं

मैंने जाँचा: app के **built-in seed data में आपकी असली Hetauda जानकारी पहले से
मौजूद है**।

| | Seed | आपका DB | |
|---|---|---|---|
| फ़ोन | `057-522111` | `057-522111` | **समान** ✅ |
| पता | Hupra, Hetauda-4 | Hupra, Hetauda-4 | **समान** ✅ |
| नाम | Sutra Lounge | Sutra Lounge | **समान** ✅ |
| नेपाली | सुत्र फ्युजन म:म प्लेटर | वही | **समान** ✅ |
| Dishes | 11 | 11 | **समान** ✅ |
| Opening hours | 7 | 7 | **समान** ✅ |

**फ़र्क़ सिर्फ़ 3 छोटी चीज़ें:** 1 gallery image, 1 review (Yogesh Sahani वाला),
1 setting।

➡️ इसलिए **SQL import का झंझट छोड़ दें**। Turso खाली रहने दें — app पहली बार
चलते ही सब कुछ ख़ुद बना देगा। Yogesh का review बाद में admin panel से 2 मिनट में
जोड़ लीजिएगा।

**यह आपको फ़ोन पर 56 KB paste करने से बचाता है।**

---

## Step 2.1 — Render account (3 मिनट)

1. खोलें: **<https://render.com>**
2. **Get Started** → **Sign in with GitHub**
3. GitHub permission दे दें

> 💳 **Card माँगे तो रुक जाइए** और मुझे बताइए — तब हम Koyeb पर चले जाएँगे
> (वो भी free, no card)। Render का free tier cardless होना चाहिए।

---

## Step 2.2 — Blueprint से deploy (5 मिनट)

1. Dashboard → **New +** → **Blueprint**
2. Repo चुनें: **`sahaniyogesh471/Sutra-longue-htd-`**
   - न दिखे तो **Configure account** → repo access दें
3. Branch: **`arena/01a00549-sutra-longue-htd`**
4. Render `render.yaml` अपने आप पढ़ लेगा → **Apply** दबाएँ

---

## Step 2.3 — 4 Secrets भरें ⭐ सबसे ज़रूरी

Render ये चार माँगेगा:

| Variable | क्या डालें |
|---|---|
| `TURSO_URL` | आपका Turso URL (`libsql://sutra-lounge-...turso.io`) |
| `TURSO_AUTH_TOKEN` | आपका लंबा token |
| `ADMIN_PASSWORD` | **आप जो चाहें** — मज़बूत रखें, लिख लें |
| `ADMIN_RECOVERY_CODE` | **ठीक 4 अंक** (जैसे `4821`) |

> ⚠️ **Recovery code हमेशा के लिए fix हो जाता है** — बदला नहीं जा सकता।
> Password के साथ सुरक्षित जगह लिख लें।
>
> ⚠️ `TURSO_URL` गलत हुआ तो data restart पर मिट जाएगा। ध्यान से paste करें —
> शुरू में `libsql://` ज़रूर हो।

**Create / Apply** दबाएँ → 3-5 मिनट build → आपको URL मिलेगा:
`https://sutra-lounge.onrender.com`

---

## Step 2.4 — सोना बंद करें (5 मिनट) ⭐

Render free 15 मिनट बाद सो जाता है → पहला visitor 30-60 सेकंड रुकेगा।
मुफ़्त में ठीक करें:

1. **<https://uptimerobot.com>** → free signup (कोई card नहीं)
2. **Add New Monitor**:
   - Type: **HTTP(s)**
   - Name: `Sutra Lounge`
   - URL: `https://आपका-app.onrender.com/api/health`
   - Interval: **5 minutes**
3. **Create Monitor**

अब site कभी नहीं सोएगी ✅

---

## Step 2.5 — जाँचें (5 मिनट)

अपना Render URL खोलें:

- [ ] Homepage खुलता है
- [ ] `/menu.html` — 11 dishes दिखते हैं
- [ ] नेपाली ↔ English switch चलता है
- [ ] `/admin` — login होता है (username: `admin`)
- [ ] `/api/health` → `{"ok":true}`
- [ ] मोबाइल पर भी ठीक दिखता है

### 🔥 सबसे ज़रूरी test — Turso सच में काम कर रहा?

1. Admin में login करें → कोई छोटा बदलाव करें → **Publish**
2. Render dashboard → **Manual Deploy** → **Deploy latest commit**
3. Deploy पूरा होने पर site खोलें

**आपका बदलाव अब भी दिखना चाहिए** ✅

- दिख रहा है → 🎉 Turso perfect काम कर रहा है
- गायब हो गया → `TURSO_URL` गलत है, मुझे बताइए

---

## Step 2.6 — असली content भरें (10 मिनट)

Admin panel में:

1. ⚠️ **4 नकली reviews हटाएँ** — Rabina Shrestha, Prakash Adhikari,
   Sunita Gurung, Aayush Shrestha
2. **Yogesh Sahani का असली review जोड़ें** (नेपाली अनुवाद के साथ — form
   माँगेगा)
3. असली food photos upload करें
4. Menu और दाम जाँच लें
5. **Publish** दबाएँ

> 📸 **ध्यान:** Render का disk ephemeral है — admin से upload की तस्वीरें
> redeploy पर मिट जाएँगी (database सुरक्षित है, सिर्फ़ फ़ाइलें)।
> स्थायी हल के लिए Cloudinary (free, no card) जोड़ना होगा — बताइए तो कर दूँ।

---

## 🎉 हो गया!

आपकी website:
- 🌐 Internet पर live
- 💾 Data Turso में सुरक्षित
- 🔒 HTTPS + strong security
- 💰 ₹0/महीना, कोई card नहीं
- ⚡ कभी नहीं सोती

---

## आगे — `.com.np` domain

1. **Cloudflare** पर free signup → 2 nameservers मिलेंगे
2. **<https://register.com.np>** पर apply — वही nameservers डालें
   (चाहिए: citizenship scan + cover letter)
3. Approval 1-3 दिन
4. Render → Settings → **Custom Domain** → अपना domain जोड़ें

---

## 🔧 दिक़्क़त आए तो

| समस्या | हल |
|---|---|
| Build fail | Render → **Logs** → मुझे भेजें |
| Data restart पर मिटता है | `TURSO_URL` जाँचें (`libsql://` से शुरू?) |
| Admin login नहीं | `ADMIN_PASSWORD` पहली बार ही पढ़ा जाता है |
| पहली बार धीमी | UptimeRobot लगाया? |
| Render card माँगे | रुकें → Koyeb पर shift करेंगे |

**कोई भी error copy करके भेज दीजिए।**
