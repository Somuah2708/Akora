-- Forum Trending & Active Users Analytics
-- Professional-grade scoring with time decay, normalization, anti-gaming safeguards.
-- Assumes existing tables per CREATE_FORUM_TABLES.sql:
--   forum_discussions(id, author_id, likes_count, comments_count, views_count, created_at, updated_at, is_pinned)
--   forum_comments(id, discussion_id, author_id, created_at)
--   forum_discussion_likes(id, discussion_id, user_id, created_at)
--   forum_discussion_bookmarks(id, discussion_id, user_id, created_at)
--   forum_comment_likes(id, comment_id, user_id, created_at)
--   profiles(id)
-- NOTE: If views_count is incremented externally (e.g. via RPC), we treat it as denormalized.

-- 1. Helper: Last interaction timestamp per discussion for freshness weighting.
CREATE OR REPLACE VIEW forum_discussion_activity_window AS
WITH base AS (
  SELECT d.id,
         d.created_at,
         d.updated_at,
         COALESCE(MAX(c.created_at), d.created_at) AS last_comment_at,
         COALESCE(MAX(dl.created_at), d.created_at) AS last_like_at,
         COALESCE(MAX(b.created_at), d.created_at) AS last_bookmark_at
  FROM forum_discussions d
  LEFT JOIN forum_comments c ON c.discussion_id = d.id
  LEFT JOIN forum_discussion_likes dl ON dl.discussion_id = d.id
  LEFT JOIN forum_discussion_bookmarks b ON b.discussion_id = d.id
  GROUP BY d.id
)
SELECT id,
       GREATEST(created_at, updated_at, last_comment_at, last_like_at, last_bookmark_at) AS last_activity_at
FROM base;

-- 2. Raw engagement aggregates combining dynamic counts + distinct participants metrics.
CREATE OR REPLACE VIEW forum_discussion_engagement AS
WITH participants AS (
  SELECT discussion_id,
         COUNT(DISTINCT author_id) AS distinct_comment_authors
  FROM forum_comments
  GROUP BY discussion_id
), bookmarkers AS (
  SELECT discussion_id,
         COUNT(DISTINCT user_id) AS distinct_bookmarkers
  FROM forum_discussion_bookmarks
  GROUP BY discussion_id
), likers AS (
  SELECT discussion_id,
         COUNT(DISTINCT user_id) AS distinct_likers
  FROM forum_discussion_likes
  GROUP BY discussion_id
)
SELECT d.id,
       d.author_id,
       d.created_at,
       d.updated_at,
       d.likes_count,
       d.comments_count,
       d.views_count,
       COALESCE(p.distinct_comment_authors,0) AS distinct_comment_authors,
       COALESCE(b.distinct_bookmarkers,0) AS distinct_bookmarkers,
       COALESCE(l.distinct_likers,0) AS distinct_likers,
       a.last_activity_at,
       d.is_pinned
FROM forum_discussions d
LEFT JOIN participants p ON p.discussion_id = d.id
LEFT JOIN bookmarkers b ON b.discussion_id = d.id
LEFT JOIN likers l ON l.discussion_id = d.id
LEFT JOIN forum_discussion_activity_window a ON a.id = d.id;

