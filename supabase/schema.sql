-- Franmarine Vessel SMS — initial schema
-- Run in Supabase → SQL Editor (one go). Safe to re-run.

-- ---------- Enums ----------
do $$ begin
  create type region_code as enum ('NSW', 'WA');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sms_status as enum ('draft', 'current', 'review_due', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role as enum ('crew', 'master', 'manager', 'admin');
exception when duplicate_object then null; end $$;

-- ---------- Profiles (one per auth user; region drives what they see) ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  region     region_code not null,
  role       user_role not null default 'crew',
  created_at timestamptz not null default now()
);

-- Auto-create a profile when a user is invited/created.
-- Region + name are read from user metadata (set them when inviting the user).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, region, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'region')::region_code, 'NSW'),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'crew')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- Vessels ----------
create table if not exists public.vessels (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  slug           text unique,   -- matches src/data/vessels.js (induction content key)
  region         region_code not null,
  uvi            text,
  vessel_class   text,          -- e.g. 2C, 2D, 2E
  home_port      text,
  sms_status     sms_status not null default 'draft',
  sms_revision   text,          -- e.g. 'Rev 02'
  sms_issued     date,
  sms_review_due date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists vessels_region_idx on public.vessels (region, name);

-- ---------- Helper: current user's region / role ----------
create or replace function public.my_region()
returns region_code language sql stable security definer set search_path = public as $$
  select region from public.profiles where id = auth.uid()
$$;

create or replace function public.my_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.vessels  enable row level security;

-- Profiles: you can read your own; admins can read all.
drop policy if exists "profiles: read own"  on public.profiles;
create policy "profiles: read own" on public.profiles
  for select using (id = auth.uid() or public.my_role() = 'admin');

drop policy if exists "profiles: admin manage" on public.profiles;
create policy "profiles: admin manage" on public.profiles
  for all using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

-- Vessels: everyone sees only their region (admins see all).
drop policy if exists "vessels: read own region" on public.vessels;
create policy "vessels: read own region" on public.vessels
  for select using (region = public.my_region() or public.my_role() = 'admin');

-- Vessels: managers/admins can add & edit within their region (admins anywhere).
drop policy if exists "vessels: manage own region" on public.vessels;
create policy "vessels: manage own region" on public.vessels
  for all
  using (
    public.my_role() = 'admin'
    or (public.my_role() = 'manager' and region = public.my_region())
  )
  with check (
    public.my_role() = 'admin'
    or (public.my_role() = 'manager' and region = public.my_region())
  );

-- ---------- Seed: NSW register (from FUS-SMS-xx-01 Rev 01, 7 July 2026) ----------
insert into public.vessels (slug, name, region, uvi, vessel_class, home_port, sms_status, sms_revision, sms_issued, sms_review_due)
values
  ('integrity-iii', 'MV Integrity III', 'NSW', '414562', '2C Restricted', 'Sydney', 'current', 'Rev 01', '2026-07-07', '2027-07-07'),
  ('rohani',        'MV Rohani',        'NSW', '457394', '2C',            'Sydney', 'current', 'Rev 01', '2026-07-07', '2027-07-07'),
  ('seagull',       'MV Seagull',       'NSW', '425689', '2D, 2E',        'Sydney', 'current', 'Rev 01', '2026-07-07', '2027-07-07')
on conflict (slug) do nothing;

-- ---------- Inductions (FUS-SMS-xx-04A register) ----------
create table if not exists public.inductions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  vessel_id        uuid not null references public.vessels(id) on delete cascade,
  sms_revision     text not null,
  acknowledgements jsonb not null,
  signature_name   text not null,
  completed_at     timestamptz not null default now()
);
create index if not exists inductions_user_vessel_idx on public.inductions (user_id, vessel_id, completed_at desc);

-- ---------- Daily sign-ons (fitness-for-work declaration) ----------
create table if not exists public.sign_ons (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  vessel_id      uuid not null references public.vessels(id) on delete cascade,
  sign_on_date   date not null,
  role_today     text not null,
  master_name    text,
  declarations   jsonb not null,
  signature_name text not null,
  signed_at      timestamptz not null default now(),
  unique (user_id, vessel_id, sign_on_date)
);
create index if not exists sign_ons_user_vessel_idx on public.sign_ons (user_id, vessel_id, sign_on_date desc);

