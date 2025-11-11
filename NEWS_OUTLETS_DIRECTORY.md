# News Outlets Directory

A curated, credible directory of official publisher sites worldwide. Users tap a card to open the outlet in an in-app browser.

- Screen: `app/news/outlets.tsx`
- Data: `lib/constants/news-outlets.ts`
- Card UI: `components/news/OutletCard.tsx`
- Types: `lib/types/outlets.ts`

## Countries covered (initial)
- Ghana, Nigeria, Kenya, South Africa
- United Kingdom, United States, Canada
- Germany, France
- India, Japan, Australia

Each country includes ~10 well-known outlets. Add more by appending to `COUNTRY_OUTLETS`.

## Credibility notes
- Links point to official publisher domains.
- No scraping, no full-text replication.
- Future enhancements: verified badge for outlets, regional sorting, language filters.

## Extend the directory
1. Add a new `CountryOutlets` entry in `lib/constants/news-outlets.ts`.
2. Include `countryCode` (ISO-2), `countryName`, and 10+ `NewsOutlet` items.
3. Optionally add `logo` (any small square image); UI gracefully falls back to initials.

## UX details
- Search filters across outlet name and URL.
- Section headers show country flag emoji and name.
- Tapping an outlet opens `expo-web-browser` in-app.
