# 🚀 Phase 1 — Website को Internet पर Live करें

इसे screen पर खुला रखें और एक-एक step follow करें.
**समय: ~30 मिनट · खर्च: ₹0**

आज हम site को **server IP** पर live करेंगे. `.com.np` domain बाद में जोड़ेंगे
(उसकी approval में 1-3 दिन लगते हैं).

---

## ✍️ पहले ये लिख लें (भरते जाइए)

```
Server IP        : ______________________
SSH key file     : ______________________
Admin password   : ______________________   ← script एक बार दिखाएगी
Recovery code    : ____                     ← 4 अंक, कभी नहीं बदलेगा
```

---

## Step 1 — Oracle Cloud account (10 मिनट)

1. खोलें: **<https://signup.cloud.oracle.com>**
2. Country: **Nepal** · नाम और email भरें · email verify करें
3. ⚠️ **Home Region: `India South (Hyderabad)` या `India West (Mumbai)` चुनें**
   — Nepal से सबसे तेज़. **यह बाद में बदल नहीं सकते.**
4. Address, phone → SMS से verify
5. Card डालें — सिर्फ identity verification के लिए. Always Free पर कभी charge
   नहीं होता. (~$1 का temporary hold आ सकता है, वापस हो जाता है)
6. "Your account is ready" email का इंतज़ार करें

> ⏳ कुछ मिनट से लेकर कुछ घंटे लग सकते हैं. Email आने तक रुकें.

---

## Step 2 — Server (VM) बनाएँ (5 मिनट)

1. Login: <https://cloud.oracle.com>
2. ☰ Menu → **Compute** → **Instances** → **Create instance**
3. **Name:** `sutra-lounge`
4. **Image and shape** → *Edit* पर click:
   - **Image** → *Change image* → **Canonical Ubuntu** → **24.04** → Select
   - **Shape** → *Change shape* → **Ampere** tab → `VM.Standard.A1.Flex`
   - **OCPUs: 2** · **Memory: 12 GB**

   > ⚠️ **2 OCPU / 12 GB से ज़्यादा मत लें.** Oracle ने 18 अगस्त 2026 को free
   > limit आधी कर दी (पहले 4/24 थी). ज़्यादा लेने पर पैसे लगेंगे.
   >
   > 🔄 **"Out of host capacity" error आए?** (आम बात है) — तो **AMD** tab →
   > `VM.Standard.E2.1.Micro` चुनें. वो भी free है और इस site के लिए काफ़ी है.
   > या कुछ घंटे बाद ARM दोबारा try करें.

5. **Networking:** default रहने दें · **Assign a public IPv4 address = Yes** ज़रूर हो
6. **Add SSH keys** → **Generate a key pair for me** → **Save private key** click करें
   🔑 **यह file संभालकर रखें — दोबारा download नहीं होगी!**
7. **Create** दबाएँ → ~1 मिनट में state **RUNNING** हो जाएगा
8. 📋 **Public IP address copy करके ऊपर लिख लें**

---

## Step 3 — Ports 80 और 443 खोलें (5 मिनट)

Oracle default में web traffic block करता है. **यह step सबसे ज़्यादा लोग भूलते हैं.**

1. अपने instance page पर *Instance details* में **Subnet** link पर click
2. **Security List** खोलें (आमतौर पर "Default Security List for vcn-…")
3. **Add Ingress Rules** → ये दो rules बनाएँ:

   | Field | Rule 1 | Rule 2 |
   |---|---|---|
   | Stateless | ☐ unchecked | ☐ unchecked |
   | Source Type | CIDR | CIDR |
   | Source CIDR | `0.0.0.0/0` | `0.0.0.0/0` |
   | IP Protocol | TCP | TCP |
   | **Source Port Range** | **खाली छोड़ें** ⚠️ | **खाली छोड़ें** ⚠️ |
   | Destination Port Range | `80` | `443` |

   > ⚠️ **Source Port Range खाली ही रखें.** इसमें कुछ भी भरने पर traffic चुपचाप
   > block हो जाता है — बहुत common गलती है.

4. **Add Ingress Rules** दबाएँ

---

## Step 4 — Server से connect करें (2 मिनट)

जो private key Step 2 में download की थी, उससे:

**Mac / Linux:**
```bash
chmod 600 ~/Downloads/ssh-key-*.key
ssh -i ~/Downloads/ssh-key-*.key ubuntu@YOUR_SERVER_IP
```

**Windows (PowerShell):**
```powershell
ssh -i C:\Users\YOU\Downloads\ssh-key-2026-08-20.key ubuntu@YOUR_SERVER_IP
```

पहली बार `yes` टाइप करें. `ubuntu@sutra-lounge:~$` दिखे तो सफल ✅

<details>
<summary>❌ SSH problem?</summary>

- **"Permissions 0644 too open"** → ऊपर वाली `chmod 600` command चलाएँ.
  Windows: key file → right-click → Properties → Security → Advanced →
  *Disable inheritance* → अपने account के अलावा सब remove करें
- **Timeout** → instance RUNNING है? *Public* IP use कर रहे हैं (private नहीं)?
- **"Permission denied (publickey)"** → username `ubuntu` ही होना चाहिए
  (`root` या `opc` नहीं)
</details>

---

## Step 5 — Website install करें (5 मिनट)

Server पर ये **तीन commands** एक-एक करके चलाएँ:

```bash
sudo apt-get update && sudo apt-get install -y git
```

```bash
sudo git clone --branch arena/01a00549-sutra-longue-htd \
  https://github.com/sahaniyogesh471/Sutra-longue-htd-.git /opt/sutra-lounge
```

```bash
sudo bash /opt/sutra-lounge/deploy/setup-vps.sh \
  https://github.com/sahaniyogesh471/Sutra-longue-htd-.git \
  arena/01a00549-sutra-longue-htd
```

