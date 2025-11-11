# News API Setup

This app supports a location‑aware, personalized news experience using NewsAPI (https://newsapi.org).

## ⚡ New: Automatic Region Detection & Personalization
You no longer have to hard‑code a primary country. If `EXPO_PUBLIC_NEWS_PRIMARY_COUNTRY` is NOT set, the app will:
1. Detect your country via a lightweight IP geolocation request (`ipapi.co`).
2. Cache the result for 6 hours to avoid repeated network calls.
3. Fall back to `gh` (Ghana) if detection fails.

Personalization layer:
- Favorite categories (stored locally) are boosted to the top of the "For You" blended feed after recency sorting.
- Muted sources (future enhancement) will be filtered out before ranking.

You can still force an override by setting `EXPO_PUBLIC_NEWS_PRIMARY_COUNTRY` in `.env`.

## 1) Get an API key
- Sign up at https://newsapi.org and generate an API key

## 2) Configure public environment variables (optional override)
Expo exposes public variables prefixed with `EXPO_PUBLIC_` at runtime.
Create a `.env` file in the project root (same folder as `app.json`) with:

```
EXPO_PUBLIC_NEWS_API_KEY=your_newsapi_key_here
EXPO_PUBLIC_NEWS_PRIMARY_COUNTRY=gh
EXPO_PUBLIC_NEWS_SECONDARY_COUNTRIES=us,gb,ng
```

Notes:
- If `EXPO_PUBLIC_NEWS_PRIMARY_COUNTRY` is omitted, auto‑detection selects your country.
- `EXPO_PUBLIC_NEWS_PRIMARY_COUNTRY` when present disables detection and forces that country.
- `EXPO_PUBLIC_NEWS_SECONDARY_COUNTRIES` remains a comma‑separated blend list.

## 3) Start the app with the env loaded
If you use the standard Expo CLI (SDK 49+), `.env` is read automatically for `EXPO_PUBLIC_` vars.
If not, export in your shell before starting:

```zsh
export EXPO_PUBLIC_NEWS_API_KEY=your_newsapi_key_here
export EXPO_PUBLIC_NEWS_PRIMARY_COUNTRY=gh
export EXPO_PUBLIC_NEWS_SECONDARY_COUNTRIES=us,gb,ng
expo start
```

## 4) What the app does now
- Breaking banner uses `top-headlines?country=${resolvedPrimary}` (env override or detected).
- "For You" (All) feed blends primary-country headlines (≈60%) with secondary/global headlines (≈40%); then favorite categories are boosted.
- Category "Ghana" (or your detected country) can still be selected directly if present.
- Trending uses a global popularity search (NewsAPI `everything` with `sortBy=popularity`).
- Future: muted sources and per‑category read history weighting.

## 5) Troubleshooting
- If you see empty feeds, make sure your API key is valid and you haven't exceeded the free rate limits
- If auto detection seems wrong, add or edit `EXPO_PUBLIC_NEWS_PRIMARY_COUNTRY` in `.env` to force the correct country.
- Empty country or API failures will fall back to Ghana (`gh`).
- Some categories may not always have results for a given country; the hybrid feed ensures you still see fresh stories.

## 6) Personalization API (Local Only)
You can mark favorite categories in the app (implementation UI forthcoming). Internally they are stored in AsyncStorage under `@news_favorite_categories` and used to re-rank the blended feed.

| Feature | Storage Key | Behavior |
|---------|-------------|----------|
| Favorite Categories | `@news_favorite_categories` | Boosted to top of blended feed |
| Muted Sources (future) | `@news_muted_sources` | Will be removed before ranking |

No server calls are made for personalization—safe for offline usage.

## 7) Privacy Considerations
- IP geolocation request only retrieves coarse country code; no precise GPS used.
- Users can opt-out by setting an explicit `EXPO_PUBLIC_NEWS_PRIMARY_COUNTRY` or adding a future in-app toggle.

