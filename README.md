# Gestão Clínica

Painel administrativo com autenticação Supabase, cadastro de pacientes, agenda semanal/mensal e importação da planilha financeira.

## Importação e integração do Excel

- Na tela **Financeiro**, entre com a conta do Supabase e selecione o arquivo `.xls`, `.xlsx` ou `.xlsm`.
- O importador guarda todas as abas e linhas preenchidas em tabelas privadas do Supabase e mantém fórmulas, valores em cache, formatos, comentários, hyperlinks e metadados para conferência.
- A mesma importação converte informações reconhecíveis em registros nativos: pacientes e valores acordados vão para **Pacientes**; cobranças, receitas, despesas, cartão, investimentos e saldos aparecem em **Financeiro** ou **Despesas**. Cada lançamento mostra aba e linha de origem e pode ser filtrado por tipo e escopo.
- Pacientes sem modalidade, frequência ou situação claramente identificada recebem campos “Não informado” ou “A classificar”. O importador preenche campos vazios de pacientes já existentes, sem substituir os dados já cadastrados.
- Valores sem data, status de pagamento ou finalidade clara continuam identificados como “A classificar”; os valores nunca são tratados como pagos ou como receita profissional sem indicação no Excel.
- Dados que não podem ser interpretados com segurança continuam disponíveis na cópia completa por abas. O código e o repositório não contêm os nomes nem os valores da planilha.
- A grade da aba **Agenda** só é convertida em consultas quando há data válida, horário e correspondência exata de paciente. Uma grade com códigos/dias sem datas reconhecíveis permanece na aba arquivada para conferência, sem criar consultas inventadas.

### Configuração necessária

No SQL Editor do Supabase, execute nesta ordem, se ainda não executadas:

1. `supabase/migrations/202611220002_workbook_imports.sql`
2. `supabase/migrations/202611220003_financial_records.sql`

A migration de pacientes é `supabase/migrations/202611210001_patient_foundation.sql`. Depois de publicar os arquivos do site, abra **Financeiro** e selecione novamente o mesmo Excel já arquivado. O site reconhece o arquivo e completa a integração estruturada sem duplicar o arquivo original.

As tabelas de arquivo e de registros financeiros usam políticas RLS para que cada conta veja apenas seus próprios dados. Nunca coloque Secret key, `service_role` ou senha do banco no HTML ou no GitHub.

## Agenda

- Visualização semanal por horário e mensal por dia.
- Consultas podem ser vinculadas a pacientes; eventos, tarefas e datas importantes não mostram campo de paciente.
- Itens da agenda persistem no armazenamento local do navegador. Eles não são sincronizados entre dispositivos e dependem de não apagar os dados locais do site.
- A migration antiga `supabase/migrations/202611220001_agenda.sql` não é usada pela versão atual da agenda.

## Limites desta etapa

Os dados importados já alimentam listas e tabelas de pacientes e finanças, mas os relatórios avançados (fechamento mensal, recorrências, gráficos de fluxo de caixa, conciliação e edição de lançamentos) ainda precisam de regras de negócio específicas. O importador preserva os dados e sua origem para revisão antes dessas automações.
