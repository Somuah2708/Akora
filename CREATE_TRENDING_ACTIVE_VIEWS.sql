-- Trending discussions & active users views
-- Assumptions: existing tables forum_discussions (id, author_id, created_at), forum_comments (id, discussion_id, author_id, created_at),
-- forum_discussion_likes (id, discussion_id, user_id, created_at), forum_discussion_bookmarks (id, discussion_id, user_id, created_at),
-- forum_discussion_views (id, discussion_id, user_id, created_at) optional; if not present create a lightweight counter table.
-- Adjust table names if actual schema differs.

-- 1. Raw aggregation per discussion (last 72h focus window for freshness weighting)
CREATE OR REPLACE VIEW forum_discussion_engagement AS
WITH base AS (
  SELECT d.id,
         d.author_id,
         d.created_at,
         COALESCE(c.comments_count,0) AS comments_count,
         COALESCE(l.likes_count,0) AS likes_count,
         COALESCE(b.bookmarks_count,0) AS bookmarks_count,
         COALESCE(v.views_count,0) AS views_count,
         GREATEST(
           d.created_at,
           COALESCE(c.last_comment_at, d.created_at),
           COALESCE(l.last_like_at, d.created_at),
           COALESCE(b.last_bookmark_at, d.created_at),
           COALESCE(v.last_view_at, d.created_at)
         ) AS last_activity_at
  FROM forum_discussions d
  LEFT JOIN (
    SELECT discussion_id, COUNT(*) AS comments_count, MAX(created_at) AS last_comment_at
    FROM forum_comments GROUP BY discussion_id
  ) c ON c.discussion_id = d.id
  LEFT JOIN (
    SELECT discussion_id, COUNT(*) AS likes_count, MAX(created_at) AS last_like_at
    FROM forum_discussion_likes GROUP BY discussion_id
  ) l ON l.discussion_id = d.id
  LEFT JOIN (
    SELECT discussion_id, COUNT(*) AS bookmarks_count, MAX(created_at) AS last_bookmark_at
    FROM forum_discussion_bookmarks GROUP BY discussion_id
  ) b ON b.discussion_id = d.id
  LEFT JOIN (
    SELECT discussion_id, COUNT(*) AS views_count, MAX(created_at) AS last_view_at
    FROM forum_discussion_views GROUP BY discussion_id
  ) v ON v.discussion_id = d.id
)
SELECT * FROM base;

-- 2. Trending score view (normalized + time decay)
-- We compute z-like normalization using window aggregates and apply weights.
-- time_decay = exp( - age_minutes / decay_constant_minutes ) where decay_constant ~ 720 (12h) for sharper freshness.
CREATE OR REPLACE VIEW forum_discussions_trending AS
WITH metrics AS (
  SELECT *,
    EXTRACT(EPOCH FROM (NOW() - created_at))/60.0 AS age_minutes
  FROM forum_discussion_engagement
), stats AS (
  SELECT
    AVG(comments_count)::float AS avg_comments, GREATEST(STDDEV_POP(comments_count),1)::float AS sd_comments,
    AVG(likes_count)::float AS avg_likes, GREATEST(STDDEV_POP(likes_count),1)::float AS sd_likes,
    AVG(bookmarks_count)::float AS avg_bookmarks, GREATEST(STDDEV_POP(bookmarks_count),1)::float AS sd_bookmarks,
    AVG(views_count)::float AS avg_views, GREATEST(STDDEV_POP(views_count),1)::float AS sd_views
  FROM forum_discussion_engagement
)
SELECT m.id,
       m.author_id,
       m.created_at,
       m.comments_count,
       m.likes_count,
       m.bookmarks_count,
       m.views_count,
       m.last_activity_at,
       -- Standard score capped via tanh for stability
       (0.30 * TANH( (m.comments_count - s.avg_comments) / NULLIF(s.sd_comments,0) )) +
       (0.25 * TANH( (m.likes_count - s.avg_likes) / NULLIF(s.sd_likes,0) )) +
       (0.20 * TANH( (m.bookmarks_count - s.avg_bookmarks) / NULLIF(s.sd_bookmarks,0) )) +
       (0.10 * TANH( (m.views_count - s.avg_views) / NULLIF(s.sd_views,0) ))
       AS engagement_component,
       EXP( - m.age_minutes / 720.0 ) AS time_decay,
       ((0.30 * TANH( (m.comments_count - s.avg_comments) / NULLIF(s.sd_comments,0) )) +
        (0.25 * TANH( (m.likes_count - s.avg_likes) / NULLIF(s.sd_likes,0) )) +
        (0.20 * TANH( (m.bookmarks_count - s.avg_bookmarks) / NULLIF(s.sd_bookmarks,0) )) +
        (0.10 * TANH( (m.views_count - s.avg_views) / NULLIF(s.sd_views,0) ))) * EXP( - m.age_minutes / 720.0 )
        AS trending_score
FROM metrics m CROSS JOIN stats s
ORDER BY trending_score DESC;

