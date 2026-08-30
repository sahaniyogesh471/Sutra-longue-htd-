# 🚀 आज Live करें — Turso + Render (कोई Card नहीं)

**समय: ~1 घंटा · खर्च: ₹0 · Card/KYC: कुछ नहीं चाहिए**

Code तैयार है ✅ — अब सिर्फ़ accounts बनाकर deploy करना है।

---

## ✍️ ये लिखते जाइए

```
Turso database URL : libsql://__________________
Turso auth token   : __________________ (बहुत लंबा)
Render URL         : https://__________.onrender.com
Admin password     : __________________ (आप चुनेंगे)
Recovery code      : ____ (4 अंक, कभी नहीं बदलेगा)
```

---

## Step 1 — Turso database बनाएँ (15 मिनट)

Turso आपका database है — Render restart हो तो भी data सुरक्षित रहेगा।

### 1.1 Account बनाएँ
1. खोलें: **<https://turso.tech>** → **Sign Up**
2. **GitHub से sign in करें** (सबसे आसान) — कोई card नहीं माँगेगा

### 1.2 CLI install करें

अपने **computer** पर (server पर नहीं):

**Mac / Linux:**
```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

**Windows:** PowerShell में —
```powershell
irm get.tur.so/install.ps1 | iex
```
(या WSL में Linux वाली command)

### 1.3 Login और database बनाएँ

```bash
turso auth login
turso db create sutra-lounge --location sin
```

`sin` = Singapore (Nepal के नज़दीक). Mumbai के लिए `bom` भी चल सकता है।

### 1.4 अपना मौजूदा data upload करें ⭐ ज़रूरी

आपके 11 dishes, 9 gallery images, settings — सब बचाने के लिए:

```bash
# इस repo के folder में जाएँ, फिर:
sqlite3 data/sutra.db .dump > sutra-dump.sql
turso db shell sutra-lounge < sutra-dump.sql
```

> `sqlite3` न हो तो: Mac `brew install sqlite3` · Ubuntu `sudo apt install sqlite3`
> · Windows: <https://sqlite.org/download.html>
>
> **या छोड़ भी सकते हैं** — तब Turso खाली रहेगा और app पहली बार चलने पर
> demo content अपने आप बना देगा। बाद में admin से असली content भर लीजिए।

### 1.5 URL और token लें

```bash
turso db show sutra-lounge --url
turso db tokens create sutra-lounge
```

दोनों copy करके ऊपर लिख लें। **Token बहुत लंबा है — पूरा copy करें।**

---

## Step 2 — Render पर deploy करें (20 मिनट)

### 2.1 Account
1. खोलें: **<https://render.com>** → **Get Started**
2. **GitHub से sign up करें** — free tier के लिए card नहीं चाहिए

> 💳 अगर Render card माँगे तो रुकिए और मुझे बताइए — मेरी research में यह
> cardless था, पर policies बदलती रहती हैं। तब हम Koyeb पर चले जाएँगे।

### 2.2 Blueprint से deploy
1. Dashboard → **New +** → **Blueprint**
2. अपनी repo चुनें: `sahaniyogesh471/Sutra-longue-htd-`
3. Branch: **`arena/01a00549-sutra-longue-htd`**
4. Render `render.yaml` अपने आप पढ़ लेगा

### 2.3 Secrets भरें

Render 4 चीज़ें पूछेगा:

| Variable | क्या डालें |
|---|---|
| `TURSO_URL` | Step 1.5 वाला URL (`libsql://...`) |
| `TURSO_AUTH_TOKEN` | Step 1.5 वाला लंबा token |
| `ADMIN_PASSWORD` | मज़बूत password जो आप चुनें |
| `ADMIN_RECOVERY_CODE` | **ठीक 4 अंक** (जैसे `4821`) — कभी नहीं बदलेगा |

> ⚠️ Recovery code **हमेशा के लिए fix** हो जाता है। Password के साथ संभालकर रखें।

### 2.4 Deploy
**Apply** दबाएँ → 3-5 मिनट में build होगा → URL मिलेगा:
`https://sutra-lounge.onrender.com`

---

## Step 3 — सोना बंद करें (5 मिनट) ⭐ ज़रूरी

Render free 15 मिनट बाद सो जाता है → पहला visitor 30-60 सेकंड रुकेगा।
यह मुफ़्त में ठीक हो जाता है:

1. खोलें: **<https://uptimerobot.com>** → free signup (कोई card नहीं)
2. **Add New Monitor**:
   - Type: **HTTP(s)**
   - Name: `Sutra Lounge`
   - URL: `https://आपका-app.onrender.com/api/ready`
   - Interval: **5 minutes**
