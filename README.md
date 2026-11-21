# Gestão Clínica

Página administrativa em fase inicial, publicada como site estático. O acesso ao módulo de pacientes e a persistência usam Supabase Auth e Postgres com Row Level Security.

## Configurar Supabase

1. No Supabase, abra **SQL Editor**, crie uma consulta e execute o conteúdo de [`supabase/migrations/202611210001_patient_foundation.sql`](supabase/migrations/202611210001_patient_foundation.sql).
2. Em **Authentication → Users**, crie a conta administrativa. O site não permite cadastro público de contas.
3. Em **Authentication → URL Configuration**, configure a URL do site publicado no GitHub Pages como **Site URL** e inclua-a em **Redirect URLs**.
4. Publique os arquivos atualizados do repositório. A página usa a URL do projeto e a publishable key no navegador. Essas credenciais são públicas; a proteção dos dados depende das políticas RLS da migration.
5. Abra o site publicado e entre com a conta criada no Supabase.

Não coloque Secret key, `service_role` ou a senha do banco no HTML, no repositório ou em mensagens. Não publique dados de pacientes em arquivos versionados.

## Escopo conectado nesta fase

- Login por e-mail e senha de usuário previamente criado no Supabase.
- Listagem, busca e cadastro de pacientes na tabela `public.patients`.
- Isolamento dos registros por `owner_id = auth.uid()` via RLS.
- Sem política de exclusão de pacientes.

Agenda, atendimentos, cobranças, despesas, relatórios, contratos e Blip ainda não estão integrados. O uso com dados reais deve aguardar revisão das permissões, backups e demais requisitos de segurança e privacidade.

## Observação

O repositório contém apenas código e a migration. Nenhum registro pessoal foi importado dos anexos ou do armazenamento local do navegador.
