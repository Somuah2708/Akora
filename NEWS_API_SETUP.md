# News API Setup

This app supports a Ghana-first global news experience using NewsAPI (https://newsapi.org).

## 1) Get an API key
- Sign up at https://newsapi.org and generate an API key

## 2) Configure public environment variables
Expo exposes public variables prefixed with `EXPO_PUBLIC_` at runtime.
Create a `.env` file in the project root (same folder as `app.json`) with:

```
EXPO_PUBLIC_NEWS_API_KEY=your_newsapi_key_here
EXPO_PUBLIC_NEWS_PRIMARY_COUNTRY=gh
EXPO_PUBLIC_NEWS_SECONDARY_COUNTRIES=us,gb,ng
```

Notes:
- `EXPO_PUBLIC_NEWS_PRIMARY_COUNTRY` controls your primary regional focus (ISO 3166-1 alpha-2). Default is `gh`.
- `EXPO_PUBLIC_NEWS_SECONDARY_COUNTRIES` is a comma-separated list to blend with global coverage.

## 3) Start the app with the env loaded
If you use the standard Expo CLI (SDK 49+), `.env` is read automatically for `EXPO_PUBLIC_` vars.
If not, export in your shell before starting:

```zsh
export EXPO_PUBLIC_NEWS_API_KEY=your_newsapi_key_here
export EXPO_PUBLIC_NEWS_PRIMARY_COUNTRY=gh
export EXPO_PUBLIC_NEWS_SECONDARY_COUNTRIES=us,gb,ng
expo start
```

## 4) What the app does with these settings
- Breaking banner uses `top-headlines?country=${PRIMARY}` (e.g., gh)
- "For You" (All) feed blends primary-country headlines (≈60%) with secondary/global headlines (≈40%), de-duplicated and sorted by recency
- Category "Ghana" is available in the News tab for a pure Ghana feed
- Trending uses a global popularity search (NewsAPI `everything` with sortBy=popularity)

## 5) Troubleshooting
- If you see empty feeds, make sure your API key is valid and you haven't exceeded the free rate limits
- Some categories may not always have results for a given country; the hybrid feed ensures you still see fresh stories
