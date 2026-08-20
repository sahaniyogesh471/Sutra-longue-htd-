# Free + Secure Hosting Architectures for Sutra Lounge

You suggested splitting the stack across free platforms — frontend on one, backend
on another. That is the right instinct. This document evaluates the realistic
versions of it against the actual codebase.

---

## First: what the code actually is

Facts measured from this repository:

| Fact | Value | Consequence |
|---|---|---|
| Rendering | Server-side (EJS) | 143 template expressions across `index.ejs` + `menu.ejs` |
| DB calls | 187 `.prepare(...)` calls | All **synchronous** `better-sqlite3` |
| Transactions | 7 | Rely on synchronous semantics |
| Client JS | 2,098 lines | Progressive enhancement, not a SPA |
| State | SQLite file + `data/uploads` images | Needs persistence |

**There is no separate "frontend" to deploy.** The pages *are* the backend — HTML
is generated on the server from the database on each request. This matters for
the next section.

---

## The trap: "static frontend on Vercel + backend elsewhere"

The tempting version of your idea is: put the frontend on Vercel/Netlify/Cloudflare
Pages (excellent free tiers) and the backend somewhere else.

For **this** app that would mean:

- Rewriting all 143 EJS expressions into a client-side framework, **or** into a
  new framework's SSR — effectively a frontend rewrite
- Losing the current server-rendered SEO unless the rewrite is carefully SSR'd
  (the repo has had extensive SEO work — see `SEO.txt`, `docs/`)
- Adding CORS, a public JSON API surface, and a second deploy pipeline
- **More attack surface, not less** — the admin API becomes publicly reachable
  cross-origin

Cost: days of work and real regression risk, to solve a problem that has a
zero-code solution. **Not recommended.**

> The split-frontend pattern is genuinely great — for SPAs and for greenfield
> projects. It is a poor fit for an existing server-rendered app that already
> works.

---

## The good version of your idea: split the **state**, not the frontend

The actual problem with free hosting was never the frontend. It was this:

> Free compute platforms have **ephemeral disks** — so the SQLite file and
> uploaded images get wiped on restart.

So separate the *stateful* parts onto free managed services, and the compute
layer becomes disposable. Then any free host works.

```
        ┌──────────────────────┐
        │  Cloudflare (free)   │  CDN, SSL, DDoS, hides origin
        └──────────┬───────────┘
                   │
        ┌──────────▼───────────┐
        │   App server (free)  │  stateless → safe to restart
        └─────┬──────────┬─────┘
              │          │
   ┌──────────▼──┐   ┌───▼─────────────┐
   │ Turso (free)│   │ Cloudflare R2   │
   │ SQLite/libSQL│   │ (free) images   │
   └─────────────┘   └─────────────────┘
```

**Free tiers (verified Aug 2026):**
- **Turso** — 5 GB storage, 500M row reads/mo, no credit card. It *is* SQLite
  (libSQL fork), so the schema and SQL port over unchanged.
- **Cloudflare R2** — 10 GB storage, **zero egress fees**, permanent, no card.
- **Cloudflare CDN/SSL/DDoS** — $0 forever.

**The catch:** Turso's client is **async**. All 187 synchronous `.prepare().get()`
calls and 7 transactions would need `await`. That is a mechanical but wide-reaching
refactor — roughly a day of careful work plus re-testing every admin flow.

---

## Comparison of realistic options

| # | Architecture | Cost | Data safe | Code changes | Effort |
|---|---|---|---|---|---|
| **A** | **Oracle VM + Cloudflare** | $0 | ✅ | **None** | 45 min |
| B | Render Free + Turso + R2 | $0 | ✅ | 187 calls → async | ~1 day |
| C | Oracle VM + Turso + R2 + Cloudflare | $0 | ✅✅ | 187 calls → async | ~1 day |
| D | Static frontend split (Vercel + API) | $0 | ✅ | Frontend rewrite | Days ⚠️ |
| E | Oracle VM alone (current guide) | $0 | ✅ | None | 30 min |

---

## Recommendation: Option A — Oracle VM + Cloudflare in front

This **is** your idea, correctly applied: a best-in-class free edge/frontend
platform (Cloudflare) in front of a free persistent backend (Oracle). It just
splits at the *network* layer instead of the code layer — so it needs **zero code
changes**.

What Cloudflare's free plan adds on top of the Oracle setup:

| Benefit | Effect |
|---|---|
| Global CDN | Static assets cached at the edge — fast in Nepal, India, worldwide |
| Free SSL | No certbot renewals to manage |
| **Hides your origin IP** | Attackers cannot reach the VM directly |
| Unmetered DDoS protection | Enterprise-grade, $0 |
| WAF custom rules (5 free) | e.g. rate-limit or geo-block `/admin` |
| Always Online | Cached pages still served if the VM reboots |
| Analytics | Traffic stats without adding a tracker |

**This is strictly better than Option E, costs nothing, and takes ~15 extra minutes.**
Setup steps are in `CLOUDFLARE_SETUP.md`.

### Why not Option B (Render Free + Turso + R2)?

It is a legitimately good architecture, but for this app:

- Render Free **sleeps after 15 min** of inactivity → ~1 min cold start. Bad for a
  restaurant site someone finds on Google.
- Requires the async refactor.
- Three vendors' free tiers to monitor instead of one.

Oracle's VM does not sleep, and keeps everything in one place.

---

## When to revisit

Move to **Option C** (add Turso + R2 to the Oracle VM) if any of these become true:

- You want zero-maintenance managed backups instead of the cron job
- Traffic grows enough that you want multiple app servers
- You want to redeploy freely without ever thinking about the data volume

At that point the async refactor is worth doing. Today it is not — the Oracle VM
already gives you persistent, secure, free hosting.

---

## Verdict

> **Your instinct was correct: use a free edge platform in front of a free backend.**
> Apply it at the network layer (Cloudflare → Oracle), not by rewriting the
> frontend. Same benefits, zero risk, 15 minutes.
