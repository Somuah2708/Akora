import { XMLParser } from 'fast-xml-parser';
import { GHANA_LOCAL_SOURCES, DEFAULT_NEWS_IMAGE, NEWS_PAGE_SIZE } from '../constants/news';
import { decode } from 'html-entities';
import { NewsArticle } from '../types/news';

type RssItem = {
  title?: string;
  link?: string;
  guid?: string | { '#text'?: string };
  description?: string;
  pubDate?: string;
  author?: string;
  'content:encoded'?: string;
  enclosure?: { '@_url'?: string };
  'media:content'?: { '@_url'?: string } | Array<{ '@_url'?: string }>;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

function first<T>(arr: T | T[] | undefined): T | undefined {
  if (!arr) return undefined;
  return Array.isArray(arr) ? arr[0] : arr;
}

function stripHtml(html?: string): string {
  if (!html) return '';
  const text = html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return decode(text);
}

function extractImage(item: RssItem, content?: string): string {
  const enclosure = item.enclosure && (item.enclosure as any)['@_url'];
  if (enclosure) return enclosure;
  const media = item['media:content'];
  if (Array.isArray(media)) {
    const url = media.find((m) => (m as any)['@_url']) as any;
    if (url && url['@_url']) return url['@_url'];
  } else if (media && (media as any)['@_url']) {
    return (media as any)['@_url'];
  }
  if (content) {
    const match = content.match(/<img[^>]+src=["']?([^"'>\s]+)["']?/i);
    if (match && match[1]) return match[1];
  }
  return DEFAULT_NEWS_IMAGE;
}

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

class LocalNewsService {
  async fetchGhanaLocalNews(limit: number = NEWS_PAGE_SIZE): Promise<NewsArticle[]> {
    const results: NewsArticle[] = [];

    for (const source of GHANA_LOCAL_SOURCES) {
      let feedParsed: any | null = null;
      for (const rssUrl of source.rss) {
        try {
          const res = await fetchWithTimeout(rssUrl, 7000);
          if (!res.ok) continue;
          const xml = await res.text();
          feedParsed = parser.parse(xml);
          break; // stop at the first working rss endpoint
        } catch {
          // try next rss
        }
      }

      if (!feedParsed) continue;

      const channel = feedParsed?.rss?.channel || feedParsed?.feed; // RSS 2.0 vs Atom
      const items: RssItem[] = channel?.item || channel?.entry || [];

      for (const item of items) {
  const rawTitle = (item as any).title?.['#text'] || (item as any).title || '';
  const title = decode(String(rawTitle)).trim();
        const link = (item as any).link?.href || (item as any).link || item.link || '';
        const guid = (typeof item.guid === 'string') ? item.guid : item.guid?.['#text'];
        const descHtml = (item as any)['content:encoded'] || item.description || '';
        const summary = stripHtml(descHtml).slice(0, 320);
        const img = extractImage(item, descHtml);
  const published = item.pubDate || new Date().toISOString();

        const article: NewsArticle = {
          id: `${source.id}_${guid || link}`,
          title: title || 'Untitled',
          description: summary,
          content: summary,
          url: link,
          originalUrl: link,
          urlToImage: img,
          publishedAt: new Date(published).toISOString(),
          source: {
            id: source.id,
            name: source.name,
            logo: source.logo,
            url: source.siteUrl,
          },
          author: undefined,
          category: 'ghana',
          isBreaking: false,
          isTrending: false,
          readTime: Math.max(1, Math.ceil(summary.split(/\s+/).length / 200)),
          isLocal: true,
          sourceType: 'rss',
          summary,
        };

        results.push(article);
        if (results.length >= limit) break;
      }

      if (results.length >= limit) break;
    }

    // Sort by recency
    results.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    return results;
  }
}

export const localNewsService = new LocalNewsService();
