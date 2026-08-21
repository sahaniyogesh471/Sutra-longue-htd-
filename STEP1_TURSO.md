# Step 1 — Turso का URL और Token कैसे लें

**समय: ~15 मिनट · Card/KYC: कुछ नहीं**

आपको आख़िर में ये दो चीज़ें चाहिए:

```
TURSO_URL        = libsql://sutra-lounge-yourname.turso.io
TURSO_AUTH_TOKEN = eyJhbGciOi... (बहुत लंबा)
```

---

## 1.1 — Account बनाएँ (2 मिनट)

1. खोलें: **<https://turso.tech>**
2. **Sign Up** दबाएँ
3. **Continue with GitHub** चुनें (सबसे आसान — कोई card, कोई KYC नहीं)
4. GitHub permission दे दें

अब आप Turso dashboard में हैं ✅

---

## 1.2 — Database बनाएँ (2 मिनट)

Dashboard में:

1. **Create Database** (या **+ New Database**) दबाएँ
2. **Name:** `sutra-lounge`
3. **Location:** **Singapore (sin)** चुनें — Nepal के सबसे नज़दीक
   *(न दिखे तो Mumbai / `bom` भी ठीक है)*
4. **Create** दबाएँ

10-20 सेकंड में database तैयार ✅

---

## 1.3 — URL और Token लें (3 मिनट)

### तरीक़ा A — Dashboard से (आसान, बिना install) ⭐

1. Dashboard में अपने **`sutra-lounge`** database पर click करें
2. **Connect** (या **Connect to your database**) tab खोलें
3. यहाँ दोनों चीज़ें मिलेंगी:

   - **Database URL** — `libsql://sutra-lounge-xxxx.turso.io` जैसा
     → copy करके `TURSO_URL` में रखें

   - **Auth Token** — **Create Token** / **Generate Token** दबाएँ
     → लंबी string मिलेगी, copy करके `TURSO_AUTH_TOKEN` में रखें

> ⚠️ **Token सिर्फ़ एक बार पूरा दिखता है।** तुरंत copy करके सुरक्षित जगह
> paste कर लें (Notepad में). खो जाए तो नया बना लेना — कोई नुक़सान नहीं।

### तरीक़ा B — CLI से (अगर dashboard में न मिले)

```bash
# install
curl -sSfL https://get.tur.so/install.sh | bash     # Mac/Linux
# Windows PowerShell:  irm get.tur.so/install.ps1 | iex

turso auth login
turso db show sutra-lounge --url        # ← TURSO_URL
turso db tokens create sutra-lounge     # ← TURSO_AUTH_TOKEN
```

---

## 1.4 — अपना data upload करें (5 मिनट)

आपके **11 dishes, 9 gallery images, 5 reviews, 21 settings** — सब Turso में
भेजने हैं।

> ✅ **मैंने आपके लिए dump file पहले से बना दी है** — आपको `sqlite3` install
> करने की ज़रूरत नहीं। File repo में तैयार है: **`sutra-dump.sql`** (531 KB)
>
> मैंने इसे test भी किया: सभी 21 tables, 159 rows, नेपाली text
> (`सुत्र फ्युजन म:म प्लेटर`), फ़ोन `057-522111`, पता — सब सही ✅

### अगर file आपके पास नहीं है, दोबारा बनाएँ:

```bash
# repo folder में
node scripts/make-turso-dump.mjs
```

### Turso में import करें

**तरीक़ा A — Dashboard से:**
Database → **Shell** (या **SQL Console**) tab → `sutra-dump.sql` की
सामग्री paste करके run करें।

**तरीक़ा B — CLI से (ज़्यादा भरोसेमंद, बड़ी file के लिए):**
```bash
turso db shell sutra-lounge < sutra-dump.sql
```

### जाँचें कि data पहुँचा

```bash
turso db shell sutra-lounge "SELECT COUNT(*) FROM dishes;"
```
`11` आना चाहिए ✅

> 💡 **यह step छोड़ भी सकते हैं** — तब Turso खाली रहेगा और app पहली बार
> चलने पर demo content ख़ुद बना देगा। बाद में admin panel से असली content
> भर लीजिएगा। पर dump इस्तेमाल करना बेहतर है — आपकी मेहनत बच जाएगी।

---

## ✅ Step 1 पूरा

अब आपके पास होना चाहिए:

```
TURSO_URL        = libsql://sutra-lounge-______.turso.io
TURSO_AUTH_TOKEN = eyJ______________________ (लंबा)
```

**ये दोनों संभालकर रखें** — Step 2 (Render) में डालने हैं।

---

## 🔧 दिक़्क़त आए तो

| समस्या | हल |
|---|---|
| Dashboard में "Connect" नहीं दिख रहा | database name पर click करें, फिर tabs देखें |
| Token दोबारा चाहिए | नया बना लें — पुराना अपने आप बेकार नहीं होता |
| CLI install नहीं हो रही | तरीक़ा A (dashboard) इस्तेमाल करें, CLI ज़रूरी नहीं |
| Import में error | error message मुझे भेजें |
| Card माँगे | नहीं माँगना चाहिए — तुरंत बताएँ |

---

**अगला:** Step 2 — Render deploy → `TURSO_RENDER_SETUP.md`

URL और token मिल जाएँ तो बता दीजिए, फिर Render साथ में करेंगे।
