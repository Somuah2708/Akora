-- Add delivery and read timestamps to direct_messages and supporting trigger

alter table public.direct_messages
  add column if not exists delivered_at timestamptz,
  add column if not exists read_at timestamptz;

-- Indexes for querying state
create index if not exists idx_direct_messages_receiver_unread on public.direct_messages(receiver_id, is_read) where is_read = false;
create index if not exists idx_direct_messages_sender_time on public.direct_messages(sender_id, created_at desc);

-- Auto-populate read_at when is_read flips to true
create or replace function public.set_read_at_when_read()
returns trigger language plpgsql as $$
begin
  if (new.is_read = true and coalesce(old.is_read, false) = false) and new.read_at is null then
    new.read_at = now();
  end if;
  return new;
end $$;

drop trigger if exists trg_set_read_at on public.direct_messages;
create trigger trg_set_read_at
before update on public.direct_messages
for each row execute function public.set_read_at_when_read();

-- Ensure realtime publishes updates for delivered/read changes
do $$ begin
  begin
    alter table public.direct_messages replica identity full;
  exception when others then null; end;
  begin
    alter publication supabase_realtime add table public.direct_messages;
  exception when others then null; end;
end $$;