3-5 मिनट लगेंगे. Script खुद-ब-खुद ये सब करेगी:

- Node.js 22, nginx, certbot, SQLite install
- Website build
- मज़बूत `SESSION_SECRET`, admin password, recovery code generate
- Restricted `sutra` user + hardened systemd service (reboot पर auto-start)
- nginx reverse proxy setup
- **छुपे हुए iptables firewall में ports 80/443 खोलना** (Oracle की खास समस्या)
- Health check चलाकर result दिखाना

आख़िर में ऐसा box दिखेगा — **तुरंत copy करके सुरक्षित जगह लिखें**:

```
############################################################
  ADMIN LOGIN
    URL:      http://123.45.67.89/admin
    username: admin
    password: xY9k...                    ← सिर्फ एक बार दिखेगा
    recovery code (PERMANENT, 4 digits): 4821
############################################################
```

> 🔑 **Recovery code कभी बदला नहीं जा सकता.** Password के साथ संभालकर रखें.

---

## Step 6 — Check करें कि सब चल रहा है (2 मिनट)

Browser में खोलें: **`http://YOUR_SERVER_IP`**

- [ ] Homepage खुलता है
- [ ] `http://YOUR_SERVER_IP/menu.html` — menu दिखता है
- [ ] `http://YOUR_SERVER_IP/admin` — admin login हो जाता है
- [ ] `http://YOUR_SERVER_IP/api/health` — `{"ok":true,...}` दिखता है
- [ ] नेपाली ↔ English switch काम करता है
- [ ] मोबाइल पर भी खोलकर देखें

### 🎉 यहाँ तक पहुँच गए = **आपकी website internet पर LIVE है!**

<details>
<summary>❌ Website नहीं खुल रही?</summary>

Server पर ये चलाएँ:

```bash
systemctl status sutra-lounge      # app चल रहा है?
journalctl -u sutra-lounge -n 50   # errors देखें
curl -I http://127.0.0.1:4173/     # app locally जवाब देता है?
curl -I http://127.0.0.1/          # nginx locally जवाब देता है?
```

- **दोनों curl locally चलते हैं पर browser में timeout** → Step 3 का ingress
  rule missing है, या उसमें *Source Port Range* भर दिया है
- **पहला curl चला, दूसरा नहीं** → `sudo nginx -t && sudo systemctl restart nginx`
- **app ही नहीं चल रहा** → `journalctl` का output मुझे भेजें

**कोई भी error हो तो मुझे paste कर दें — मैं ठीक करा दूँगा.**
</details>

---

## Step 7 — Backup चालू करें (3 मिनट) — ज़रूरी!

आपका सारा content SQLite में है. Backup ज़रूर लगाएँ:

```bash
sudo crontab -e
```

(पहली बार editor पूछे तो `1` दबाकर nano चुनें)

सबसे नीचे यह line जोड़ें, फिर `Ctrl+O` → `Enter` → `Ctrl+X`:

```
0 3 * * * /bin/bash /opt/sutra-lounge/deploy/backup.sh
```

अभी एक बार test करें:

```bash
sudo bash /opt/sutra-lounge/deploy/backup.sh
ls -lh /opt/sutra-backups/
```

Automatic OS security updates:

```bash
sudo apt install -y unattended-upgrades
```

---

## Step 8 — Fake reviews हटाएँ ⚠️

Admin panel खोलें: `http://YOUR_SERVER_IP/admin` → **Reviews**

ये 4 demo (नकली) reviews हैं — इन्हें delete करें:
- Rabina Shrestha · Prakash Adhikari · Sunita Gurung · Aayush Shrestha

**Yogesh Sahani वाला असली है — उसे रहने दें.**

फिर **Publish** दबाएँ.

> असली restaurant पर नकली reviews customers को गुमराह करते हैं और Google
> Business Profile पर penalty लग सकती है. **5 नकली से 1 असली review बेहतर है.**

---

## ✅ Phase 1 पूरा!

अब आपकी website:
- 🌐 Internet पर live है
- 💾 Data सुरक्षित है (restart पर कुछ नहीं मिटता)
- 🔒 Hardened server पर चल रही है
- 💰 ₹0/महीना
- 🔄 रोज़ automatic backup

---

## आगे क्या? (जब तैयार हों)

**Phase 2 — `.com.np` domain:**

⚠️ ज़रूरी बात: `.com.np` application में **2 nameservers पहले से** देने पड़ते हैं.
इसलिए क्रम यह रखें:

1. पहले **Cloudflare** पर free signup करें → 2 nameservers मिलेंगे
   (`CLOUDFLARE_SETUP.md` Step 1)
2. फिर **<https://register.com.np>** पर apply करें — वही nameservers डालें
   - चाहिए: citizenship scan + cover letter (+ business registration/PAN अगर
     business के नाम पर)
   - Approval: 1-3 working days
3. Approve होने पर → `CLOUDFLARE_SETUP.md` के बाकी steps → HTTPS + CDN + DDoS
   protection

पूरी जानकारी: `LAUNCH_PLAN.md` · `CLOUDFLARE_SETUP.md` · `WEBSITE_ANALYSIS.md`

---

## रोज़मर्रा के commands

| काम | Command |
|---|---|
| चल रहा है? | `systemctl status sutra-lounge` |
| Live logs | `journalctl -u sutra-lounge -f` |
| Restart | `sudo systemctl restart sutra-lounge` |
| नया code deploy | `sudo bash /opt/sutra-lounge/deploy/update.sh` |
| Manual backup | `sudo bash /opt/sutra-lounge/deploy/backup.sh` |

---

**कहीं भी अटकें तो error message copy करके मुझे भेज दें — मैं साथ में debug करूँगा.**
