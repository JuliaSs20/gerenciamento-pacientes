-- Gestão Clínica: cadastro administrativo mínimo de pacientes.
-- Execute no SQL Editor do projeto Supabase antes do primeiro login.

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  full_name text not null check (length(trim(full_name)) > 0),
  status text not null default 'Ativo'
    check (status in ('Ativo', 'Em pausa', 'Aguardando início', 'Encerrado', 'Desistente')),
  city text,
  phone text,
  modality text not null default 'Online' check (modality in ('Online', 'Presencial')),
  frequency text not null default 'Semanal' check (frequency in ('Semanal', 'Quinzenal', 'Mensal', 'Outra')),
  billing_type text not null default 'A definir' check (billing_type in ('MA', 'MP', 'PS', 'A definir')),
  agreed_value numeric(12,2) check (agreed_value is null or agreed_value >= 0),
  start_date date,
  social_value boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists patients_owner_name_idx on public.patients (owner_id, full_name);
create index if not exists patients_owner_status_idx on public.patients (owner_id, status);

alter table public.patients enable row level security;
alter table public.patients force row level security;

revoke all on public.patients from anon, authenticated;
grant select, insert, update on public.patients to authenticated;

drop policy if exists "patients_select_own" on public.patients;
create policy "patients_select_own" on public.patients
  for select to authenticated using (owner_id = (select auth.uid()));

create index if not exists patients_owner_name_idx on public.patients (owner_id, full_name);
create index if not exists patients_owner_status_idx on public.patients (owner_id, status);

alter table public.patients enable row level security;
alter table public.patients force row level security;

revoke all on public.patients from anon, authenticated;
grant select, insert, update on public.patients to authenticated;

drop policy if exists "patients_select_own" on public.patients;
create policy "patients_select_own" on public.patients
  for select to authenticated using (owner_id = (select auth.uid()));

-- Sem política de exclusão: registros são preservados nesta fase inicial.