-- 3. Trending score view (time-decayed multi-factor engagement).
-- We normalize each metric with mean & stddev, cap outliers via TANH.
-- Recency decay uses minutes since last_activity rather than creation.
-- Pinned discussions get a modest bonus to ensure visibility but not dominance.
CREATE OR REPLACE VIEW forum_discussions_trending AS
WITH metrics AS (
  SELECT *, EXTRACT(EPOCH FROM (NOW() - last_activity_at))/60.0 AS age_minutes
  FROM forum_discussion_engagement
), stats AS (
  SELECT
    AVG(likes_count)    AS avg_likes,     GREATEST(STDDEV_POP(likes_count),1)    AS sd_likes,
    AVG(comments_count) AS avg_comments,  GREATEST(STDDEV_POP(comments_count),1) AS sd_comments,
    AVG(views_count)    AS avg_views,     GREATEST(STDDEV_POP(views_count),1)    AS sd_views,
    AVG(distinct_comment_authors) AS avg_distinct_authors, GREATEST(STDDEV_POP(distinct_comment_authors),1) AS sd_distinct_authors,
    AVG(distinct_bookmarkers)     AS avg_bookmarkers,     GREATEST(STDDEV_POP(distinct_bookmarkers),1)     AS sd_bookmarkers
  FROM forum_discussion_engagement
)
SELECT m.id,
       m.author_id,
       m.created_at,
       m.last_activity_at,
       m.likes_count,
       m.comments_count,
       m.views_count,
       m.distinct_comment_authors,
       m.distinct_bookmarkers,
       m.distinct_likers,
       m.is_pinned,
       -- Engagement component weights (tunable): comments (0.28), distinct authors (0.18), likes (0.18), bookmarks (0.20), views (0.08), diversity (0.08 via distinct authors already partly included)
       (
         0.28 * TANH( (m.comments_count - s.avg_comments) / s.sd_comments ) +
         0.18 * TANH( (m.likes_count - s.avg_likes) / s.sd_likes ) +
         0.20 * TANH( (m.distinct_bookmarkers - s.avg_bookmarkers) / s.sd_bookmarkers ) +
         0.18 * TANH( (m.distinct_comment_authors - s.avg_distinct_authors) / s.sd_distinct_authors ) +
         0.08 * TANH( (m.views_count - s.avg_views) / s.sd_views )
       ) AS engagement_component,
       EXP( - age_minutes / 720.0 ) AS time_decay, -- 12h characteristic decay
       (
         (
           0.28 * TANH( (m.comments_count - s.avg_comments) / s.sd_comments ) +
           0.18 * TANH( (m.likes_count - s.avg_likes) / s.sd_likes ) +
           0.20 * TANH( (m.distinct_bookmarkers - s.avg_bookmarkers) / s.sd_bookmarkers ) +
           0.18 * TANH( (m.distinct_comment_authors - s.avg_distinct_authors) / s.sd_distinct_authors ) +
           0.08 * TANH( (m.views_count - s.avg_views) / s.sd_views )
         ) * EXP( - age_minutes / 720.0 ) + (CASE WHEN m.is_pinned THEN 0.10 ELSE 0 END)
       ) AS trending_score
FROM metrics m CROSS JOIN stats s
ORDER BY trending_score DESC;

-- 4. Active users engagement components.
CREATE OR REPLACE VIEW forum_active_users AS
WITH authored_discussions AS (
  SELECT author_id AS user_id,
         COUNT(*) AS discussions_started,
         MAX(created_at) AS last_discussion_at
  FROM forum_discussions
  GROUP BY author_id
), authored_comments AS (
  SELECT author_id AS user_id,
         COUNT(*) AS comments_written,
         MAX(created_at) AS last_comment_at
  FROM forum_comments
  GROUP BY author_id
), likes_given AS (
  SELECT user_id, COUNT(*) AS likes_given, MAX(created_at) AS last_like_given_at
  FROM forum_discussion_likes GROUP BY user_id
), likes_received AS (
  SELECT d.author_id AS user_id, COUNT(l.id) AS likes_received
  FROM forum_discussions d LEFT JOIN forum_discussion_likes l ON l.discussion_id = d.id
  GROUP BY d.author_id
), bookmarks_made AS (
  SELECT user_id, COUNT(*) AS bookmarks_made, MAX(created_at) AS last_bookmark_at
  FROM forum_discussion_bookmarks GROUP BY user_id
), discussions_participated AS (
  SELECT author_id AS user_id, COUNT(DISTINCT discussion_id) AS distinct_threads
  FROM forum_comments GROUP BY author_id
)
SELECT p.id AS user_id,
       COALESCE(ad.discussions_started,0) AS discussions_started,
       COALESCE(ac.comments_written,0) AS comments_written,
       COALESCE(lg.likes_given,0) AS likes_given,
       COALESCE(lr.likes_received,0) AS likes_received,
       COALESCE(bm.bookmarks_made,0) AS bookmarks_made,
       COALESCE(dp.distinct_threads,0) AS distinct_threads,
       GREATEST(
         COALESCE(ad.last_discussion_at,'epoch'),
         COALESCE(ac.last_comment_at,'epoch'),
         COALESCE(lg.last_like_given_at,'epoch'),
         COALESCE(bm.last_bookmark_at,'epoch')
       ) AS last_activity_at