alter table public.inductions enable row level security;
alter table public.sign_ons   enable row level security;

-- Crew: insert and read their own records. Managers/admins: read their region's (admins all).
-- Records are never updated or deleted from the app (5-year retention, MO504 Sch 1 cl 9(7)).
drop policy if exists "inductions: insert own" on public.inductions;
create policy "inductions: insert own" on public.inductions
  for insert with check (user_id = auth.uid());
drop policy if exists "inductions: read" on public.inductions;
create policy "inductions: read" on public.inductions
  for select using (
    user_id = auth.uid()
    or public.my_role() = 'admin'
    or (public.my_role() = 'manager' and exists (
      select 1 from public.vessels v where v.id = vessel_id and v.region = public.my_region()))
  );

drop policy if exists "sign_ons: insert own" on public.sign_ons;
create policy "sign_ons: insert own" on public.sign_ons
  for insert with check (user_id = auth.uid());
drop policy if exists "sign_ons: update own today" on public.sign_ons;
create policy "sign_ons: update own today" on public.sign_ons
  for update using (user_id = auth.uid() and sign_on_date = current_date)
  with check (user_id = auth.uid() and sign_on_date = current_date);
drop policy if exists "sign_ons: read" on public.sign_ons;
create policy "sign_ons: read" on public.sign_ons
  for select using (
    user_id = auth.uid()
    or public.my_role() = 'admin'
    or (public.my_role() = 'manager' and exists (
      select 1 from public.vessels v where v.id = vessel_id and v.region = public.my_region()))
  );

-- ---------- Special personnel / guest sign-ons (QR route + master-led) ----------
create table if not exists public.guest_sign_ons (
  id             uuid primary key default gen_random_uuid(),
  vessel_id      uuid not null references public.vessels(id) on delete cascade,
  sign_on_date   date not null,
  full_name      text not null,
  company        text,
  role_today     text not null default 'Special personnel',
  declarations   jsonb not null,
  induction_acks jsonb,
  signature_name text not null,
  added_by       uuid references public.profiles(id) on delete set null, -- master who recorded it (null = self via QR)
  added_by_name  text,
  signed_at      timestamptz not null default now()
);
create index if not exists guest_sign_ons_vessel_date_idx on public.guest_sign_ons (vessel_id, sign_on_date desc);
alter table public.guest_sign_ons enable row level security;

-- The public QR route uses the anon key: visitors may INSERT a sign-on for today only, nothing else.
drop policy if exists "guest: anon insert today" on public.guest_sign_ons;
create policy "guest: anon insert today" on public.guest_sign_ons
  for insert to anon with check (sign_on_date = current_date and added_by is null);
-- Signed-in users (master-led) insert with their own id.
drop policy if exists "guest: authed insert" on public.guest_sign_ons;
create policy "guest: authed insert" on public.guest_sign_ons
  for insert to authenticated with check (added_by = auth.uid());
-- Read: anyone signed in from the vessel's region sees today's guests; managers/admins all dates.
drop policy if exists "guest: read" on public.guest_sign_ons;
create policy "guest: read" on public.guest_sign_ons
  for select to authenticated using (
    public.my_role() = 'admin'
    or exists (select 1 from public.vessels v where v.id = vessel_id and v.region = public.my_region()
               and (sign_on_date = current_date or public.my_role() = 'manager'))
  );

-- Vessel lookup must work for the anon QR route (name, slug, particulars only — no records).
drop policy if exists "vessels: anon read for qr" on public.vessels;
create policy "vessels: anon read for qr" on public.vessels for select to anon using (true);

-- "Today's crew": crew in the same region can see today's sign-ons for the vessel (not history).
drop policy if exists "sign_ons: read today same region" on public.sign_ons;
create policy "sign_ons: read today same region" on public.sign_ons
  for select to authenticated using (
    sign_on_date = current_date
    and exists (select 1 from public.vessels v where v.id = vessel_id and v.region = public.my_region())
  );
-- Names for the crew list come via the profiles join.
drop policy if exists "profiles: read names same region" on public.profiles;
create policy "profiles: read names same region" on public.profiles
  for select to authenticated using (region = public.my_region());

