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

Financeiro, despesas, relatórios, contratos, recorrências automáticas e Blip ainda não estão integrados.
