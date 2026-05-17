alter table public.charging_stations
add column if not exists is_approve boolean not null default true;

update public.charging_stations
set is_approve = true
where is_approve is null;

create index if not exists charging_stations_is_approve_idx
on public.charging_stations (is_approve);

create or replace function public.promote_station_owner_to_provider()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_approve = true then
    update public.profiles
    set
      user_type = 'provider',
      is_approved = true
    where id = new.user_id
      and user_type <> 'admin';
  end if;

  return new;
end;
$$;

drop trigger if exists charging_stations_promote_owner_trigger
on public.charging_stations;

create trigger charging_stations_promote_owner_trigger
after insert or update of is_approve, user_id
on public.charging_stations
for each row
when (new.is_approve = true)
execute function public.promote_station_owner_to_provider();

update public.profiles p
set
  user_type = 'provider',
  is_approved = true
where p.user_type <> 'admin'
  and exists (
    select 1
    from public.charging_stations s
    where s.user_id = p.id
      and s.is_approve = true
  );
