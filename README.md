# Gestão Clínica

Página administrativa em fase inicial. O login e os cadastros de pacientes usam Supabase. Os itens da agenda ficam no armazenamento local do navegador, identificados por conta autenticada.

## Agenda

- Visualização semanal por horário e mensal por dia.
- Consultas podem ser vinculadas a pacientes; eventos, tarefas e datas importantes não mostram campo de paciente.
- Para apagar um registro, abra o item já salvo e use **Apagar registro**. O site pede confirmação antes de remover o item do navegador atual.
- A agenda persiste ao fechar/reabrir o navegador e reiniciar o computador, desde que os dados locais do site não sejam apagados.
- Os itens não são sincronizados entre dispositivos ou navegadores.
- A migration antiga `supabase/migrations/202611220001_agenda.sql` não é usada pela versão atual da agenda e não precisa ser executada.

## Supabase

A tabela de pacientes usa `supabase/migrations/202611210001_patient_foundation.sql`. O site usa uma publishable key pública e RLS. Nunca coloque Secret key, `service_role` ou senha do banco no HTML ou no repositório.

Financeiro, despesas, relatórios, contratos, recorrências automáticas e Blip ainda não estão integrados como cadastros estruturados.

## Importação da planilha financeira

- A tela **Financeiro** permite importar uma planilha `.xls`, `.xlsx` ou `.xlsm` depois do login.
- A planilha é lida no navegador. O arquivo original não é enviado; as linhas preenchidas, valores em cache, fórmulas, formatos numéricos, comentários, hyperlinks e metadados das abas são armazenados nas tabelas `workbook_imports` e `workbook_import_rows`.
- Os registros ficam associados ao usuário autenticado por políticas RLS. O repositório contém apenas o importador e a migration, nunca os dados da planilha.
- Para habilitar a tela, execute `supabase/migrations/202611220002_workbook_imports.sql` no SQL Editor do projeto Supabase e publique os arquivos do repositório.
- Depois, entre no site, abra **Financeiro** e escolha **Selecionar planilha e importar**. As abas importadas podem ser consultadas no próprio site.
- Código VBA não é executado nem migrado. A planilha fica arquivada como dados por aba; os registros não são automaticamente convertidos em cadastros da tela **Pacientes**, lançamentos financeiros estruturados ou itens da agenda.
