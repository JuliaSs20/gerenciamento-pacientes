# Gestão Clínica

Página administrativa em fase inicial, publicada como site estático. Pacientes e agenda usam Supabase Auth e Postgres com Row Level Security.

## Configurar Supabase

1. A base de pacientes requer `supabase/migrations/202611210001_patient_foundation.sql` (já executada no projeto, conforme confirmação anterior).
2. Para ativar a agenda, execute no SQL Editor a migration `supabase/migrations/202611220001_agenda.sql`.
3. Em **Authentication → Users**, mantenha a conta administrativa criada. O site não permite cadastro público de contas.
4. Em **Authentication → URL Configuration**, configure a URL publicada no GitHub Pages como **Site URL** e adicione-a a **Redirect URLs**.
5. Confira as alterações locais, faça commit e push pelo GitHub Desktop para publicar a versão nova.

Não coloque Secret key, `service_role` ou senha do banco no HTML, no repositório ou em mensagens. A publishable key no HTML é pública; a proteção depende das políticas RLS.

## Funcionalidades conectadas

- Login por e-mail e senha de usuário previamente criado no Supabase.
- Listagem, busca e cadastro de pacientes.
- Agenda com visualização semanal por horário e mensal por dia.
- Consultas vinculadas a pacientes, além de eventos, tarefas e datas importantes sem paciente.
- Itens da agenda podem ser editados e marcados como realizados ou cancelados; não há exclusão definitiva.
- RLS isola os dados pelo usuário autenticado.

Financeiro, despesas, relatórios, contratos, recorrências automáticas e Blip ainda não estão integrados. A agenda mostra automaticamente as consultas cadastradas por ela, inclusive as iniciadas pelo botão **Agendar** na lista de pacientes. Recorrências semanais automáticas serão uma etapa posterior.

Nenhum registro pessoal foi importado dos anexos ou do armazenamento local do navegador.
