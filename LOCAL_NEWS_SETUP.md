# Local Ghana News Integration

Your News tab now blends global headlines (NewsAPI) with high‑quality Ghana local sources via RSS aggregation:

Sources Included:
- GhanaWeb
- MyJoyOnline
- ModernGhana
- YEN.com.gh
- Ghanaian Times

## How It Works
1. On hybrid feed load (`For You`), the app fetches:
   - Primary country top headlines (NewsAPI)
   - Secondary countries (NewsAPI)
   - Local Ghana RSS articles from curated sources (≈40% of primary slice)
2. Local articles are normalized (title, summary, image, published date) and boosted ahead of non‑local Ghana items.
3. Muted sources (if you mute one later) are filtered before personalization re‑ranking.
4. Favorite categories still apply after local boost.

## Data Fields Extracted
Each local RSS article stores:
- `title`
- `summary` (cleaned HTML description, truncated ~320 chars)
- `url` (original link)
- `urlToImage` (best effort; enclosure/media/img tag fallback or global default)
- `publishedAt`
- `source` (id, name, logo, site URL)
- `isLocal = true`, `sourceType = rss`
- Engagement counters are synthetic placeholders for UI consistency (no scraping of proprietary metrics)

## Content & Copyright
- Full article text is NOT replicated; only summary/excerpt is shown.
- User can tap through to read the full article at the original publisher (`Read Full Article`).
- This approach respects publisher rights while still improving local relevance.

## Reliability & Fallbacks
- Multiple candidate RSS URLs per source; first successful one is used.
- If all RSS endpoints for a source fail, that source is skipped for this cycle.
- Timeouts (7–8s) prevent UI hangs on slow feeds.
- Missing images fall back to a neutral Unsplash placeholder.

## Performance
- Parsed in‑app currently (client side). For scale, move to a server/edge function to pre‑aggregate & cache.
- Sorting blends recency + local boost + favorites.

## Future Enhancements
- Edge function to cache and deduplicate across users.
- NLP summarization for cleaner, uniform abstracts.
- Tag extraction and topic clustering.
- Real engagement metrics if publishers expose safe public APIs.

## Troubleshooting
| Issue | Cause | Mitigation |
|-------|-------|------------|
| Local articles missing | RSS endpoint changed | Update `GHANA_LOCAL_SOURCES` entry |
| Repeated duplicates | Same story across multiple sources | URL-based de‑duplication already applied; consider fuzzy title match next |
| Images broken | Site changed markup | Enhance `extractImage` with more heuristics |
| Slow feed load | Network latency | Migrate fetch to edge function with scheduled refresh |

## Config File Reference
See `lib/constants/news.ts` for `GHANA_LOCAL_SOURCES` definitions.

---
If you need to add a new Ghana source, append it to `GHANA_LOCAL_SOURCES` with `id`, `name`, `siteUrl`, `logo`, and an array of candidate `rss` URLs.
