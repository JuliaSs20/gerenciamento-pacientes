-- Agenda semanal/mensal com consultas vinculadas a pacientes.
-- Execute no Supabase SQL Editor antes de usar a agenda online.

-- Reafirma as permissões de escrita do cadastro de pacientes no caso de a
-- migration inicial local ter sido ajustada antes da implantação.
drop policy if exists "patients_insert_own" on public.patients;
create policy "patients_insert_own" on public.patients
  for insert to authenticated with check (owner_id = (select auth.uid()));

drop policy if exists "patients_update_own" on public.patients;
create policy "patients_update_own" on public.patients
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create table if not exists public.agenda_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  patient_id uuid references public.patients(id),
  item_type text not null check (item_type in ('appointment', 'event', 'task', 'important_date')),
  title text not null check (length(trim(title)) > 0),
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  all_day boolean not null default false,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agenda_appointment_requires_patient
    check (item_type <> 'appointment' or patient_id is not null)
);

create index if not exists agenda_items_owner_start_idx
  on public.agenda_items (owner_id, starts_at);
create index if not exists agenda_items_owner_patient_idx
  on public.agenda_items (owner_id, patient_id, starts_at);

create or replace function public.check_agenda_patient_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.patient_id is not null and not exists (
    select 1 from public.patients p
    where p.id = new.patient_id and p.owner_id = new.owner_id
  ) then
    raise exception 'Paciente não pertence ao usuário autenticado.';
  end if;
  return new;
end;
$$;

drop trigger if exists agenda_items_check_patient_owner on public.agenda_items;
create trigger agenda_items_check_patient_owner
  before insert or update of patient_id, owner_id on public.agenda_items
  for each row execute function public.check_agenda_patient_owner();

alter table public.agenda_items enable row level security;
alter table public.agenda_items force row level security;
revoke all on public.agenda_items from anon, authenticated;
grant select, insert, update on public.agenda_items to authenticated;

drop policy if exists "agenda_select_own" on public.agenda_items;
create policy "agenda_select_own" on public.agenda_items
  for select to authenticated using (owner_id = (select auth.uid()));

drop policy if exists "agenda_insert_own" on public.agenda_items;
create policy "agenda_insert_own" on public.agenda_items
  for insert to authenticated with check (owner_id = (select auth.uid()));

drop policy if exists "agenda_update_own" on public.agenda_items;
create policy "agenda_update_own" on public.agenda_items
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- Sem política de exclusão: itens e histórico da agenda são preservados.