-- ---------- Self-registration + approval ----------
do $$ begin
  create type account_status as enum ('pending', 'approved', 'suspended');
exception when duplicate_object then null; end $$;

alter table public.profiles add column if not exists status account_status not null default 'pending';
alter table public.profiles add column if not exists email text;

-- Company-domain accounts are approved on creation; everyone else waits for a manager.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, region, role, status, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'region')::region_code, 'NSW'),
    'crew',   -- never trust a self-supplied role; managers promote from the Crew page
    case when lower(new.email) like '%@franmarine.com.au' then 'approved' else 'pending' end,
    lower(new.email)
  )
  on conflict (id) do nothing;
  return new;
end $$;

create or replace function public.my_status()
returns account_status language sql stable security definer set search_path = public as $$
  select status from public.profiles where id = auth.uid()
$$;

-- Managers may approve/suspend/re-role crew in their region, but never grant admin or touch admins.
drop policy if exists "profiles: manager update region" on public.profiles;
create policy "profiles: manager update region" on public.profiles
  for update to authenticated
  using (public.my_role() = 'manager' and region = public.my_region() and role <> 'admin' and id <> auth.uid())
  with check (region = public.my_region() and role in ('crew','master','manager'));

-- A pending or suspended account can log in but cannot create any vessel records.
drop policy if exists "inductions: insert own" on public.inductions;
create policy "inductions: insert own" on public.inductions
  for insert with check (user_id = auth.uid() and public.my_status() = 'approved');
drop policy if exists "sign_ons: insert own" on public.sign_ons;
create policy "sign_ons: insert own" on public.sign_ons
  for insert with check (user_id = auth.uid() and public.my_status() = 'approved');
drop policy if exists "guest: authed insert" on public.guest_sign_ons;
create policy "guest: authed insert" on public.guest_sign_ons
  for insert to authenticated with check (added_by = auth.uid() and public.my_status() = 'approved');

-- Nobody can change their own role/status/region through the API.
create or replace function public.protect_profile_self_edit()
returns trigger language plpgsql as $$
begin
  if auth.uid() = new.id and public.my_role() <> 'admin'
     and (new.role <> old.role or new.status <> old.status or new.region <> old.region) then
    raise exception 'You cannot change your own role, status or region.';
  end if;
  return new;
end $$;
drop trigger if exists profiles_protect_self on public.profiles;
create trigger profiles_protect_self before update on public.profiles
  for each row execute procedure public.protect_profile_self_edit();

-- Existing accounts created before this migration: mark approved.
update public.profiles set status = 'approved' where status = 'pending' and created_at < now() - interval '1 minute';

-- ---------- Invitations (manager pre-approval; optional email via edge function) ----------
create table if not exists public.invitations (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  full_name   text not null,
  region      region_code not null,
  role        user_role not null default 'crew',
  invited_by  uuid references public.profiles(id) on delete set null,
  invited_by_name text,
  created_at  timestamptz not null default now(),
  accepted_at timestamptz,
  unique (email)
);
alter table public.invitations enable row level security;

drop policy if exists "invitations: manager region" on public.invitations;
create policy "invitations: manager region" on public.invitations
  for all to authenticated
  using (public.my_role() = 'admin' or (public.my_role() = 'manager' and region = public.my_region()))
  with check (
    (public.my_role() = 'admin' or (public.my_role() = 'manager' and region = public.my_region()))
    and role in ('crew','master','manager') and invited_by = auth.uid()
  );

-- When an invited person registers (any email domain), approve them with the invited role/region.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare inv public.invitations;
begin
  select * into inv from public.invitations where lower(email) = lower(new.email) and accepted_at is null;
  if found then
    insert into public.profiles (id, full_name, region, role, status, email)
    values (new.id, coalesce(nullif(new.raw_user_meta_data->>'full_name',''), inv.full_name), inv.region, inv.role, 'approved'::account_status, lower(new.email))
    on conflict (id) do nothing;
    update public.invitations set accepted_at = now() where id = inv.id;
  else
    insert into public.profiles (id, full_name, region, role, status, email)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      coalesce((new.raw_user_meta_data->>'region')::region_code, 'NSW'),
      'crew'::user_role,
      (case when lower(new.email) like '%@franmarine.com.au' then 'approved' else 'pending' end)::account_status,
      lower(new.email)
    )
    on conflict (id) do nothing;
  end if;
  return new;
