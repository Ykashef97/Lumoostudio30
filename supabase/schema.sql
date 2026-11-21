-- =====================================================================
-- LumaDesign CMS — database schema for Supabase (Postgres).
-- Applied by tools/setup_backend.py. Safe to run more than once:
-- it never deletes data and never overwrites content edited in the portal.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Who is an admin: the account's app_metadata.role, which only the server can set.
-- ---------------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

do $$ begin
  create type public.content_status as enum ('published', 'hidden');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.request_status as enum ('new', 'contacted', 'meeting_scheduled', 'in_progress', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Media library
-- ---------------------------------------------------------------------
create table if not exists public.media_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 60),
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid references public.media_folders(id) on delete set null,
  source text not null default 'storage' check (source in ('site', 'storage')),
  path text not null,              -- full size: a path on the website ('site') or in the media bucket ('storage')
  medium_path text,                -- about 1200 px wide
  thumb_path text,                 -- about 480 px wide
  mime text,
  width int,
  height int,
  bytes int,
  tone text[],                     -- [top colour, bottom colour] for blending product photos
  title text not null default '' check (char_length(title) <= 120),
  description text not null default '' check (char_length(description) <= 500),
  alt text not null default '' check (char_length(alt) <= 250),
  focal_x real not null default 0.5 check (focal_x between 0 and 1),
  focal_y real not null default 0.5 check (focal_y between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index if not exists media_folder_idx on public.media (folder_id);
create index if not exists media_created_idx on public.media (created_at desc);

-- ---------------------------------------------------------------------
-- Catalogue: designs, collections, spaces (rooms)
-- ---------------------------------------------------------------------
create table if not exists public.designs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  ref text not null unique check (ref ~ '^[A-Z]-[0-9]{2,3}$'),
  name text not null check (char_length(name) between 2 and 80),
  category text not null check (category in ('sconces', 'ceiling', 'chandeliers')),
  description text not null default '' check (char_length(description) <= 600),
  model text not null,             -- which 3D model to use, e.g. 'sconces:1' (see assets/js/models3d.js)
  image_id uuid references public.media(id) on delete restrict,
  specs jsonb not null default '{}'::jsonb,
  status public.content_status not null default 'published',
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null check (char_length(name) between 2 and 60),
  description text not null default '' check (char_length(description) <= 300),
  cover_id uuid references public.media(id) on delete restrict,
  status public.content_status not null default 'published',
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collection_designs (
  collection_id uuid not null references public.collections(id) on delete cascade,
  design_id uuid not null references public.designs(id) on delete cascade,
  position int not null default 0,
  primary key (collection_id, design_id)
);

create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (char_length(name) between 2 and 40),       -- short, e.g. "Bedroom"
  title text not null default '' check (char_length(title) <= 80),     -- e.g. "Bedroom lighting"
  label text not null default '' check (char_length(label) <= 40),     -- in sentences: "your bedroom"
  intro text not null default '' check (char_length(intro) <= 400),
  icon text not null default 'lamp',
  image_id uuid references public.media(id) on delete restrict,
  mobile_image_id uuid references public.media(id) on delete restrict,
  focal_x real not null default 0.5 check (focal_x between 0 and 1),
  focal_y real not null default 0.5 check (focal_y between 0 and 1),
  status public.content_status not null default 'published',
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.space_designs (
  space_id uuid not null references public.spaces(id) on delete cascade,
  design_id uuid not null references public.designs(id) on delete cascade,
  position int not null default 0,
  primary key (space_id, design_id)
);

-- ---------------------------------------------------------------------
-- Page content (home, about, contact, settings) and published versions
-- ---------------------------------------------------------------------
create table if not exists public.site_content (
  area text primary key check (area in ('home', 'about', 'contact', 'settings')),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

-- Every "Publish" stores the whole public site as one version; the website reads the latest.
create table if not exists public.site_snapshots (
  id bigserial primary key,
  data jsonb not null,
  note text not null default '',
  published_at timestamptz not null default now(),
  published_by uuid default auth.uid()
);

-- Private settings for the portal only (never sent to the public website).
create table if not exists public.admin_settings (
  key text primary key,
  value jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Consultation requests
-- ---------------------------------------------------------------------
create table if not exists public.consultation_requests (
  id text primary key check (id ~ '^LD-[A-Z0-9]{4,16}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  phone text not null,
  email text,
  contact_by text not null default 'WhatsApp',
  preferred_date date,
  preferred_time text not null default '',
  notes text not null default '',
  design_id uuid references public.designs(id) on delete set null,
  design_ref text,
  design_name text,
  design_category text,
  design_image text,
  setup text not null default '',
  source text not null default '',
  page text not null default '',
  status public.request_status not null default 'new',
  status_changed_at timestamptz not null default now(),
  sheet_synced_at timestamptz
);
create index if not exists requests_created_idx on public.consultation_requests (created_at desc);
create index if not exists requests_status_idx on public.consultation_requests (status);
create index if not exists requests_updated_idx on public.consultation_requests (updated_at);
-- Room Studio designs sent with a request: { image: storage path or null, lamps: [...] }.
alter table public.consultation_requests add column if not exists room jsonb;

create table if not exists public.request_notes (
  id uuid primary key default gen_random_uuid(),
  request_id text not null references public.consultation_requests(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  author uuid default auth.uid()
);

create table if not exists public.request_events (
  id bigserial primary key,
  request_id text not null references public.consultation_requests(id) on delete cascade,
  at timestamptz not null default now(),
  kind text not null,
  detail text not null default '',
  actor uuid default auth.uid()
);
create index if not exists request_events_idx on public.request_events (request_id, at);

-- ---------------------------------------------------------------------
-- Activity, Google Sheet sync runs, anonymous heart counts
-- ---------------------------------------------------------------------
create table if not exists public.admin_activity (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor uuid,
  action text not null,
  entity text not null,
  entity_id text,
  label text
);
create index if not exists admin_activity_at_idx on public.admin_activity (at desc);

create table if not exists public.sync_runs (
  id bigserial primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  kind text not null default 'scheduled',
  ok boolean,
  added int not null default 0,
  updated int not null default 0,
  error text
);

create table if not exists public.design_likes (
  design_id uuid primary key references public.designs(id) on delete cascade,
  count int not null default 0 check (count >= 0),
  updated_at timestamptz not null default now()
);

-- Photo files that were replaced or deleted in the portal. The live website (or a version
-- that can still be restored) may still show them, so they are only removed from storage
-- once no recent published version uses them (see media_trash_due).
create table if not exists public.media_trash (
  path text primary key,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Triggers: updated_at and the activity log
-- ---------------------------------------------------------------------
create or replace function public.log_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rec jsonb;
begin
  if auth.uid() is null then return null; end if;   -- setup scripts and the Sheet sync are not logged
  rec := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into public.admin_activity (actor, action, entity, entity_id, label)
  values (auth.uid(), lower(tg_op), tg_table_name,
          coalesce(rec ->> 'id', rec ->> 'area', rec ->> 'key'),
          left(coalesce(rec ->> 'name', rec ->> 'title', rec ->> 'area', rec ->> 'key', rec ->> 'path', ''), 120));
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['media', 'designs', 'collections', 'spaces', 'site_content', 'consultation_requests', 'admin_settings'] loop
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = t and column_name = 'updated_at') then
      execute format('drop trigger if exists %I_touch on public.%I', t, t);
      execute format('create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_at()', t, t);
    end if;
  end loop;
  foreach t in array array['media', 'media_folders', 'designs', 'collections', 'spaces', 'site_content', 'admin_settings'] loop
    execute format('drop trigger if exists %I_activity on public.%I', t, t);
    execute format('create trigger %I_activity after insert or update or delete on public.%I for each row execute function public.log_activity()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Access rules: everything is admin-only. Visitors only use the functions below.
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['media_folders', 'media', 'designs', 'collections', 'collection_designs', 'spaces', 'space_designs',
                           'site_content', 'site_snapshots', 'admin_settings', 'consultation_requests', 'request_notes',
                           'request_events', 'admin_activity', 'sync_runs', 'design_likes', 'media_trash'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists admin_all on public.%I', t);
    execute format('create policy admin_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Building the public site
-- ---------------------------------------------------------------------
create or replace function public.media_json(m public.media) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'source', m.source, 'path', m.path, 'medium', m.medium_path, 'thumb', m.thumb_path,
    'alt', m.alt, 'title', m.title, 'width', m.width, 'height', m.height,
    'focal', jsonb_build_array(m.focal_x, m.focal_y), 'tone', to_jsonb(m.tone))
$$;

-- What the public site would look like if published now (published items only).
create or replace function public.build_site() returns jsonb
language sql stable security definer set search_path = public as $$
  with d as (select * from designs where status = 'published'),
       c as (select * from collections where status = 'published'),
       s as (select * from spaces where status = 'published'),
       content as (select coalesce(jsonb_object_agg(area, data) filter (where area <> 'settings'), '{}'::jsonb) as data,
                          coalesce((select data from site_content where area = 'settings'), '{}'::jsonb) as settings
                   from site_content),
       refs as (
         select image_id as id from d
         union select cover_id from c
         union select image_id from s
         union select mobile_image_id from s
         union select m.id from media m, site_content sc
           where sc.area <> 'settings' and position(m.id::text in sc.data::text) > 0
       )
  select jsonb_build_object(
    'version', 1,
    'content', (select data from content),
    'settings', jsonb_build_object(
       'pricing', (select settings -> 'pricing' from content),
       'calendarUrl', (select settings -> 'calendarUrl' from content),
       'roomStudio', (select settings -> 'roomStudio' from content)),
    'designs', coalesce((select jsonb_agg(jsonb_build_object(
        'id', d.id, 'slug', d.slug, 'ref', d.ref, 'name', d.name, 'category', d.category,
        'description', d.description, 'model', d.model, 'image', d.image_id, 'specs', d.specs)
        order by d.position, d.name) from d), '[]'::jsonb),
    'collections', coalesce((select jsonb_agg(jsonb_build_object(
        'id', c.id, 'slug', c.slug, 'name', c.name, 'description', c.description, 'cover', c.cover_id,
        'designs', coalesce((select jsonb_agg(cd.design_id order by cd.position)
                             from collection_designs cd join d on d.id = cd.design_id
                             where cd.collection_id = c.id), '[]'::jsonb))
        order by c.position, c.name) from c), '[]'::jsonb),
    'spaces', coalesce((select jsonb_agg(jsonb_build_object(
        'id', s.id, 'slug', s.slug, 'name', s.name, 'title', s.title, 'label', s.label, 'intro', s.intro,
        'icon', s.icon, 'image', s.image_id, 'mobileImage', s.mobile_image_id,
        'focal', jsonb_build_array(s.focal_x, s.focal_y),
        'designs', coalesce((select jsonb_agg(sd.design_id order by sd.position)
                             from space_designs sd join d on d.id = sd.design_id
                             where sd.space_id = s.id), '[]'::jsonb))
        order by s.position, s.name) from s), '[]'::jsonb),
    'media', coalesce((select jsonb_object_agg(m.id, public.media_json(m))
                       from media m where m.id in (select id from refs where id is not null)), '{}'::jsonb)
  )
$$;

-- The live website: the latest published version. Anyone can read it.
create or replace function public.public_site() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select data || jsonb_build_object('publishedAt', published_at, 'snapshot', id)
     from site_snapshots order by id desc limit 1),
    '{}'::jsonb)
$$;

-- Admin preview: what Publish would make live.
create or replace function public.preview_site() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'permission denied' using errcode = '42501'; end if;
  return public.build_site() || jsonb_build_object('preview', true);
end $$;

create or replace function public.publish_site(note text default '') returns jsonb
language plpgsql security definer set search_path = public as $$
declare new_id bigint;
begin
  if not public.is_admin() then raise exception 'permission denied' using errcode = '42501'; end if;
  insert into site_snapshots (data, note) values (public.build_site(), left(coalesce(note, ''), 200)) returning id into new_id;
  insert into admin_activity (actor, action, entity, entity_id, label) values (auth.uid(), 'publish', 'site', new_id::text, left(coalesce(note, ''), 120));
  return jsonb_build_object('ok', true, 'snapshot', new_id);
end $$;

-- Put the site back to an earlier published version (restores the public site only).
create or replace function public.republish_snapshot(snapshot_id bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare new_id bigint;
begin
  if not public.is_admin() then raise exception 'permission denied' using errcode = '42501'; end if;
  insert into site_snapshots (data, note)
    select data, 'Restored version ' || snapshot_id from site_snapshots where id = snapshot_id
    returning id into new_id;
  if new_id is null then raise exception 'Version % not found', snapshot_id; end if;
  insert into admin_activity (actor, action, entity, entity_id, label) values (auth.uid(), 'publish', 'site', new_id::text, 'Restored version ' || snapshot_id);
  return jsonb_build_object('ok', true, 'snapshot', new_id);
end $$;

create or replace function public.site_status() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare latest record;
begin
  if not public.is_admin() then raise exception 'permission denied' using errcode = '42501'; end if;
  select id, data, published_at into latest from site_snapshots order by id desc limit 1;
  return jsonb_build_object(
    'lastPublishedAt', latest.published_at,
    'snapshot', latest.id,
    'unpublished', latest.id is null or latest.data is distinct from public.build_site());
end $$;

-- Where an image is used, so it is never deleted by accident.
create or replace function public.media_usage(media_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when not public.is_admin() then null else coalesce(jsonb_agg(u), '[]'::jsonb) end
  from (
    select 'Design' as kind, name as label from designs where image_id = media_id
    union all select 'Collection cover', name from collections where cover_id = media_id
    union all select 'Room', name from spaces where image_id = media_id or mobile_image_id = media_id
    union all select 'Page', initcap(area) from site_content where position(media_id::text in data::text) > 0
  ) u
$$;

-- Old photo files that can now be deleted: no image record uses them and none of the
-- 15 most recent published versions (the ones Settings can restore) mentions them.
create or replace function public.media_trash_due() returns setof text
language sql stable security definer set search_path = public as $$
  select t.path from media_trash t
  where public.is_admin()
    and not exists (select 1 from media m where t.path in (m.path, m.medium_path, m.thumb_path))
    and not exists (select 1 from (select data from site_snapshots order by id desc limit 15) s
                    where position(t.path in s.data::text) > 0)
$$;

create or replace function public.admin_dashboard() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'permission denied' using errcode = '42501'; end if;
  return jsonb_build_object(
    'requests', (select jsonb_build_object(
        'total', count(*),
        'new', count(*) filter (where status = 'new'),
        'pending', count(*) filter (where status in ('contacted', 'meeting_scheduled', 'in_progress')),
        'completed', count(*) filter (where status = 'completed'),
        'cancelled', count(*) filter (where status = 'cancelled'),
        'last7days', count(*) filter (where created_at > now() - interval '7 days'))
      from consultation_requests),
    'likes', (select coalesce(sum(count), 0) from design_likes),
    'topLiked', coalesce((select jsonb_agg(x) from (
        select d.name, d.ref, l.count from design_likes l join designs d on d.id = l.design_id
        where l.count > 0 order by l.count desc limit 5) x), '[]'::jsonb),
    'media', (select count(*) from media),
    'designs', (select count(*) from designs where status = 'published'),
    'spaces', (select count(*) from spaces where status = 'published'),
    'collections', (select count(*) from collections where status = 'published'),
    'latestRequests', coalesce((select jsonb_agg(r) from (
        select id, name, design_name, status, created_at from consultation_requests order by created_at desc limit 6) r), '[]'::jsonb),
    'recentMedia', coalesce((select jsonb_agg(m) from (
        select id, title, source, path, thumb_path, created_at from media order by created_at desc limit 6) m), '[]'::jsonb),
    'recentActivity', coalesce((select jsonb_agg(a) from (
        select at, action, entity, label from admin_activity order by at desc limit 12) a), '[]'::jsonb),
    'recentSections', coalesce((select jsonb_agg(x) from (
        select area, updated_at from site_content order by updated_at desc limit 4) x), '[]'::jsonb),
    'lastSync', (select to_jsonb(r) from (select * from sync_runs order by id desc limit 1) r),
    'site', public.site_status());
end $$;

-- Business dashboard: inquiry figures for a period, all from data the website really records.
-- p_period: '7d', '30d', 'month' (this month so far), 'lastmonth', '90d', '12m' or 'all'.
-- The previous period is the same span shifted back, so "this month" compares with the same
-- days of last month. Days and months are counted in Cairo time.
create or replace function public.business_dashboard(p_period text default '30d') returns jsonb
language plpgsql stable security definer set search_path = public set timezone to 'Africa/Cairo' as $$
declare
  v_today timestamptz := date_trunc('day', now());
  v_month timestamptz := date_trunc('month', now());
  v_from timestamptz; v_to timestamptz := now(); v_shift interval; v_step interval; v_start timestamptz;
  v_bucket text;
begin
  if not public.is_admin() then raise exception 'permission denied' using errcode = '42501'; end if;
  case p_period
    when '7d' then v_from := v_today - interval '6 days'; v_shift := interval '7 days';
    when 'month' then v_from := v_month; v_shift := interval '1 month';
    when 'lastmonth' then v_from := v_month - interval '1 month'; v_to := v_month; v_shift := interval '1 month';
    when '90d' then v_from := v_today - interval '89 days'; v_shift := interval '90 days';
    when '12m' then v_from := v_month - interval '11 months'; v_shift := interval '12 months';
    when 'all' then v_from := coalesce((select date_trunc('month', min(created_at)) from consultation_requests), v_month);
    else p_period := '30d'; v_from := v_today - interval '29 days'; v_shift := interval '30 days';
  end case;
  if v_to - v_from <= interval '45 days' then v_bucket := 'day'; v_step := interval '1 day'; v_start := v_from;
  elsif v_to - v_from <= interval '200 days' then v_bucket := 'week'; v_step := interval '7 days'; v_start := v_from;
  else v_bucket := 'month'; v_step := interval '1 month'; v_start := date_trunc('month', v_from);
  end if;

  return (
  with r as (
    select c.*, coalesce(d.category, c.design_category) as cat, coalesce(d.name, c.design_name) as dname,
           (select min(e.at) from request_events e where e.request_id = c.id and e.kind = 'status') as first_reply
    from consultation_requests c left join designs d on d.id = c.design_id
  ),
  cur as (select * from r where created_at >= v_from and created_at < v_to),
  prev as (select * from r where v_shift is not null and created_at >= v_from - v_shift and created_at < v_to - v_shift),
  b as (select g as s, greatest(g, v_from) as lo, least(g + v_step, v_to) as hi
        from generate_series(v_start, v_to - interval '1 microsecond', v_step) g)
  select jsonb_build_object(
    'period', jsonb_build_object('key', p_period, 'from', v_from, 'to', v_to, 'bucket', v_bucket,
      'prevFrom', v_from - v_shift, 'prevTo', v_to - v_shift),
    'kpis', jsonb_build_object(
      'inquiries', (select count(*) from cur),
      'prevInquiries', case when v_shift is null then null else (select count(*) from prev) end,
      'waiting', (select count(*) from r where status = 'new'),
      'oldestWaiting', (select min(created_at) from r where status = 'new'),
      'replied', (select count(*) from cur where first_reply is not null),
      'avgReplyHours', (select round((avg(extract(epoch from first_reply - created_at)) / 3600)::numeric, 1)
                        from cur where first_reply is not null),
      'prevAvgReplyHours', (select round((avg(extract(epoch from first_reply - created_at)) / 3600)::numeric, 1)
                            from prev where first_reply is not null),
      'completed', (select count(*) from cur where status = 'completed'),
      'cancelled', (select count(*) from cur where status = 'cancelled'),
      'custom', (select count(*) from cur where setup <> '' or room is not null),
      'rooms', (select count(*) from cur where room is not null)),
    'series', coalesce((select jsonb_agg(jsonb_build_object('start', b.s,
        'count', (select count(*) from cur where created_at >= b.lo and created_at < b.hi),
        'prev', case when v_shift is null then null
                     else (select count(*) from prev where created_at >= b.lo - v_shift and created_at < b.hi - v_shift) end)
        order by b.s) from b), '[]'::jsonb),
    'statuses', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from cur group by status) x), '{}'::jsonb),
    'topDesigns', coalesce((select jsonb_agg(x) from (
        select design_ref as ref, max(dname) as name, count(*) as count from cur
        where design_ref is not null group by design_ref order by count(*) desc, design_ref limit 5) x), '[]'::jsonb),
    'general', (select count(*) from cur where design_ref is null),
    'categories', coalesce((select jsonb_agg(x) from (
        select cat as key, count(*) as count from cur where cat is not null group by cat order by count(*) desc) x), '[]'::jsonb),
    'sources', coalesce((select jsonb_agg(x) from (
        select source as key, count(*) as count from cur group by source order by count(*) desc) x), '[]'::jsonb),
    'contactBy', coalesce((select jsonb_agg(x) from (
        select contact_by as key, count(*) as count from cur group by contact_by order by count(*) desc) x), '[]'::jsonb),
    'topLiked', coalesce((select jsonb_agg(x) from (
        select d.name, d.ref, l.count from design_likes l join designs d on d.id = l.design_id
        where l.count > 0 order by l.count desc limit 5) x), '[]'::jsonb),
    'attention', jsonb_build_object(
      'waitingLong', coalesce((select jsonb_agg(x) from (
          select id, name, created_at from r where status = 'new' and created_at < now() - interval '2 days'
          order by created_at limit 5) x), '[]'::jsonb),
      'waitingLongCount', (select count(*) from r where status = 'new' and created_at < now() - interval '2 days'),
      'stale', coalesce((select jsonb_agg(x) from (
          select id, name, status, status_changed_at from r
          where status in ('contacted', 'meeting_scheduled', 'in_progress') and status_changed_at < now() - interval '7 days'
          order by status_changed_at limit 5) x), '[]'::jsonb),
      'staleCount', (select count(*) from r where status in ('contacted', 'meeting_scheduled', 'in_progress')
                     and status_changed_at < now() - interval '7 days'),
      'meetingsSoon', coalesce((select jsonb_agg(x) from (
          select id, name, preferred_date, preferred_time from r
          where status = 'meeting_scheduled' and preferred_date between current_date and current_date + 3
          order by preferred_date limit 5) x), '[]'::jsonb)),
    'latest', coalesce((select jsonb_agg(x) from (
        select id, name, dname as design_name, design_ref, status, contact_by, created_at from r
        order by created_at desc limit 8) x), '[]'::jsonb),
    'site', public.site_status()));
end $$;

-- ---------------------------------------------------------------------
-- Consultation requests: the website's only write, checked again here
-- ---------------------------------------------------------------------
create or replace function public.submit_consultation(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id text := upper(coalesce(p ->> 'id', ''));
  v_name text := btrim(coalesce(p ->> 'name', ''));
  v_phone text := btrim(coalesce(p ->> 'phone', ''));
  v_digits text := regexp_replace(coalesce(p ->> 'phone', ''), '\D', '', 'g');
  v_email text := nullif(btrim(coalesce(p ->> 'email', '')), '');
  v_notes text := coalesce(p ->> 'notes', '');
  v_date date;
  v_design public.designs%rowtype;
  v_room jsonb := null;
  v_image text;
begin
  -- A person never fills the hidden "website" field; automated spam does.
  if coalesce(p ->> 'website', '') <> '' then return jsonb_build_object('ok', true, 'id', v_id); end if;
  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    return jsonb_build_object('ok', false, 'error', 'Please enter your name.'); end if;
  if char_length(v_digits) < 8 or char_length(v_digits) > 15 then
    return jsonb_build_object('ok', false, 'error', 'Please enter a valid phone number.'); end if;
  if v_email is not null and (char_length(v_email) > 120 or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$') then
    return jsonb_build_object('ok', false, 'error', 'Please check the email address.'); end if;
  if char_length(v_notes) > 1000 then
    return jsonb_build_object('ok', false, 'error', 'Please keep notes under 1000 characters.'); end if;
  begin
    v_date := nullif(p ->> 'preferredDate', '')::date;
  exception when others then v_date := null; end;
  if v_date is not null and (v_date < current_date or v_date > current_date + 120) then v_date := null; end if;

  if (select count(*) from consultation_requests
      where regexp_replace(phone, '\D', '', 'g') = v_digits and created_at > now() - interval '10 minutes') >= 3 then
    return jsonb_build_object('ok', false, 'error', 'You have sent several requests in a few minutes. Please wait a little and try again.'); end if;
  if (select count(*) from consultation_requests where created_at > now() - interval '1 minute') >= 30 then
    return jsonb_build_object('ok', false, 'error', 'We are receiving a lot of requests right now. Please try again in a minute.'); end if;

  if v_id !~ '^LD-[A-Z0-9]{4,16}$' or exists (select 1 from consultation_requests where id = v_id) then
    v_id := 'LD-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
  end if;

  select * into v_design from designs where ref = (p -> 'design' ->> 'ref') limit 1;

  -- A Room Studio design: keep only known fields, at most 8 lights, and only a picture that was
  -- really uploaded to the private room-designs bucket under the expected name.
  if jsonb_typeof(p -> 'room') = 'object' and octet_length((p -> 'room')::text) <= 12000 then
    v_image := p -> 'room' ->> 'image';
    if v_image is null or v_image !~ '^incoming/[0-9a-f-]{36}/design\.jpg$'
       or not exists (select 1 from storage.objects o where o.bucket_id = 'room-designs' and o.name = v_image) then
      v_image := null;
    end if;
    v_room := jsonb_build_object('image', v_image, 'lamps', coalesce((
      select jsonb_agg(jsonb_build_object(
        'ref', left(l ->> 'ref', 10), 'name', left(l ->> 'name', 80), 'size', left(l ->> 'size', 4),
        'finish', left(l ->> 'finish', 20), 'cord', left(l ->> 'cord', 20), 'drop', left(l ->> 'drop', 4),
        'kelvin', left(l ->> 'kelvin', 5), 'brightness', left(l ->> 'brightness', 4)))
      from (select l from jsonb_array_elements(case when jsonb_typeof(p -> 'room' -> 'lamps') = 'array'
                                                    then p -> 'room' -> 'lamps' else '[]'::jsonb end) l limit 8) x), '[]'::jsonb));
  end if;

  insert into consultation_requests (id, name, phone, email, contact_by, preferred_date, preferred_time, notes,
    design_id, design_ref, design_name, design_category, design_image, setup, source, page, room)
  values (v_id, v_name, left(v_phone, 24), v_email, left(coalesce(nullif(p ->> 'contactBy', ''), 'WhatsApp'), 20),
    v_date, left(coalesce(p ->> 'preferredTime', ''), 40), v_notes,
    v_design.id, coalesce(v_design.ref, left(p -> 'design' ->> 'ref', 10)), coalesce(v_design.name, left(p -> 'design' ->> 'name', 80)),
    left(p -> 'design' ->> 'category', 40), left(p -> 'design' ->> 'image', 500),
    left(coalesce(p ->> 'setup', ''), 200), left(coalesce(p ->> 'source', ''), 40), left(coalesce(p ->> 'page', ''), 300), v_room);
  insert into request_events (request_id, kind, detail, actor) values (v_id, 'created', 'Received from the website', null);
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.set_request_status(request_id text, new_status text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare old_status public.request_status;
begin
  if not public.is_admin() then raise exception 'permission denied' using errcode = '42501'; end if;
  select status into old_status from consultation_requests where id = request_id for update;
  if not found then raise exception 'Request % not found', request_id; end if;
  if old_status::text = new_status then return jsonb_build_object('ok', true, 'unchanged', true); end if;
  update consultation_requests set status = new_status::public.request_status, status_changed_at = now() where id = request_id;
  insert into request_events (request_id, kind, detail) values (request_id, 'status', old_status::text || ' → ' || new_status);
  insert into admin_activity (actor, action, entity, entity_id, label) values (auth.uid(), 'status', 'consultation_requests', request_id, new_status);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.add_request_note(request_id text, body text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare note public.request_notes%rowtype;
begin
  if not public.is_admin() then raise exception 'permission denied' using errcode = '42501'; end if;
  if char_length(btrim(coalesce(body, ''))) = 0 then raise exception 'The note is empty'; end if;
  insert into request_notes (request_id, body) values (request_id, btrim(body)) returning * into note;
  insert into request_events (request_id, kind, detail) values (request_id, 'note', left(btrim(body), 80));
  return to_jsonb(note);
end $$;

-- Anonymous heart counts: +1 when a visitor saves a design, -1 when they remove it.
create or replace function public.record_like(design_ref text, delta int) returns void
language plpgsql security definer set search_path = public as $$
declare step int := sign(coalesce(delta, 0))::int;
begin
  if step = 0 then return; end if;
  insert into design_likes (design_id, count)
    select id, greatest(step, 0) from designs where ref = design_ref
  on conflict (design_id) do update set count = greatest(design_likes.count + step, 0), updated_at = now();
end $$;

-- ---------------------------------------------------------------------
-- Google Sheet copy (used only by the Google script, with the secret key)
-- ---------------------------------------------------------------------
-- Requests the Sheet does not have yet, or whose status changed since they were copied.
create or replace function public.sheet_sync_pending(max_rows int default 200) returns setof public.consultation_requests
language sql stable security definer set search_path = public as $$
  select * from consultation_requests
  where sheet_synced_at is null or status_changed_at > sheet_synced_at
  order by created_at
  limit greatest(1, least(coalesce(max_rows, 200), 1000))
$$;

-- items: [{"id": "LD-…", "at": <the status_changed_at that was copied>}]. A status changed after
-- the copy stays newer than sheet_synced_at, so the next run copies it again.
create or replace function public.sheet_mark_synced(items jsonb) returns int
language sql security definer set search_path = public as $$
  with x as (select e ->> 'id' as id, (e ->> 'at')::timestamptz as at from jsonb_array_elements(coalesce(items, '[]'::jsonb)) e),
       u as (update consultation_requests r set sheet_synced_at = x.at from x where r.id = x.id returning 1)
  select count(*)::int from u
$$;

-- ---------------------------------------------------------------------
-- Table access through the Data API. The project does not grant this automatically,
-- so it is given here: signed-in users only, and the access rules above still decide
-- what they can see (admin only). Visitors (anon) get no direct table access at all.
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke all on all tables in schema public from anon;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.media_json(public.media) to authenticated;

-- ---------------------------------------------------------------------
-- Who may call which function
-- ---------------------------------------------------------------------
revoke execute on function public.build_site() from public, anon, authenticated;
revoke execute on function public.log_activity() from public, anon, authenticated;
grant execute on function public.public_site() to anon, authenticated;
grant execute on function public.submit_consultation(jsonb) to anon, authenticated;
grant execute on function public.record_like(text, int) to anon, authenticated;
revoke execute on function public.sheet_sync_pending(int), public.sheet_mark_synced(jsonb) from public, anon, authenticated;
grant execute on function public.sheet_sync_pending(int), public.sheet_mark_synced(jsonb) to service_role;
grant select, insert, update on public.consultation_requests, public.sync_runs to service_role;
grant usage, select on all sequences in schema public to service_role;
revoke execute on function public.preview_site(), public.publish_site(text), public.republish_snapshot(bigint),
  public.site_status(), public.media_usage(uuid), public.media_trash_due(), public.admin_dashboard(), public.business_dashboard(text),
  public.set_request_status(text, text), public.add_request_note(text, text) from public, anon;
grant execute on function public.preview_site(), public.publish_site(text), public.republish_snapshot(bigint),
  public.site_status(), public.media_usage(uuid), public.media_trash_due(), public.admin_dashboard(), public.business_dashboard(text),
  public.set_request_status(text, text), public.add_request_note(text, text) to authenticated;

-- ---------------------------------------------------------------------
-- Image storage: a public "media" bucket that only the admin can write to
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

do $$ begin
  drop policy if exists "media admin insert" on storage.objects;
  drop policy if exists "media admin update" on storage.objects;
  drop policy if exists "media admin delete" on storage.objects;
  drop policy if exists "media admin select" on storage.objects;
  -- Storage only deletes files the user can also see, so the admin needs this to remove replaced files.
  create policy "media admin select" on storage.objects for select to authenticated using (bucket_id = 'media' and public.is_admin());
  create policy "media admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
  create policy "media admin update" on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_admin());
  create policy "media admin delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_admin());
exception when insufficient_privilege then
  raise warning 'STORAGE_POLICIES_NEED_DASHBOARD';
end $$;

-- ---------------------------------------------------------------------
-- Room Studio: pictures of room designs sent with consultation requests.
-- Private bucket. Visitors may only add a JPEG (max 1.5 MB) under incoming/<uuid>/design.jpg,
-- and at most 200 a day site-wide; they can never read or list files. Only the admin can view or delete.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('room-designs', 'room-designs', false, 1572864, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.room_upload_allowed() returns boolean
language sql stable security definer set search_path = public as $$
  select (select count(*) from storage.objects where bucket_id = 'room-designs' and created_at > now() - interval '1 day') < 200
$$;
revoke execute on function public.room_upload_allowed() from public;
grant execute on function public.room_upload_allowed() to anon, authenticated;

do $$ begin
  drop policy if exists "room designs visitor upload" on storage.objects;
  drop policy if exists "room designs admin read" on storage.objects;
  drop policy if exists "room designs admin delete" on storage.objects;
  create policy "room designs visitor upload" on storage.objects for insert to anon, authenticated
    with check (bucket_id = 'room-designs' and name ~ '^incoming/[0-9a-f-]{36}/design\.jpg$' and public.room_upload_allowed());
  create policy "room designs admin read" on storage.objects for select to authenticated using (bucket_id = 'room-designs' and public.is_admin());
  create policy "room designs admin delete" on storage.objects for delete to authenticated using (bucket_id = 'room-designs' and public.is_admin());
exception when insufficient_privilege then
  raise warning 'STORAGE_POLICIES_NEED_DASHBOARD';
end $$;