FROM profiles p
LEFT JOIN authored_discussions ad ON ad.user_id = p.id
LEFT JOIN authored_comments ac ON ac.user_id = p.id
LEFT JOIN likes_given lg ON lg.user_id = p.id
LEFT JOIN likes_received lr ON lr.user_id = p.id
LEFT JOIN bookmarks_made bm ON bm.user_id = p.id
LEFT JOIN discussions_participated dp ON dp.user_id = p.id;

-- 5. Active users ranked view.
CREATE OR REPLACE VIEW forum_active_users_ranked AS
WITH metrics AS (
  SELECT *, EXTRACT(EPOCH FROM (NOW() - last_activity_at))/3600.0 AS hours_since_activity
  FROM forum_active_users
), stats AS (
  SELECT
    AVG(discussions_started) AS avg_discussions, GREATEST(STDDEV_POP(discussions_started),1) AS sd_discussions,
    AVG(comments_written) AS avg_comments, GREATEST(STDDEV_POP(comments_written),1) AS sd_comments,
    AVG(likes_given) AS avg_likes_given, GREATEST(STDDEV_POP(likes_given),1) AS sd_likes_given,
    AVG(likes_received) AS avg_likes_received, GREATEST(STDDEV_POP(likes_received),1) AS sd_likes_received,
    AVG(bookmarks_made) AS avg_bookmarks, GREATEST(STDDEV_POP(bookmarks_made),1) AS sd_bookmarks,
    AVG(distinct_threads) AS avg_threads, GREATEST(STDDEV_POP(distinct_threads),1) AS sd_threads
  FROM forum_active_users
)
SELECT m.user_id,
       discussions_started,
       comments_written,
       likes_given,
       likes_received,
       bookmarks_made,
       distinct_threads,
       last_activity_at,
       (
         0.22 * TANH( (discussions_started - s.avg_discussions)/s.sd_discussions ) +
         0.22 * TANH( (comments_written - s.avg_comments)/s.sd_comments ) +
         0.14 * TANH( (likes_given - s.avg_likes_given)/s.sd_likes_given ) +
         0.18 * TANH( (likes_received - s.avg_likes_received)/s.sd_likes_received ) +
         0.12 * TANH( (bookmarks_made - s.avg_bookmarks)/s.sd_bookmarks ) +
         0.12 * TANH( (distinct_threads - s.avg_threads)/s.sd_threads )
       ) AS engagement_component,
       EXP( - hours_since_activity / 72.0 ) AS recency_decay, -- 3 day characteristic decay
       (
         (
           0.22 * TANH( (discussions_started - s.avg_discussions)/s.sd_discussions ) +
           0.22 * TANH( (comments_written - s.avg_comments)/s.sd_comments ) +
           0.14 * TANH( (likes_given - s.avg_likes_given)/s.sd_likes_given ) +
           0.18 * TANH( (likes_received - s.avg_likes_received)/s.sd_likes_received ) +
           0.12 * TANH( (bookmarks_made - s.avg_bookmarks)/s.sd_bookmarks ) +
           0.12 * TANH( (distinct_threads - s.avg_threads)/s.sd_threads )
         ) * EXP( - hours_since_activity / 72.0 )
       ) AS activity_score
FROM metrics m CROSS JOIN stats s
ORDER BY activity_score DESC;

