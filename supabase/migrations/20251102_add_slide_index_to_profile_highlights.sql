-- Allow highlight items to reference a particular slide within a multi-image post
alter table if exists public.profile_highlights
  add column if not exists slide_index integer;

comment on column public.profile_highlights.slide_index is 'Optional zero-based index into posts.image_urls for multi-slide posts.';
