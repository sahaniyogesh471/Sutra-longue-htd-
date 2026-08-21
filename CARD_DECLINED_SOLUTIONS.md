# 💳 Card Declined — क्या करें

Oracle का card decline होना **Nepal/India में बहुत आम** है. आपका card खराब नहीं है —
Oracle का payment system South Asia के cards के साथ बदनाम है.

**दो रास्ते हैं.** पहले Oracle के fixes try करें (15 मिनट). न चले तो Plan B —
जो card माँगता ही नहीं.

---

## 🅰️ पहले ये Oracle fixes try करें

समुदाय में सबसे ज़्यादा काम करने वाले तरीक़े, क्रम से:

### 1. नाम और पता बिल्कुल card जैसा भरें ⭐ सबसे ज़्यादा काम करता है

Oracle असल में card verify नहीं करता — वो **address matching** करता है. एक अक्षर
का फ़र्क़ भी fail कर देता है.

- अपना bank statement या bank app खोलें
- नाम **हूबहू** वैसे ही लिखें जैसे card/statement पर है
  (middle name है तो वो भी, नहीं है तो मत लिखें)
- पता statement से **copy-paste** करें — spelling, capital letters, सब वैसा ही
- State का **short form** लिखें अगर statement में वैसा है

### 2. Debit की जगह Credit card

Oracle आधिकारिक तौर पर कहता है: **debit, prepaid, virtual और single-use cards
स्वीकार नहीं.** असली credit card चाहिए.

- Nepal में: NIC Asia, Nabil, Global IME, Siddhartha के **credit** cards
- Debit card ही है तो अगला step देखें

### 3. Bank को फ़ोन करें — International/Online transaction चालू कराएँ

Nepal के ज़्यादातर cards में **online international transaction default में बंद**
रहता है.

- Bank को कॉल करें या mobile app → Card Settings
- चालू कराएँ: **International transactions** + **Online/E-commerce**
- कुछ banks में 24 घंटे लगते हैं

### 4. Card में balance रखें

Verification के लिए ~$1 का hold लगता है (वापस हो जाता है).
Debit card है तो कम-से-कम **NPR 1,000-2,000** रखें.

### 5. Browser साफ़ करें

- **Incognito/Private window** में try करें
- **सारे extensions बंद करें** (ad blocker सबसे बड़ा culprit)
- **VPN बंद करें** — country और IP mismatch से fail होता है

### 6. Email/phone बदलकर देखें

अगर वो email या phone पहले किसी Oracle account से जुड़ा है तो fail होता है.
नया Gmail + दूसरा नंबर try करें.

### 7. Oracle support से manual verification माँगें

बाक़ी सब fेल हो तो — यह अक्सर काम करता है:

- <https://www.oracle.com/cloud/free/> → Chat/Support
- कहें: *"My card is being declined during Free Tier signup. Could you please
  manually verify my account?"*
- वे manually approve कर देते हैं (1-2 दिन)

> ⚠️ **कभी भी अपने card की details, OTP या bank password किसी को न दें** —
> मुझे भी नहीं. Oracle कभी email/chat पर card number नहीं माँगता.

---

## 🅱️ Plan B — बिना card वाला रास्ता (सिफ़ारिश)

Oracle पर वक़्त बर्बाद न करें. **आज ही website live हो सकती है.**

```
   Render (free, कोई card नहीं)  ←  app चलेगा
              +
   Turso (free, कोई card नहीं)   ←  database
              +
   Cloudflare (free, कोई card नहीं) ← CDN, HTTPS, DDoS सुरक्षा
```

### 🎉 बड़ी खोज — जो मैंने पहले ग़लत बताया था

पहले मैंने कहा था कि Turso के लिए 187 database calls को async करना पड़ेगा —
**यह ग़लत था.** मैंने अभी test किया:

