# Gestão Clínica

Página administrativa em fase inicial. O login e o cadastro de pacientes usam Supabase. A agenda é salva somente no armazenamento local do navegador.

## Supabase

- A tabela de pacientes usa a migration `supabase/migrations/202611210001_patient_foundation.sql`.
- A conta administrativa é criada em **Authentication → Users**; não há cadastro público no site.
- Configure a URL do GitHub Pages em **Authentication → URL Configuration**.
- A chave publishable no HTML é pública. Nunca coloque Secret key, `service_role` ou senha do banco no HTML ou no repositório.

## Agenda

- Visualização semanal por horário e mensal por dia.
- Consultas podem ser vinculadas a um paciente e também iniciadas pelo botão **Agendar** na lista de pacientes.
- Eventos, tarefas e datas importantes não têm campo de paciente.
- Os itens ficam no navegador atual e não são sincronizados pelo Supabase com outros dispositivos ou navegadores.
- A migration `202611220001_agenda.sql` não é necessária para esta versão local da agenda; não a execute para ativar a funcionalidade.

Financeiro, despesas, relatórios, contratos, recorrências automáticas e Blip ainda não estão integrados. A agenda não importa registros automaticamente de outras fontes.
