/* Link archived workbook rows to native patients and financial screens. */
let financialRecords=[];
const financeTypeFilter=document.getElementById('financeTypeFilter');
const financeScopeFilter=document.getElementById('financeScopeFilter');
const financialStatus=document.getElementById('financialDataStatus');

const financialTypeLabels={patient_income:'Cobrança de paciente',income:'Receita',expense:'Despesa',investment:'Investimento',credit_card:'Cartão',balance:'Saldo',other:'Registro importado'};
const financialScopeLabels={clinic:'Consultório',personal:'Pessoal',investment:'Investimentos',unknown:'Não classificado'};
const statusLabels={paid:'Pago',pending:'Pendente',overdue:'Atrasado',unknown:'A classificar',not_applicable:'—'};
function financeText(value){return value===null||value===undefined?'':String(value).trim()}
function financeNorm(value){return financeText(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function financeMoney(value){return value===null||value===undefined||!Number.isFinite(Number(value))?'—':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value))}
function excelDateParts(value){if(typeof value!=='number'||value<20000||value>90000||typeof XLSX==='undefined')return null;const p=XLSX.SSF.parse_date_code(value);return p?.y>=2000&&p?.m>=1&&p?.d>=1?{year:p.y,month:p.m,day:p.d}:null}
function excelDateIso(value){const p=excelDateParts(value);return p?String(p.year).padStart(4,'0')+'-'+String(p.month).padStart(2,'0')+'-'+String(p.day).padStart(2,'0'):null}
function recordCells(workbook,sheetName,rowNumber){
  const sheet=workbook.Sheets[sheetName],out={};if(!sheet)return out;
  const range=XLSX.utils.decode_range(sheet['!ref']||'A1:A1');
  for(let c=range.s.c;c<=range.e.c;c++){const cell=sheet[XLSX.utils.encode_cell({r:rowNumber-1,c})];if(cell&&(cell.v!==undefined||cell.f))out[XLSX.utils.encode_col(c)]=excelCellRecord(cell)}
  return out;
}
function headerField(value){
  const x=financeNorm(value);
  if(['nome','nome completo','paciente'].includes(x))return 'patient';
  if(['valor','valor r','valor rs','valores','amount'].includes(x))return 'amount';
  if(['data','data pagamento','data sessao','data consulta'].includes(x))return 'date';
  if(['dia','dia modo'].includes(x))return 'day';
  if(['descricao','historico','item'].includes(x))return 'description';
  if(['pago','pgto','pagamento'].includes(x))return 'paid';
  if(['freq','frequencia'].includes(x))return 'frequency';
  if(['cobr','cobranca','tipo cobranca'].includes(x))return 'billing';
  if(['modo','modalidade','forma pagamento'].includes(x))return 'method';
  if(['mes','competencia','periodo'].includes(x))return 'period';
  if(['cidade'].includes(x))return 'city';
  if(['telefone','whatsapp','celular'].includes(x))return 'phone';
  return null;
}
function patientName(value){
  if(typeof value!=='string')return null;const name=value.trim();const n=financeNorm(name);
  if(name.length<3||name.length>120||/^\d+$/.test(name)||['total','sub total','media','pago','nome','paciente','despesas','valores'].includes(n))return null;
  return name;
}
function headerTables(workbook){
  const tables=[];
  for(const sheetName of workbook.SheetNames){
    const sheet=workbook.Sheets[sheetName];if(!sheet?.['!ref'])continue;const range=XLSX.utils.decode_range(sheet['!ref']);
    for(let r=range.s.r;r<=range.e.r;r++){
      const labels=[];for(let c=range.s.c;c<=range.e.c;c++){const cell=sheet[XLSX.utils.encode_cell({r,c})];const field=cell&&!cell.f?headerField(cell.v):null;if(field)labels.push({c,field})}
      for(const label of labels.filter(x=>x.field==='patient')){
        const amounts=labels.filter(x=>x.field==='amount'&&Math.abs(x.c-label.c)<=8).sort((a,b)=>Math.abs(a.c-label.c)-Math.abs(b.c-label.c));
        const dates=labels.filter(x=>(x.field==='date'||x.field==='day')&&Math.abs(x.c-label.c)<=8).sort((a,b)=>Math.abs(a.c-label.c)-Math.abs(b.c-label.c));
        const amount=amounts[0]||null,date=dates[0]||null;if(!amount&&!date)continue;
        const fields=labels.filter(x=>Math.abs(x.c-label.c)<=8);
        const key=[sheetName,r+1,label.c,amount?.c??'na',date?.c??'na'].join(':');if(!tables.some(t=>t.key===key))tables.push({key,sheetName,headerRow:r+1,patientCol:label.c,amountCol:amount?.c??null,dateCol:date?.c??null,fields});
      }
      for(const desc of labels.filter(x=>x.field==='description')){
        const amount=labels.filter(x=>x.field==='amount'&&Math.abs(x.c-desc.c)<=6).sort((a,b)=>Math.abs(a.c-desc.c)-Math.abs(b.c-desc.c))[0];
        if(!amount)continue;const fields=labels.filter(x=>Math.abs(x.c-desc.c)<=6);const key=[sheetName,r+1,'desc',desc.c,amount.c].join(':');if(!tables.some(t=>t.key===key))tables.push({key,sheetName,headerRow:r+1,descriptionCol:desc.c,amountCol:amount.c,fields});
      }
    }
  }
  return tables;
}
function rowDataFor(workbook,sheetName,row){return recordCells(workbook,sheetName,row)}
function billingValue(value){const n=financeNorm(value);if(n==='ma'||n.includes('mes a'))return 'MA';if(n==='mp'||n.includes('mes p'))return 'MP';if(n==='ps'||n.includes('por sessao'))return 'PS';return 'A definir'}
function frequencyValue(value){const n=financeNorm(value);if(n.includes('semanal'))return 'Semanal';if(n.includes('quinzenal'))return 'Quinzenal';if(n.includes('mensal'))return 'Mensal';return 'Não informado'}
function modalityValue(value){const n=financeNorm(value);if(n==='online')return 'Online';if(n==='presencial')return 'Presencial';return 'Não informado'}
function paymentStatus(value){if(value===true)return 'paid';if(value===false)return 'pending';if(typeof value==='number')return value>0?'paid':value===0?'pending':'unknown';const n=financeNorm(value);if(/\b(pago|paga|recebido|sim|true|ok)\b/.test(n))return 'paid';if(/\b(pendente|nao|não|false|aberto|a receber)\b/.test(n))return 'pending';return 'unknown'}
function pushPatient(map,profile){
  const name=patientName(profile.full_name);if(!name)return;
  const key=financeNorm(name);const prior=map.get(key)||{};
  map.set(key,{...prior,...profile,full_name:name,
    status:'A classificar',modality:profile.modality&&profile.modality!=='Não informado'?profile.modality:(prior.modality||'Não informado'),
    frequency:profile.frequency&&profile.frequency!=='Não informado'?profile.frequency:(prior.frequency||'Não informado'),billing_type:profile.billing_type&&profile.billing_type!=='A definir'?profile.billing_type:(prior.billing_type||'A definir'),
    agreed_value:prior.agreed_value!==null&&prior.agreed_value!==undefined?prior.agreed_value:(profile.agreed_value??null)});
}
function addRecord(out,record){
  if(!record||!record.source_key)return;
  if(record.amount!==null&&record.amount!==undefined){const n=Number(record.amount);if(!Number.isFinite(n))return;record.amount=Math.round(n*100)/100}
  out.push(record);
}
function mapWorkbookToSite(workbook,importId){
  const profiles=new Map(),records=[],tables=headerTables(workbook);
  const scopeForPatient=sheet=>['Balancete','Balancete (Outubro)'].includes(sheet)?'clinic':'unknown';
  for(const table of tables){
    const sheet=workbook.Sheets[table.sheetName],range=XLSX.utils.decode_range(sheet['!ref']);let blank=0;
    for(let r=table.headerRow+1;r<=Math.min(range.e.r+1,table.headerRow+80);r++){
      const rowNo=r,nameCell=sheet[XLSX.utils.encode_cell({r:r-1,c:table.patientCol})],name=patientName(nameCell?.v);
      if(!name){blank++;if(blank>=4)break;continue}blank=0;
      const values={};for(const f of table.fields){const cell=sheet[XLSX.utils.encode_cell({r:r-1,c:f.c})];values[f.field]=cell?.v}
      const raw=rowDataFor(workbook,table.sheetName,rowNo),amt=table.amountCol===null?null:sheet[XLSX.utils.encode_cell({r:r-1,c:table.amountCol})];
      const bill=billingValue(values.billing),recordType=amt&&typeof amt.v==='number'?'patient_income':null;
      pushPatient(profiles,{full_name:name,billing_type:bill,frequency:frequencyValue(values.frequency),modality:modalityValue(values.method),agreed_value:recordType&&amt.v>=0?amt.v:null,source_sheet:table.sheetName,source_row:rowNo});
      if(recordType){
        const paidField=table.fields.find(f=>f.field==='paid'),paidValue=paidField?sheet[XLSX.utils.encode_cell({r:r-1,c:paidField.c})]?.v:null;
        const date=table.dateCol===null?null:sheet[XLSX.utils.encode_cell({r:r-1,c:table.dateCol})]?.v;
        const period=values.period||values.billing||null;
        addRecord(records,{source_key:`${table.sheetName}:r${rowNo}:c${XLSX.utils.encode_col(table.amountCol)}`,source_sheet:table.sheetName,source_row:rowNo,record_type:'patient_income',record_scope:scopeForPatient(table.sheetName),title:'Cobrança de paciente',patient_name:name,patient_id:null,amount:amt.v,occurred_on:excelDateIso(date),reference_label:date&&typeof date==='number'&&!excelDateIso(date)&&Number.isInteger(date)?'Dia '+date:(period?String(period):null),status:paidField?paymentStatus(paidValue):'unknown',payment_method:modalityValue(values.method)==='Não informado'?null:modalityValue(values.method),source_data:raw,import_id:importId});
      }
    }
  }
  for(const table of tables.filter(t=>t.descriptionCol!==undefined)){
    const sheet=workbook.Sheets[table.sheetName],range=XLSX.utils.decode_range(sheet['!ref']);let blank=0;
    for(let r=table.headerRow+1;r<=Math.min(range.e.r+1,table.headerRow+100);r++){
      const rowNo=r,desc=financeText(sheet[XLSX.utils.encode_cell({r:r-1,c:table.descriptionCol})]?.v),amountCell=sheet[XLSX.utils.encode_cell({r:r-1,c:table.amountCol})];
      if(!desc){blank++;if(blank>=4)break;continue}blank=0;if(!amountCell||typeof amountCell.v!=='number')continue;
      const dayField=table.fields.find(f=>f.field==='day'),day=dayField?sheet[XLSX.utils.encode_cell({r:r-1,c:dayField.c})]?.v:null;
      addRecord(records,{source_key:`${table.sheetName}:r${rowNo}:c${XLSX.utils.encode_col(table.amountCol)}`,source_sheet:table.sheetName,source_row:rowNo,record_type:'expense',record_scope:table.sheetName.startsWith('Balancete')?'clinic':'unknown',title:desc,patient_name:null,patient_id:null,amount:amountCell.v,occurred_on:excelDateIso(day),reference_label:day&&typeof day==='number'&&!excelDateIso(day)?'Dia '+day:null,status:'unknown',payment_method:null,source_data:rowDataFor(workbook,table.sheetName,rowNo),import_id:importId});
    }
  }
  mapMonthlyExpenseTracker(workbook,records,importId);
  mapCreditCardTracker(workbook,records,importId);
  mapInvestments(workbook,records,importId);
  mapReformTracker(workbook,records,importId);
  const uniqueRecords=new Map(records.map(record=>[record.source_key,record]));
  return {profiles:Array.from(profiles.values()),records:Array.from(uniqueRecords.values()),agenda:mapAgendaGrid(workbook,profiles)};
}
function mapMonthlyExpenseTracker(workbook,out,importId){
  const name='Acompanhamento Despesas',sheet=workbook.Sheets[name];if(!sheet?.['!ref'])return;const range=XLSX.utils.decode_range(sheet['!ref']);let group='unknown';
  for(let r=1;r<=range.e.r;r++){
    const section=financeNorm(sheet[XLSX.utils.encode_cell({r,c:0})]?.v);
    if(section==='receitas')group='income';else if(section==='despesas')group='expense';else if(section==='saldo')group='balance';
    const label=financeText(sheet[XLSX.utils.encode_cell({r,c:1})]?.v)||financeText(sheet[XLSX.utils.encode_cell({r,c:0})]?.v);
    const norm=financeNorm(label);if(!label||/^(total|saldo|saldo cc|saldo \$\$)$/.test(norm)||['receitas','despesas'].includes(norm))continue;
    for(let c=3;c<=19;c++){
      const cell=sheet[XLSX.utils.encode_cell({r,c})];if(!cell||typeof cell.v!=='number')continue;
      const header=sheet[XLSX.utils.encode_cell({r:0,c})]?.v,when=excelDateIso(header);if(!when)continue;
      let type=group==='income'?'income':group==='expense'?'expense':'balance';let scope=/salario|salário/.test(norm)?'personal':'unknown';
      addRecord(out,{source_key:`${name}:r${r+1}:c${XLSX.utils.encode_col(c)}`,source_sheet:name,source_row:r+1,record_type:type,record_scope:scope,title:label,patient_name:null,patient_id:null,amount:cell.v,occurred_on:when,reference_label:null,status:'unknown',payment_method:null,source_data:recordCells(workbook,name,r+1),import_id:importId});
    }
  }
}
function mapCreditCardTracker(workbook,out,importId){
  const name='Acompanhamento CC',sheet=workbook.Sheets[name];if(!sheet?.['!ref'])return;const range=XLSX.utils.decode_range(sheet['!ref']);
  for(let r=2;r<=range.e.r;r++){
    const label=financeText(sheet[XLSX.utils.encode_cell({r,c:0})]?.v);if(!label)continue;
    for(const col of [1,3,5]){const cell=sheet[XLSX.utils.encode_cell({r,c:col})];if(!cell||typeof cell.v!=='number')continue;let month='';for(let h=0;h<=col;h++){const v=financeText(sheet[XLSX.utils.encode_cell({r:0,c:h})]?.v);if(v)month=v}
      addRecord(out,{source_key:`${name}:r${r+1}:c${XLSX.utils.encode_col(col)}`,source_sheet:name,source_row:r+1,record_type:'credit_card',record_scope:'unknown',title:label,patient_name:null,patient_id:null,amount:cell.v,occurred_on:null,reference_label:month?month+' · coluna '+XLSX.utils.encode_col(col):'Mês sem ano',status:'unknown',payment_method:'Cartão de crédito',source_data:recordCells(workbook,name,r+1),import_id:importId});
    }
  }
}
function mapInvestments(workbook,out,importId){
  const name='Investimentos',sheet=workbook.Sheets[name];if(!sheet?.['!ref'])return;
  const range=XLSX.utils.decode_range(sheet['!ref']);
  for(let r=1;r<=range.e.r;r++){
    const label=patientName(sheet[XLSX.utils.encode_cell({r,c:1})]?.v);if(!label)continue;
    for(const col of [6,7,8]){
      const cell=sheet[XLSX.utils.encode_cell({r,c:col})];if(!cell||typeof cell.v!=='number')continue;
      const fmt=String(cell.z||'').toLowerCase();if(fmt.includes('%')||excelDateParts(cell.v))continue;
      const header=sheet[XLSX.utils.encode_cell({r:0,c:col})]?.v,ref=typeof header==='number'?excelDateIso(header):financeText(header)||'Valor da planilha';
      const n=financeNorm(label),type=/total|media|saldo/.test(n)?'balance':'investment';
      addRecord(out,{source_key:`${name}:r${r+1}:c${XLSX.utils.encode_col(col)}`,source_sheet:name,source_row:r+1,record_type:type,record_scope:'investment',title:label+' · '+ref,patient_name:null,patient_id:null,amount:cell.v,occurred_on:typeof header==='number'?excelDateIso(header):null,reference_label:typeof header==='number'?null:String(ref),status:'not_applicable',payment_method:null,source_data:recordCells(workbook,name,r+1),import_id:importId});
    }
  }
}
function mapReformTracker(workbook,out,importId){
  const name='Balancete (Outubro)',sheet=workbook.Sheets[name];if(!sheet?.['!ref'])return;
  const range=XLSX.utils.decode_range(sheet['!ref']);
  for(let r=2;r<=range.e.r;r++){
    const month=financeText(sheet[XLSX.utils.encode_cell({r,c:29})]?.v);
    const amount=sheet[XLSX.utils.encode_cell({r,c:31})],balance=sheet[XLSX.utils.encode_cell({r,c:32})];
    if(amount&&typeof amount.v==='number')addRecord(out,{source_key:`${name}:reforma:r${r+1}:AF`,source_sheet:name,source_row:r+1,record_type:'other',record_scope:'unknown',title:'Controle de reforma',patient_name:null,patient_id:null,amount:amount.v,occurred_on:null,reference_label:month||null,status:'unknown',payment_method:null,source_data:recordCells(workbook,name,r+1),import_id:importId});
    if(balance&&typeof balance.v==='number')addRecord(out,{source_key:`${name}:reforma:r${r+1}:AG`,source_sheet:name,source_row:r+1,record_type:'balance',record_scope:'unknown',title:'Saldo do controle de reforma',patient_name:null,patient_id:null,amount:balance.v,occurred_on:null,reference_label:month||null,status:'not_applicable',payment_method:null,source_data:recordCells(workbook,name,r+1),import_id:importId});
  }
}
function mapAgendaGrid(workbook,profiles){
  const name='Agenda',sheet=workbook.Sheets[name];if(!sheet?.['!ref'])return [];
  const patientsByName=new Map(profiles.map(p=>[financeNorm(p.full_name),p]));const out=[];
  for(let c=1;c<=6;c++){
    const dateCell=sheet[XLSX.utils.encode_cell({r:1,c})],date=excelDateIso(dateCell?.v);if(!date)continue;
    for(let r=4;r<=17;r++){
      const timeCell=sheet[XLSX.utils.encode_cell({r,c:0})],nameCell=sheet[XLSX.utils.encode_cell({r,c})];
      const patient=patientsByName.get(financeNorm(nameCell?.v));if(!patient||typeof timeCell?.v!=='number'||timeCell.v<0||timeCell.v>=1)continue;
      const time=XLSX.SSF.format('hh:mm',timeCell.v),start=new Date(date+'T'+time+':00-03:00');if(Number.isNaN(start.getTime()))continue;
      const end=new Date(start.getTime()+50*60000);
      out.push({source_key:`${name}:${XLSX.utils.encode_cell({r,c})}`,patient_name:patient.full_name,date,start_time:time,end_time:end.toISOString().slice(11,16),starts_at:start.toISOString(),ends_at:end.toISOString(),all_day:false});
    }
  }
  return out;
}
async function integrateStructuredWorkbook(workbook,importId){
  if(!currentUser)throw new Error('Entre na sua conta antes de integrar os dados.');
  const {data:batch,error:batchError}=await sb.from('workbook_imports').select('integration_status,integration_counts').eq('id',importId).single();if(batchError)throw batchError;
  if(batch.integration_status==='complete'){await loadFinancialRecords();return batch.integration_counts||{}}
  await sb.from('workbook_imports').update({integration_status:'processing'}).eq('id',importId);
  try{
    const mapped=mapWorkbookToSite(workbook,importId);
    const {data:existing,error:existingError}=await sb.from('patients').select('id,full_name,city,phone,modality,frequency,billing_type,agreed_value,start_date').order('full_name');if(existingError)throw existingError;
    const patientByName=new Map((existing||[]).map(p=>[financeNorm(p.full_name),p]));
    const toCreate=mapped.profiles.filter(p=>!patientByName.has(financeNorm(p.full_name))).map(p=>({owner_id:currentUser.id,full_name:p.full_name,status:'A classificar',city:p.city||null,phone:p.phone||null,modality:p.modality||'Não informado',frequency:p.frequency||'Não informado',billing_type:p.billing_type||'A definir',agreed_value:p.agreed_value===null?null:p.agreed_value,start_date:p.start_date||null,social_value:false}));
    for(let i=0;i<toCreate.length;i+=50){const {error}=await sb.from('patients').insert(toCreate.slice(i,i+50));if(error)throw error}
    for(const profile of mapped.profiles){
      const old=patientByName.get(financeNorm(profile.full_name));if(!old)continue;
      const patch={};
      if(!old.city&&profile.city)patch.city=profile.city;
      if(!old.phone&&profile.phone)patch.phone=profile.phone;
      if((!old.modality||old.modality==='Não informado')&&profile.modality)patch.modality=profile.modality;
      if((!old.frequency||old.frequency==='Não informado')&&profile.frequency)patch.frequency=profile.frequency;
      if((!old.billing_type||old.billing_type==='A definir')&&profile.billing_type&&profile.billing_type!=='A definir')patch.billing_type=profile.billing_type;
      if(old.agreed_value===null&&profile.agreed_value!==null&&profile.agreed_value!==undefined)patch.agreed_value=profile.agreed_value;
      if(!old.start_date&&profile.start_date)patch.start_date=profile.start_date;
      if(Object.keys(patch).length){const {error}=await sb.from('patients').update(patch).eq('id',old.id);if(error)throw error}
    }
    const {data:patientsNow,error:patientLoadError}=await sb.from('patients').select('id,full_name').order('full_name');if(patientLoadError)throw patientLoadError;
    const patientMap=new Map((patientsNow||[]).map(p=>[financeNorm(p.full_name),p]));
    const financeRows=mapped.records.map(r=>({owner_id:currentUser.id,import_id:importId,source_key:r.source_key,source_sheet:r.source_sheet,source_row:r.source_row,record_type:r.record_type,record_scope:r.record_scope,title:r.title,amount:r.amount,currency:'BRL',occurred_on:r.occurred_on,reference_label:r.reference_label,status:r.status,payment_method:r.payment_method,patient_name:r.patient_name,patient_id:r.patient_name?patientMap.get(financeNorm(r.patient_name))?.id||null:null,source_data:r.source_data}));
    for(let i=0;i<financeRows.length;i+=50){const {error}=await sb.from('financial_records').upsert(financeRows.slice(i,i+50),{onConflict:'owner_id,import_id,source_key'});if(error)throw error}
    const appointmentCount=mergeImportedAppointments(mapped.agenda,importId);
    const counts={patients_created:toCreate.length,patient_candidates:mapped.profiles.length,financial_records:financeRows.length,appointments_added:appointmentCount};
    const {error:finishError}=await sb.from('workbook_imports').update({integration_status:'complete',integration_counts:counts}).eq('id',importId);if(finishError)throw finishError;
    await loadPatients();await loadFinancialRecords();
    return counts;
  }catch(error){await sb.from('workbook_imports').update({integration_status:'incomplete'}).eq('id',importId);throw error}
}
function mergeImportedAppointments(rows,importId){
  if(!currentUser||!rows.length)return 0;const key=agendaStorageKey();let existing=[];try{existing=JSON.parse(localStorage.getItem(key)||'[]')}catch{existing=[]}if(!Array.isArray(existing))existing=[];
  const have=new Set(existing.map(x=>x.source_key).filter(Boolean));let added=0;
  for(const item of rows){const sourceKey='workbook:'+importId+':'+item.source_key;if(have.has(sourceKey))continue;const patient=patients.find(p=>financeNorm(p.full_name)===financeNorm(item.patient_name));if(!patient)continue;
    existing.push({id:crypto.randomUUID(),owner_id:currentUser.id,patient_id:patient.id,patient_name:patient.full_name,item_type:'appointment',title:'Consulta — '+patient.full_name,description:'Importada da aba Agenda da planilha',starts_at:item.starts_at,ends_at:item.ends_at,all_day:false,status:'scheduled',source_key:sourceKey,created_at:new Date().toISOString(),updated_at:new Date().toISOString()});have.add(sourceKey);added++;
  }
  if(added){try{localStorage.setItem(key,JSON.stringify(existing));agendaItems=existing;renderAgenda()}catch{financialStatus.textContent='Dados financeiros integrados; o navegador não conseguiu armazenar as consultas importadas da aba Agenda.'}}
  return added;
}
async function loadFinancialRecords(){
  if(!currentUser){financialRecords=[];renderFinancialRecords();return}
  const {data,error}=await sb.from('financial_records').select('id,record_type,record_scope,title,amount,occurred_on,reference_label,status,payment_method,patient_id,patient_name,source_sheet,source_row').order('occurred_on',{ascending:false}).limit(3000);
  if(error){if(financialStatus)financialStatus.textContent='Para integrar pacientes e finanças, aplique a migration 202611220003_financial_records.sql no Supabase.';return}
  financialRecords=data||[];if(financialStatus)financialStatus.textContent=financialRecords.length?'Dados financeiros vinculados aos pacientes e separados por categoria.':'';renderFinancialRecords();
}
function renderFinancialTable(target,rows){
  const body=document.getElementById(target);if(!body)return;body.replaceChildren();
  if(!rows.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=8;td.className='empty';td.textContent='Nenhum registro importado nesta categoria.';tr.appendChild(td);body.appendChild(tr);return}
  for(const r of rows){const tr=document.createElement('tr');const vals=[financialTypeLabels[r.record_type]||r.record_type,financialScopeLabels[r.record_scope]||r.record_scope,r.title,r.patient_name||'—',r.occurred_on?new Date(r.occurred_on+'T00:00:00').toLocaleDateString('pt-BR'):(r.reference_label||'—'),financeMoney(r.amount),statusLabels[r.status]||r.status];
    for(const val of vals){const td=document.createElement('td');td.textContent=String(val??'—');tr.appendChild(td)}
    const source=document.createElement('td');source.textContent=r.source_sheet+' · linha '+r.source_row;tr.appendChild(source);body.appendChild(tr);
  }
}
function renderFinancialRecords(){
  const type=financeTypeFilter?.value||'',scope=financeScopeFilter?.value||'';
  const shown=financialRecords.filter(r=>(!type||r.record_type===type)&&(!scope||r.record_scope===scope));renderFinancialTable('financialRecordRows',shown);
  renderFinancialTable('expenseRecordRows',financialRecords.filter(r=>['expense','credit_card'].includes(r.record_type)));
  const set=(id,value)=>{const e=document.getElementById(id);if(e)e.textContent=String(value)};
  set('financePatientCount',patients?.length||0);set('financeRecordCount',financialRecords.length);set('financeExpenseCount',financialRecords.filter(r=>r.record_type==='expense'||r.record_type==='credit_card').length);set('financeInvestmentCount',financialRecords.filter(r=>r.record_type==='investment'||r.record_scope==='investment').length);
  for(const [id,status] of [['financePaidTotal','paid'],['financePendingTotal','pending'],['financeOverdueTotal','overdue']]){const confirmed=financialRecords.filter(r=>['patient_income','income'].includes(r.record_type)&&r.record_scope==='clinic'&&r.status===status);const el=document.getElementById(id);if(el)el.textContent=confirmed.length?financeMoney(confirmed.reduce((sum,r)=>sum+Number(r.amount||0),0)):'—'}
  const investments=document.getElementById('financeInvestmentTotal');if(investments)investments.textContent=String(financialRecords.filter(r=>r.record_type==='investment'||r.record_scope==='investment').length);
  const today=typeof dateKey==='function'?dateKey(new Date()):'';set('statAppointmentsToday',(agendaItems||[]).filter(x=>x.item_type==='appointment'&&x.status!=='cancelled'&&typeof dateKey==='function'&&dateKey(new Date(x.starts_at))===today).length);
  const parts=typeof dateParts==='function'?dateParts(new Date()):null,month=parts?parts.year+'-'+parts.month:'';
  const monthConfirmed=financialRecords.filter(r=>r.record_type==='patient_income'&&r.record_scope==='clinic'&&r.status==='paid'&&r.occurred_on?.startsWith(month));
  const monthPending=financialRecords.filter(r=>r.record_type==='patient_income'&&r.record_scope==='clinic'&&r.status==='pending'&&r.occurred_on?.startsWith(month));
  set('statMonthReceived',monthConfirmed.length?financeMoney(monthConfirmed.reduce((sum,r)=>sum+Number(r.amount||0),0)):'—');set('statToReceive',monthPending.length?financeMoney(monthPending.reduce((sum,r)=>sum+Number(r.amount||0),0)):'—');
}
if(financeTypeFilter)financeTypeFilter.addEventListener('change',renderFinancialRecords);
if(financeScopeFilter)financeScopeFilter.addEventListener('change',renderFinancialRecords);
if(typeof sb!=='undefined')sb.auth.onAuthStateChange((event,session)=>{if(session?.user)loadFinancialRecords();else{financialRecords=[];renderFinancialRecords()}});
