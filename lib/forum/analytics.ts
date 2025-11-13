import { supabase } from '@/lib/supabase';

export interface TrendingDiscussionRow {
  id: string;
  author_id: string;
  created_at: string;
  last_activity_at: string;
  likes_count: number;
  comments_count: number;
  views_count: number;
  distinct_comment_authors: number;
  distinct_bookmarkers: number;
  distinct_likers: number;
  is_pinned: boolean;
  trending_score: number;
}

export interface ActiveUserRow {
  user_id: string;
  discussions_started: number;
  comments_written: number;
  likes_given: number;
  likes_received: number;
  bookmarks_made: number;
  distinct_threads: number;
  last_activity_at: string;
  activity_score: number;
}

// Fetch top trending discussions; fallback to heuristic if RPC not available.
export async function fetchTrendingDiscussions(limit = 5): Promise<TrendingDiscussionRow[]> {
  // Try RPC first (materialized view)
  const { data, error } = await supabase.rpc('get_trending_discussions', {
    limit_count: limit,
    offset_count: 0,
  });
  if (!error && data) return data as TrendingDiscussionRow[];

  // Fallback: compute simple trending based on likes + comments (already loaded elsewhere).
  const { data: raw, error: rawErr } = await supabase
    .from('forum_discussions')
    .select('id, author_id, created_at, updated_at, likes_count, comments_count, views_count, is_pinned')
    .order('created_at', { ascending: false })
    .limit(50);
  if (rawErr || !raw) return [];
  return raw
    .sort((a: any, b: any) => (b.likes_count + b.comments_count) - (a.likes_count + a.comments_count))
    .slice(0, limit)
    .map((r: any) => ({
      id: r.id,
      author_id: r.author_id,
      created_at: r.created_at,
      last_activity_at: r.updated_at,
      likes_count: r.likes_count,
      comments_count: r.comments_count,
      views_count: r.views_count,
      distinct_comment_authors: 0,
      distinct_bookmarkers: 0,
      distinct_likers: 0,
      is_pinned: r.is_pinned,
      trending_score: r.likes_count + r.comments_count,
    }));
}

export async function fetchActiveUsers(limit = 8): Promise<ActiveUserRow[]> {
  const { data, error } = await supabase.rpc('get_active_forum_users', {
    limit_count: limit,
    offset_count: 0,
  });
  if (!error && data) {
    const rows = (data as ActiveUserRow[]).filter(r => {
      const ts = r?.last_activity_at;
      if (!ts) return false;
      const normalized = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(ts) && !/[zZ]$/.test(ts)
        ? ts.replace(' ', 'T') + 'Z'
        : ts;
      const ms = Date.parse(normalized as any);
      return r.activity_score > 0 && !Number.isNaN(ms) && ms > 0;
    });
    return rows;
  }

  // Fallback: approximate using counts from profiles joined discussions/comments
  const { data: discussions } = await supabase
    .from('forum_discussions')
    .select('author_id, likes_count, comments_count')
    .limit(200);
  if (!discussions) return [];
  const aggregate: Record<string, ActiveUserRow> = {};
  discussions.forEach(d => {
    const row = aggregate[d.author_id] || {
      user_id: d.author_id,
      discussions_started: 0,
      comments_written: 0,
      likes_given: 0,
      likes_received: 0,
      bookmarks_made: 0,
      distinct_threads: 0,
      last_activity_at: d.created_at,
      activity_score: 0,
    };
    row.discussions_started += 1;
    row.likes_received += d.likes_count;
    row.comments_written += d.comments_count; // proxy
    row.activity_score = row.discussions_started + row.comments_written + row.likes_received;
    aggregate[d.author_id] = row;
  });
  return Object.values(aggregate)
    .sort((a, b) => b.activity_score - a.activity_score)
    .filter(r => {
      const ts = r?.last_activity_at;
      if (!ts) return false;
      const normalized = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(ts) && !/[zZ]$/.test(ts)
        ? ts.replace(' ', 'T') + 'Z'
        : ts;
      const ms = Date.parse(normalized as any);
      return r.activity_score > 0 && !Number.isNaN(ms) && ms > 0;
    })
    .slice(0, limit);
}
