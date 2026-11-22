-- Secure archive for importing every populated spreadsheet cell into the signed-in owner's account.
-- Values, cached formula results, formulas, number formats, comments and hyperlinks are retained per cell.

create table if not exists public.workbook_imports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  source_filename text not null,
  file_sha256 text not null check (file_sha256 ~ '^[0-9a-f]{64}$'),
  sheets_meta jsonb not null default '[]'::jsonb,
  workbook_meta jsonb not null default '{}'::jsonb,
  expected_rows integer not null default 0 check (expected_rows >= 0),
  imported_rows integer not null default 0 check (imported_rows >= 0),
  import_status text not null default 'processing' check (import_status in ('processing','complete','incomplete')),
  created_at timestamptz not null default now(),
  unique (owner_id, file_sha256),
  unique (id, owner_id)
);

create table if not exists public.workbook_import_rows (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  import_id uuid not null,
  sheet_name text not null,
  row_number integer not null check (row_number > 0),
  cells jsonb not null default '{}'::jsonb,
  unique (import_id, sheet_name, row_number),
  foreign key (import_id, owner_id)
    references public.workbook_imports(id, owner_id) on delete cascade
);

create index if not exists workbook_imports_owner_created_idx
  on public.workbook_imports (owner_id, created_at desc);
create index if not exists workbook_import_rows_lookup_idx
  on public.workbook_import_rows (owner_id, import_id, sheet_name, row_number);

alter table public.workbook_imports enable row level security;
alter table public.workbook_imports force row level security;
alter table public.workbook_import_rows enable row level security;
alter table public.workbook_import_rows force row level security;

revoke all on public.workbook_imports from anon, authenticated;
revoke all on public.workbook_import_rows from anon, authenticated;
grant select, insert, update on public.workbook_imports to authenticated;
grant select, insert, update on public.workbook_import_rows to authenticated;

drop policy if exists workbook_imports_select_own on public.workbook_imports;
create policy workbook_imports_select_own on public.workbook_imports
  for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists workbook_imports_insert_own on public.workbook_imports;
create policy workbook_imports_insert_own on public.workbook_imports
  for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists workbook_imports_update_own on public.workbook_imports;
create policy workbook_imports_update_own on public.workbook_imports
  for update to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists workbook_import_rows_select_own on public.workbook_import_rows;
create policy workbook_import_rows_select_own on public.workbook_import_rows
  for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists workbook_import_rows_insert_own on public.workbook_import_rows;
create policy workbook_import_rows_insert_own on public.workbook_import_rows
  for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists workbook_import_rows_update_own on public.workbook_import_rows;
create policy workbook_import_rows_update_own on public.workbook_import_rows
  for update to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
