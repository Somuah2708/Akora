-- Mark posts that were created only to host highlight media so they can be hidden from grids
alter table if exists public.posts
  add column if not exists is_highlight_only boolean not null default false;

comment on column public.posts.is_highlight_only is 'If true, this post exists only to power highlights and should be hidden from normal grids.';