end $$;

-- ---------- Pre-departure checks (FUS-SMS-xx-05A) ----------
create table if not exists public.pre_departures (
  id               uuid primary key default gen_random_uuid(),
  vessel_id        uuid not null references public.vessels(id) on delete cascade,
  check_date       date not null,
  master_id        uuid not null references public.profiles(id) on delete cascade,
  master_name      text not null,
  items            jsonb not null,        -- [{id, section, text, critical, result, note}]
  defects          text,
  fit_to_depart    boolean not null,
  fuel_litres      numeric,
  persons_on_board int,
  signature_name   text not null,
  completed_at     timestamptz not null default now()
);
create index if not exists pre_departures_vessel_date_idx on public.pre_departures (vessel_id, check_date desc);
alter table public.pre_departures enable row level security;

drop policy if exists "predep: insert master" on public.pre_departures;
create policy "predep: insert master" on public.pre_departures
  for insert to authenticated
  with check (master_id = auth.uid() and public.my_status() = 'approved'
              and exists (select 1 from public.sign_ons s where s.user_id = auth.uid() and s.vessel_id = vessel_id
                          and s.sign_on_date = current_date and s.role_today = 'Master'));
drop policy if exists "predep: read region" on public.pre_departures;
create policy "predep: read region" on public.pre_departures
  for select to authenticated using (
    public.my_role() = 'admin'
    or exists (select 1 from public.vessels v where v.id = vessel_id and v.region = public.my_region())
  );

-- Managers need to read all inductions / sign-ons in region for the compliance view (already granted
-- for 'manager'; 'admin' everywhere). Crew read only their own + today's crew list.

-- ---------- Alerts digest: who receives it ----------
-- Managers/admins with an email receive the daily digest (edge function `alerts-digest`, see README).
create or replace view public.alert_recipients with (security_invoker = true) as
  select id, full_name, email, region, role from public.profiles
  where status = 'approved' and role in ('manager','admin') and email is not null;
revoke all on public.alert_recipients from anon, authenticated;  -- service role (digest function) only

-- ---------- Emergency drill records (FUS-SMS-xx-04B) ----------
create table if not exists public.drills (
  id                 uuid primary key default gen_random_uuid(),
  vessel_id          uuid not null references public.vessels(id) on delete cascade,
  drill_type         text not null,   -- fire | mob | medical | abandon | flooding | diving | other
  drill_type_other   text,
  drill_date         date not null,
  location           text,
  scenario           text not null,
  participants       jsonb not null,  -- [{name, role, kind, user_id}]
  outcome            text,
  corrective_actions text,
  notes              text,
  conducted_by       uuid not null references public.profiles(id) on delete cascade,
  conducted_by_name  text not null,
  signature_name     text not null,
  created_at         timestamptz not null default now()
);
create index if not exists drills_vessel_type_date_idx on public.drills (vessel_id, drill_type, drill_date desc);
alter table public.drills enable row level security;

-- Masters (signed on today as Master) and managers/admins record drills; everyone in region reads.
drop policy if exists "drills: insert" on public.drills;
create policy "drills: insert" on public.drills
  for insert to authenticated
  with check (conducted_by = auth.uid() and public.my_status() = 'approved' and (
    public.my_role() in ('manager','admin')
    or exists (select 1 from public.sign_ons s where s.user_id = auth.uid() and s.vessel_id = vessel_id
               and s.sign_on_date = current_date and s.role_today = 'Master')));
drop policy if exists "drills: read region" on public.drills;
create policy "drills: read region" on public.drills
  for select to authenticated using (
    public.my_role() = 'admin'
    or exists (select 1 from public.vessels v where v.id = vessel_id and v.region = public.my_region()));

-- ---------- Hardening (advisor) ----------
revoke execute on function public.handle_new_user() from anon, authenticated, public;
grant execute on function public.handle_new_user() to supabase_auth_admin;  -- the auth service fires the trigger
revoke execute on function public.protect_profile_self_edit() from anon, authenticated, public;
revoke execute on function public.my_region() from anon, public;
revoke execute on function public.my_role() from anon, public;
revoke execute on function public.my_status() from anon, public;
alter function public.protect_profile_self_edit() set search_path = public;