-- 3. Active users view and score
CREATE OR REPLACE VIEW forum_active_users AS
WITH user_base AS (
  SELECT p.id AS user_id
  FROM profiles p
), agg AS (
  SELECT
    d.author_id AS user_id,
    COUNT(*) AS discussions_started,
    MAX(d.created_at) AS last_discussion_at
  FROM forum_discussions d GROUP BY d.author_id
), comments AS (
  SELECT author_id AS user_id, COUNT(*) AS comments_written, MAX(created_at) AS last_comment_at
  FROM forum_comments GROUP BY author_id
), likes_given AS (
  SELECT user_id, COUNT(*) AS likes_given, MAX(created_at) AS last_like_given_at
  FROM forum_discussion_likes GROUP BY user_id
), likes_received AS (
  SELECT d.author_id AS user_id, COUNT(l.id) AS likes_received
  FROM forum_discussions d LEFT JOIN forum_discussion_likes l ON l.discussion_id = d.id
  GROUP BY d.author_id
), bookmarks AS (
  SELECT user_id, COUNT(*) AS bookmarks_made, MAX(created_at) AS last_bookmark_at
  FROM forum_discussion_bookmarks GROUP BY user_id
)
SELECT ub.user_id,
       COALESCE(a.discussions_started,0) AS discussions_started,
       COALESCE(c.comments_written,0) AS comments_written,
       COALESCE(lg.likes_given,0) AS likes_given,
       COALESCE(lr.likes_received,0) AS likes_received,
       COALESCE(b.bookmarks_made,0) AS bookmarks_made,
       GREATEST(
         COALESCE(a.last_discussion_at, 'epoch'::timestamp),
         COALESCE(c.last_comment_at, 'epoch'::timestamp),
         COALESCE(lg.last_like_given_at, 'epoch'::timestamp),
         COALESCE(b.last_bookmark_at, 'epoch'::timestamp)
       ) AS last_activity_at
FROM user_base ub
LEFT JOIN agg a ON a.user_id = ub.user_id
LEFT JOIN comments c ON c.user_id = ub.user_id
LEFT JOIN likes_given lg ON lg.user_id = ub.user_id
LEFT JOIN likes_received lr ON lr.user_id = ub.user_id
LEFT JOIN bookmarks b ON b.user_id = ub.user_id;

-- 4. Active user score view (weights + recency decay)
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
    AVG(bookmarks_made) AS avg_bookmarks, GREATEST(STDDEV_POP(bookmarks_made),1) AS sd_bookmarks
  FROM forum_active_users
)
SELECT m.user_id,
       discussions_started,
       comments_written,
       likes_given,
       likes_received,
       bookmarks_made,
       last_activity_at,
       (0.25 * TANH( (discussions_started - s.avg_discussions)/s.sd_discussions )) +
       (0.25 * TANH( (comments_written - s.avg_comments)/s.sd_comments )) +
       (0.15 * TANH( (likes_given - s.avg_likes_given)/s.sd_likes_given )) +
       (0.20 * TANH( (likes_received - s.avg_likes_received)/s.sd_likes_received )) +
       (0.15 * TANH( (bookmarks_made - s.avg_bookmarks)/s.sd_bookmarks )) AS engagement_component,
       EXP( - hours_since_activity / 48.0 ) AS recency_decay,
       ((0.25 * TANH( (discussions_started - s.avg_discussions)/s.sd_discussions )) +
        (0.25 * TANH( (comments_written - s.avg_comments)/s.sd_comments )) +
        (0.15 * TANH( (likes_given - s.avg_likes_given)/s.sd_likes_given )) +
        (0.20 * TANH( (likes_received - s.avg_likes_received)/s.sd_likes_received )) +
        (0.15 * TANH( (bookmarks_made - s.avg_bookmarks)/s.sd_bookmarks ))) * EXP( - hours_since_activity / 48.0 ) AS activity_score
FROM metrics m CROSS JOIN stats s
ORDER BY activity_score DESC;

-- Recommended indexes (create only if not existing)
-- CREATE INDEX IF NOT EXISTS idx_forum_discussions_created_at ON forum_discussions(created_at);
-- CREATE INDEX IF NOT EXISTS idx_forum_comments_discussion_id ON forum_comments(discussion_id);
-- CREATE INDEX IF NOT EXISTS idx_forum_discussion_likes_discussion_id ON forum_discussion_likes(discussion_id);
-- CREATE INDEX IF NOT EXISTS idx_forum_discussion_bookmarks_discussion_id ON forum_discussion_bookmarks(discussion_id);
-- CREATE INDEX IF NOT EXISTS idx_forum_discussion_views_discussion_id ON forum_discussion_views(discussion_id);
-- CREATE INDEX IF NOT EXISTS idx_forum_comments_author_id ON forum_comments(author_id);
-- CREATE INDEX IF NOT EXISTS idx_forum_discussions_author_id ON forum_discussions(author_id);

-- Optional RPC functions for pagination (example for trending)
-- CREATE OR REPLACE FUNCTION get_trending_discussions(limit_count integer, offset_count integer)
-- RETURNS SETOF forum_discussions_trending AS $$
--   SELECT * FROM forum_discussions_trending ORDER BY trending_score DESC LIMIT limit_count OFFSET offset_count;
-- $$ LANGUAGE sql STABLE;