-- 6. Materialized views (optional for performance). Run manually or schedule refresh.
DROP MATERIALIZED VIEW IF EXISTS mv_forum_discussions_trending;
CREATE MATERIALIZED VIEW mv_forum_discussions_trending AS
  SELECT * FROM forum_discussions_trending;

DROP MATERIALIZED VIEW IF EXISTS mv_forum_active_users_ranked;
CREATE MATERIALIZED VIEW mv_forum_active_users_ranked AS
  SELECT * FROM forum_active_users_ranked;

-- Indexes on materialized views for fast ordering.
CREATE INDEX IF NOT EXISTS idx_mv_trending_score ON mv_forum_discussions_trending(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_mv_active_users_score ON mv_forum_active_users_ranked(activity_score DESC);

-- 7. Refresh functions with advisory lock to avoid concurrent refresh collisions.
CREATE OR REPLACE FUNCTION refresh_forum_analytics()
RETURNS void AS $$
DECLARE
  got_lock boolean;
BEGIN
  SELECT pg_try_advisory_lock(987654321) INTO got_lock; -- arbitrary key
  IF NOT got_lock THEN
    RAISE NOTICE 'Another refresh in progress';
    RETURN;
  END IF;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_forum_discussions_trending;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_forum_active_users_ranked;
  PERFORM pg_advisory_unlock(987654321);
END;
$$ LANGUAGE plpgsql;

-- 8. RPC wrappers (Supabase exposes via PostgREST automatically for stable functions).
CREATE OR REPLACE FUNCTION get_trending_discussions(limit_count integer DEFAULT 20, offset_count integer DEFAULT 0)
RETURNS SETOF mv_forum_discussions_trending AS $$
  SELECT * FROM mv_forum_discussions_trending ORDER BY trending_score DESC LIMIT limit_count OFFSET offset_count;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_active_forum_users(limit_count integer DEFAULT 20, offset_count integer DEFAULT 0)
RETURNS SETOF mv_forum_active_users_ranked AS $$
  SELECT * FROM mv_forum_active_users_ranked ORDER BY activity_score DESC LIMIT limit_count OFFSET offset_count;
$$ LANGUAGE sql STABLE;

-- 9. Optional daily snapshot table for historical analytics & trending evolution (lightweight).
CREATE TABLE IF NOT EXISTS forum_analytics_daily_snapshots (
  day DATE PRIMARY KEY,
  top_discussion_ids UUID[],
  top_user_ids UUID[],
  captured_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION snapshot_forum_analytics()
RETURNS void AS $$
DECLARE
  top_discussions UUID[];
  top_users UUID[];
BEGIN
  SELECT ARRAY(SELECT id FROM mv_forum_discussions_trending ORDER BY trending_score DESC LIMIT 20) INTO top_discussions;
  SELECT ARRAY(SELECT user_id FROM mv_forum_active_users_ranked ORDER BY activity_score DESC LIMIT 20) INTO top_users;
  INSERT INTO forum_analytics_daily_snapshots(day, top_discussion_ids, top_user_ids)
  VALUES (CURRENT_DATE, top_discussions, top_users)
  ON CONFLICT (day) DO UPDATE SET top_discussion_ids = EXCLUDED.top_discussion_ids, top_user_ids = EXCLUDED.top_user_ids, captured_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 10. Suggested CRON (Supabase Scheduled Tasks):
-- name: refresh_forum_analytics   schedule: every 5 minutes   command: SELECT refresh_forum_analytics();
-- name: snapshot_forum_analytics  schedule: daily at 00:05 UTC command: SELECT snapshot_forum_analytics();

-- 11. Permissions (RLS not required for views; ensure functions are SECURITY DEFINER only if needed).
-- Example if you want to allow anonymous read of trending without exposing raw tables:
-- ALTER FUNCTION get_trending_discussions SET search_path = public;
-- (Supabase typically handles this; adjust policies per your exposure model.)

-- END OF FILE
