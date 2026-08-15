# Sutra Lounge — Production Launch Checklist

Items intentionally deferred until the real production domain is known.
These MUST NOT be implemented with placeholder/fake domains in the pre-production phase.

## Deferred until the final production domain is configured

1. `SITE_URL` production environment variable — set the canonical site URL explicitly.
2. Final canonical domain — verify the canonical URL on every page uses the production host.
3. `www` → non-`www` (or reverse) 301 policy — pick one and enforce it consistently.
4. Production sitemap absolute URL — `sitemap.xml` currently derives the host from each request.
5. Production robots sitemap URL — `robots.txt` Sitemap line derives the host from each request.
6. Production Open Graph URLs — `og:url` / canonical / image URLs are host-derived today.
7. Final HTTPS canonicalization — ensure HTTP→HTTPS and host canonical redirects at the edge/proxy.
8. Google Search Console verification — add the site and verify ownership.
9. Search Console sitemap submission — submit the production `sitemap.xml`.
10. Production-domain canonical testing — crawl the live domain and confirm no duplicate-hosting signals.
11. Production CDN/cache testing — confirm caching/CDN behaviour on the production domain.

## Notes

- The current host-derived URLs are correct for the preview environment.
- Do not hard-code a fake production domain anywhere.
- Re-run the SEO/media/performance verification suite after the domain is configured.
