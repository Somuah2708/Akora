-- Add a caption field per highlight item for per-item captions in viewer and editor
alter table if exists public.profile_highlights
  add column if not exists caption text;

comment on column public.profile_highlights.caption is 'Optional caption for a single highlight item (post-based).';