`libsql` package **पूरी तरह synchronous** है और `better-sqlite3` जैसा ही
काम करता है — `.prepare().all()`, `.get()`, `.run()`, `.pragma()`,
`db.transaction()` — सब वैसा ही, बिना किसी `await` के.

**बदलनी पड़ेगी सिर्फ़ 1 line** (`src/db/index.ts` का import).

यह Plan B को बहुत आसान बना देता है.

### तुलना

| | Oracle + Cloudflare | **Render + Turso + Cloudflare** |
|---|---|---|
| Card चाहिए? | ✅ हाँ (problem) | ❌ **नहीं** |
| खर्च | ₹0 | ₹0 |
| Data सुरक्षित? | ✅ | ✅ (Turso managed) |
| Setup समय | 30 मिनट | **20 मिनट** |
| Linux ज्ञान | थोड़ा चाहिए | **कुछ नहीं** |
| Code बदलाव | कुछ नहीं | 1 line + image storage |
| सोता है? | नहीं | ⚠️ 15 मिनट बाद (~50 सेकंड पहली बार) |
| Backup | अपना cron | ✅ अपने आप |

### ⚠️ Render की दो कमियाँ (साफ़-साफ़)

1. **15 मिनट निष्क्रियता पर सो जाता है** — पहला visitor ~50 सेकंड इंतज़ार करेगा.
   *हल:* एक free uptime monitor (UptimeRobot) हर 10 मिनट ping करे → कभी नहीं सोएगा.

2. **Uploaded photos मिट जाती हैं** (ephemeral disk) — database तो Turso में
   सुरक्षित है, पर admin से upload की तस्वीरें restart पर गायब.
   *हल:* Cloudflare R2 (10 GB free, कोई card नहीं) — मुझे थोड़ा code जोड़ना होगा.
   *या:* तस्वीरें `img/` folder में repo के साथ रखें (सबसे आसान, तुरंत).

---

## 🅲 अन्य विकल्प

| Platform | Card? | सोता है? | टिप्पणी |
|---|---|---|---|
| **Render** | ❌ नहीं | हाँ (15 मिन) | सबसे आसान no-card |
| **Railway** | ❌ नहीं | नहीं | $5 credit, फिर ~$2-4/महीना |
| **Koyeb** | ⚠️ कभी-कभी | scale-to-zero | region पर निर्भर |
| **Northflank** | ✅ हाँ | नहीं | card verification चाहिए |
| Oracle | ✅ हाँ | नहीं | सबसे ताक़तवर, पर card की दिक़्क़त |

**Nepal में `.com.np` domain के लिए nameservers चाहिए — Cloudflare तीनों विकल्पों
के साथ काम करता है, तो domain का plan नहीं बदलेगा.**

---

## 💡 मेरी सलाह

**दोनों साथ में करें:**

1. **आज:** Plan B से website live कर दें (~20 मिनट, कोई card नहीं).
   काम शुरू, `.com.np` के लिए nameservers भी मिल जाएँगे.
2. **समानांतर:** Oracle के fixes आराम से try करें. जब चल जाए, चाहें तो
   Oracle पर shift कर लें — deployment scripts पहले से तैयार हैं.

इस तरह आपका काम रुकेगा नहीं.

---

## आगे क्या?

बताइए कौन सा रास्ता:

- **A)** पहले Oracle fixes try करूँगा → ऊपर 🅰️ के steps follow करें
- **B)** Plan B चलाओ (Render + Turso) → मैं code तैयार कर दूँगा
- **C)** दोनों → मैं Plan B सेट करता हूँ, आप Oracle try करते रहें

फ़ोटो के बारे में भी बता दीजिए (Plan B चुनें तो):
- **आसान:** तस्वीरें repo में रखें — तुरंत चालू, admin upload restart पर मिटेगा
- **पूरा हल:** Cloudflare R2 जोड़ूँ — admin upload हमेशा सुरक्षित (थोड़ा और code)
