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

## तरीक़ा A — Turso Dashboard से (सबसे आसान) ⭐

फ़ोन से भी हो जाता है, कुछ install नहीं करना.

### Step 1 — यह query चलाएँ

Turso → आपका database → **SQL Console** → यह पूरा paste करके **Run**:

```
SELECT 'INSERT INTO settings (key,value,updated_at) VALUES (' || quote("key") || ',' || quote("value") || ',' || quote("updated_at") || ');' AS sql_line FROM settings UNION ALL SELECT 'INSERT INTO dishes (id,type,name,description,price,category,badge,image_url,is_featured,is_visible,sort_order,created_at,updated_at,name_np,description_np,category_np,badge_np) VALUES (' || quote("id") || ',' || quote("type") || ',' || quote("name") || ',' || quote("description") || ',' || quote("price") || ',' || quote("category") || ',' || quote("badge") || ',' || quote("image_url") || ',' || quote("is_featured") || ',' || quote("is_visible") || ',' || quote("sort_order") || ',' || quote("created_at") || ',' || quote("updated_at") || ',' || quote("name_np") || ',' || quote("description_np") || ',' || quote("category_np") || ',' || quote("badge_np") || ');' FROM dishes UNION ALL SELECT 'INSERT INTO gallery (id,image_url,alt,is_featured,is_visible,sort_order,created_at,updated_at) VALUES (' || quote("id") || ',' || quote("image_url") || ',' || quote("alt") || ',' || quote("is_featured") || ',' || quote("is_visible") || ',' || quote("sort_order") || ',' || quote("created_at") || ',' || quote("updated_at") || ');' FROM gallery UNION ALL SELECT 'INSERT INTO reviews (id,name,text,rating,image_url,is_visible,sort_order,created_at,updated_at,name_np,text_np) VALUES (' || quote("id") || ',' || quote("name") || ',' || quote("text") || ',' || quote("rating") || ',' || quote("image_url") || ',' || quote("is_visible") || ',' || quote("sort_order") || ',' || quote("created_at") || ',' || quote("updated_at") || ',' || quote("name_np") || ',' || quote("text_np") || ');' FROM reviews UNION ALL SELECT 'INSERT INTO opening_hours (day_index,day_name,is_open,open_time,close_time,updated_at) VALUES (' || quote("day_index") || ',' || quote("day_name") || ',' || quote("is_open") || ',' || quote("open_time") || ',' || quote("close_time") || ',' || quote("updated_at") || ');' FROM opening_hours;
```

### Step 2 — नतीजा सुरक्षित रखें

लगभग **53 lines** दिखेंगी — हर line एक `INSERT INTO ...` statement.

सब copy करके सुरक्षित जगह रखें:
- Google Drive में एक text file
- या अपने आप को email कर दें
- नाम: `sutra-backup-2026-08-22.txt` (तारीख़ के साथ)

**बस — backup हो गया** ✅

---

## तरीक़ा B — Computer से (एक command)

Node.js वाला computer हो तो:

```bash
TURSO_URL="आपका-url" TURSO_AUTH_TOKEN="आपका-token" \
  node scripts/backup-turso.mjs
```

`sutra-backup-YYYY-MM-DD.sql` file बन जाएगी.

---

## 🔄 Restore कैसे करें (अगर कुछ बिगड़ जाए)

1. Turso → **SQL Console**
2. पहले पुराना हटाएँ (एक-एक line, अलग-अलग Run):
   ```
   DELETE FROM settings;
   ```
   ```
   DELETE FROM dishes;
   ```
   ```
   DELETE FROM gallery;
   ```
   ```
   DELETE FROM reviews;
   ```
   ```
   DELETE FROM opening_hours;
   ```
3. फिर अपनी backup file की सारी lines paste करके **Run**
4. Render → **Manual Deploy** (ताज़ा data दिखाने के लिए)

> ✅ मैंने यह restore test किया है — settings 21, dishes 11, gallery 9,
> reviews 5, hours 7, नेपाली text और फ़ोन नंबर सब सही आए, integrity `ok`.

---

## ⚠️ ध्यान रखें

**Copy करते वक़्त line numbers न आएँ** — सिर्फ़ SQL text चाहिए.
(पहले यही ग़लती से error आया था.)

**Backup में क्या नहीं है:** admin password, sessions — जान-बूझकर छोड़े गए हैं
ताकि file सुरक्षित रहे. Password Render के environment variables में है.

**तस्वीरें:** Cloudinary पर अलग सुरक्षित हैं, backup में नहीं चाहिए.

---

## 📅 सुझाव

| कब | क्या |
|---|---|
| महीने में एक बार | Backup लें |
| बड़ा बदलाव करने से पहले | Backup लें |
| 3 पुराने backup रखें | पुराने हटा दें |
