# Step 1B — अपना Data Turso में डालें

**समय: ~10 मिनट**

आपके **11 dishes, 9 gallery images, 5 reviews, 21 settings** और नेपाली
translations — सब Turso में भेजने हैं।

---

## 📄 File तैयार है

मैंने आपके लिए दो versions बनाए हैं:

| File | Size | कब इस्तेमाल करें |
|---|---|---|
| **`sutra-dump-slim.sql`** | **56 KB** (386 lines) | ⭐ **यही इस्तेमाल करें** — छोटी, paste करने लायक |
| `sutra-dump.sql` | 531 KB | पूरी history के साथ (CLI से import करें तो) |

**slim में क्या नहीं है?** सिर्फ़ `revisions` (पुराने edits का record) और
`security_events` (login log). आपका असली content — dishes, photos, reviews,
settings, नेपाली अनुवाद — **सब मौजूद है** ✅

मैंने test किया: restore करने पर 11 dishes, 9 gallery, 5 reviews, फ़ोन
`057-522111`, पता, और `सुत्र फ्युजन म:म प्लेटर` — सब सही आया, integrity `ok` ✅

---

## तरीक़ा A — Turso Dashboard से (बिना कुछ install किए) ⭐

फ़ोन पर भी हो जाएगा।

1. Turso dashboard → अपना **`sutra-lounge`** database खोलें
2. **SQL Console** / **Shell** / **Query** tab ढूँढें
3. `sutra-dump-slim.sql` की **पूरी सामग्री** copy करें
4. Console में paste करें → **Run** दबाएँ
5. 10-20 सेकंड लगेंगे

> 📱 **फ़ोन से file कैसे copy करें?** नीचे "File कैसे पाएँ" देखें।
>
> ⚠️ अगर console एक बार में इतना बड़ा input न ले, तो **तरीक़ा B** इस्तेमाल करें।

---

## तरीक़ा B — CLI से (सबसे भरोसेमंद)

Computer हो तो यह सबसे आसान है:

```bash
# Turso CLI install (एक बार)
curl -sSfL https://get.tur.so/install.sh | bash      # Mac/Linux
# Windows PowerShell:  irm get.tur.so/install.ps1 | iex

turso auth login
turso db shell sutra-lounge < sutra-dump-slim.sql
```

---

## तरीक़ा C — कुछ मत करें (सबसे आसान) 😌

**Import छोड़ भी सकते हैं!**

Turso खाली रहेगा और app पहली बार चलते ही **demo content ख़ुद बना देगा** —
11 dishes, gallery, opening hours, सब कुछ नेपाली अनुवाद के साथ।

फिर admin panel से आराम से असली content भर लीजिएगा।

| | Import करें | न करें |
|---|---|---|
| आपका मौजूदा content | ✅ बच जाएगा | ❌ फिर से भरना होगा |
| असली फ़ोन/पता | ✅ पहले से सही | ⚠️ admin से डालना होगा |
| नेपाली अनुवाद | ✅ तैयार | ⚠️ demo वाले आएँगे |
| मेहनत | 10 मिनट अभी | बाद में ज़्यादा |

**सलाह:** import कर लें — आपकी की हुई मेहनत बच जाएगी।

---

## 📥 File कैसे पाएँ

File इस sandbox में है, आपके फ़ोन में नहीं। इसे पाने के तरीक़े:

**सबसे आसान:** मुझसे कहिए *"file का content दिखाओ"* — मैं chat में print कर
दूँगा, आप copy कर लीजिएगा।

**या** अपने computer पर repo clone करके ख़ुद बना लें:
```bash
git clone -b arena/01a00549-sutra-longue-htd \
  https://github.com/sahaniyogesh471/Sutra-longue-htd-.git
cd Sutra-longue-htd-
npm install
node scripts/make-turso-dump.mjs --slim
```

> 🔒 Dump file git में commit **नहीं** होती — उसमें आपका admin password hash
> है। इसलिए इसे repo से download नहीं कर सकते, बनाना पड़ेगा।

---

## ✅ जाँचें कि data पहुँचा

Turso के SQL console में चलाएँ:

```sql
SELECT COUNT(*) FROM dishes;
```

**`11`** आना चाहिए ✅

```sql
SELECT value FROM settings WHERE key='contact.phone';
```

**`057-522111`** आना चाहिए ✅

---

## अगला कदम

Data पहुँच जाए (या तरीक़ा C चुनें) तो → **Step 2: Render deploy**
(`TURSO_RENDER_SETUP.md`)

वहाँ आपके URL + Token इस्तेमाल होंगे।