3. **Alert Contacts** में अपना email चुनें → Save

अब site कभी नहीं सोएगी — हमेशा तेज़ खुलेगी।

### ⚠️ `/api/ready` ही रखें, `/api/health` नहीं

दोनों endpoint अलग काम के लिए हैं:

| Endpoint | कौन इस्तेमाल करता है | क्या जाँचता है |
|---|---|---|
| `/api/health` | **Render** (healthCheckPath) | सिर्फ़ यह कि process चल रहा है |
| `/api/ready` | **UptimeRobot** (आप) | database भी चल रहा है या नहीं |

`/api/health` जान-बूझकर database को नहीं छूता — अगर वह fail होता तो Render
deploy को टूटा हुआ मानकर service को बार-बार restart करता रहता, और एक ठीक होने
लायक database problem पूरा outage बन जाती।

इसीलिए monitor **`/api/ready`** पर लगाएँ। एक बार site चल रही थी पर हर page 500
दे रहा था, और `/api/health` हरा दिखता रहा — किसी को पता ही नहीं चला।
`/api/ready` उस हालत में `503` देता है और आपको तुरंत email आ जाता है।

---

## Step 4 — जाँचें (5 मिनट)

अपना Render URL खोलें:

- [ ] Homepage खुलता है
- [ ] `/menu.html` — menu दिखता है
- [ ] `/admin` — login हो जाता है (username `admin`)
- [ ] `/api/health` — `{"ok":true,...}`
- [ ] `/api/ready` — `{"ok":true,"database":"ok",...}` (यह database भी जाँचता है)
- [ ] नेपाली ↔ English switch चलता है
- [ ] मोबाइल पर देखें

### 🔥 सबसे ज़रूरी test — data बचता है या नहीं?

1. Admin में कोई भी छोटा बदलाव करें (जैसे tagline) → **Publish**
2. Render dashboard → **Manual Deploy** → **Clear build cache & deploy**
3. Deploy पूरा होने पर site खोलें → **आपका बदलाव अब भी दिखना चाहिए** ✅

यह साबित करता है कि Turso काम कर रहा है। अगर बदलाव गायब हो जाए तो
`TURSO_URL` सही से set नहीं हुआ — मुझे बताइए।

---

## Step 5 — नकली reviews हटाएँ ⚠️

Admin → **Reviews** → ये 4 demo reviews delete करें:

- Rabina Shrestha · Prakash Adhikari · Sunita Gurung · Aayush Shrestha

**Yogesh Sahani वाला असली है — रहने दें।** फिर **Publish** दबाएँ।

---

## ✅ हो गया!

आपकी website:
- 🌐 Internet पर live
- 💾 Data सुरक्षित (Turso में)
- 🔒 HTTPS + hardened security
- 💰 ₹0/महीना, कोई card नहीं
- ⚡ कभी नहीं सोती

---

## आगे (जब चाहें)

**`.com.np` domain:**
1. **Cloudflare** पर free signup → 2 nameservers मिलेंगे
2. **<https://register.com.np>** पर apply — वही nameservers डालें
   (चाहिए: citizenship scan + cover letter)
3. Approval 1-3 दिन → फिर Render में custom domain जोड़ें

**Photos:** अभी admin से upload की तस्वीरें restart पर मिट जाएँगी
(Render का disk ephemeral है)। Cloudinary (free, no card) से यह पक्का हो
जाएगा — बताइए तो जोड़ दूँ।

---

## 🔧 कुछ गड़बड़ हो तो

| समस्या | हल |
|---|---|
| Build fail | Render → **Logs** देखें, मुझे भेजें |
| Site खुलती है पर data नहीं | `TURSO_URL` / `TURSO_AUTH_TOKEN` जाँचें |
| Admin login नहीं होता | `ADMIN_PASSWORD` set है? पहली बार ही पढ़ा जाता है |
| पहली बार धीमी | UptimeRobot लगाया? (Step 3) |
| Render card माँगे | रुकें — मुझे बताएँ, Koyeb पर shift करेंगे |

**कोई भी error copy करके मुझे भेज दीजिए — साथ में ठीक करेंगे।**

---

## 🔬 Code में क्या बदला (आपकी जानकारी के लिए)

- `better-sqlite3` → **`libsql`** (सिर्फ़ 1 import)
- `TURSO_URL` set हो तो remote Turso, वरना local file — दोनों चलते हैं
- **Verified:** typecheck 0 errors · सब pages 200 · admin login ✅ ·
  `/admin/api/publish` transaction ✅ · seeding ✅ · Render का `PORT` ✅
