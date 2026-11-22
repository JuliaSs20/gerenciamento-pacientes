-- Structured records derived from the private workbook archive.
-- All source rows remain in workbook_import_rows for audit and reprocessing.

alter table public.patients drop constraint if exists patients_status_check;
alter table public.patients add constraint patients_status_check
  check (status in ('Ativo','Em pausa','Aguardando início','Encerrado','Desistente','A classificar'));
alter table public.patients drop constraint if exists patients_modality_check;
alter table public.patients add constraint patients_modality_check
  check (modality in ('Online','Presencial','Não informado'));
alter table public.patients drop constraint if exists patients_frequency_check;
alter table public.patients add constraint patients_frequency_check
  check (frequency in ('Semanal','Quinzenal','Mensal','Outra','Não informado'));

grant select, insert, update on public.patients to authenticated;
drop policy if exists "patients_insert_own" on public.patients;
create policy "patients_insert_own" on public.patients
  for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists "patients_update_own" on public.patients;
create policy "patients_update_own" on public.patients
  for update to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

do $$ begin
  if not exists (select 1 from pg_constraint where conname='patients_id_owner_key') then
    alter table public.patients add constraint patients_id_owner_key unique (id, owner_id);
  end if;
end $$;

alter table public.workbook_imports
  add column if not exists integration_status text not null default 'pending'
    check (integration_status in ('pending','processing','complete','incomplete'));
alter table public.workbook_imports
  add column if not exists integration_counts jsonb not null default '{}'::jsonb;

create table if not exists public.financial_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  import_id uuid not null,
  patient_id uuid,
  patient_name text,
  record_type text not null check (record_type in ('patient_income','income','expense','investment','credit_card','balance','other')),
  record_scope text not null default 'unknown' check (record_scope in ('clinic','personal','investment','unknown')),
  title text not null,
  amount numeric(14,2),
  currency text not null default 'BRL' check (currency='BRL'),
  occurred_on date,
  reference_label text,
  status text not null default 'unknown' check (status in ('paid','pending','overdue','unknown','not_applicable')),
  payment_method text,
  source_sheet text not null,
  source_row integer not null check (source_row > 0),
  source_key text not null,
  source_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (owner_id, import_id, source_key),
  foreign key (import_id, owner_id)
    references public.workbook_imports(id, owner_id) on delete cascade,
  foreign key (patient_id, owner_id)
    references public.patients(id, owner_id) on delete restrict
);

create index if not exists financial_records_owner_date_idx
  on public.financial_records (owner_id, occurred_on desc);
create index if not exists financial_records_owner_type_idx
  on public.financial_records (owner_id, record_type, record_scope);
create index if not exists financial_records_patient_idx
  on public.financial_records (owner_id, patient_id, occurred_on desc);

alter table public.financial_records enable row level security;
alter table public.financial_records force row level security;
revoke all on public.financial_records from anon, authenticated;
grant select, insert, update on public.financial_records to authenticated;

drop policy if exists financial_records_select_own on public.financial_records;
create policy financial_records_select_own on public.financial_records
  for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists financial_records_insert_own on public.financial_records;
create policy financial_records_insert_own on public.financial_records
  for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists financial_records_update_own on public.financial_records;
create policy financial_records_update_own on public.financial_records
  for update to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
