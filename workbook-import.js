/* Workbook import: data is parsed in the authenticated browser and only sent after the owner starts import. */
const workbookBatchPicker=document.getElementById('workbookBatchPicker');
const workbookSheetPicker=document.getElementById('workbookSheetPicker');
const workbookImportStatus=document.getElementById('workbookImportStatus');
const workbookImportButton=document.getElementById('workbookImportButton');
let workbookBatches=[];
let workbookRows=[];
let selectedWorkbookBatch=null;

function workbookStatus(message,isError=false){
  if(!workbookImportStatus)return;
  workbookImportStatus.textContent=message||'';
  workbookImportStatus.classList.toggle('error',Boolean(isError));
}
function clearWorkbookImports(){
  workbookBatches=[];workbookRows=[];selectedWorkbookBatch=null;
  if(workbookBatchPicker)workbookBatchPicker.innerHTML='<option value="">Nenhuma planilha importada</option>';
  if(workbookSheetPicker)workbookSheetPicker.innerHTML='';
  const out=document.getElementById('workbookGrid');if(out)out.replaceChildren();
  const summary=document.getElementById('workbookGridSummary');if(summary)summary.textContent='';
}
async function loadWorkbookImports(){
  if(!currentUser){clearWorkbookImports();return}
  const {data,error}=await sb.from('workbook_imports').select('id,source_filename,file_sha256,sheets_meta,expected_rows,imported_rows,import_status,created_at').order('created_at',{ascending:false});
  if(error){workbookStatus('Para importar, aplique a migration 202611220002_workbook_imports.sql no Supabase. ('+error.message+')',true);return}
  workbookBatches=data||[];
  workbookBatchPicker.innerHTML='<option value="">Selecione uma planilha importada</option>'+workbookBatches.map(b=>'<option value="'+escapeHtml(b.id)+'">'+escapeHtml(b.source_filename)+' · '+escapeHtml(new Date(b.created_at).toLocaleString('pt-BR'))+'</option>').join('');
  if(workbookBatches.length){workbookBatchPicker.value=workbookBatches[0].id;await selectWorkbookBatch(workbookBatches[0].id)}
  else{workbookStatus('Nenhuma planilha importada ainda.');}
}
async function selectWorkbookBatch(id){
  selectedWorkbookBatch=workbookBatches.find(b=>b.id===id)||null;
  workbookRows=[];workbookSheetPicker.innerHTML='';document.getElementById('workbookGrid').replaceChildren();
  if(!selectedWorkbookBatch){document.getElementById('workbookGridSummary').textContent='';return}
  const meta=Array.isArray(selectedWorkbookBatch.sheets_meta)?selectedWorkbookBatch.sheets_meta:[];
  workbookSheetPicker.innerHTML=meta.map(s=>'<option value="'+escapeHtml(s.name)+'">'+escapeHtml(s.name)+' · '+Number(s.rows||0)+' linhas</option>').join('');
  document.getElementById('workbookGridSummary').textContent=selectedWorkbookBatch.import_status==='complete'?'Importação concluída · '+selectedWorkbookBatch.imported_rows+' linhas guardadas com segurança.':`Importação ${selectedWorkbookBatch.import_status==='processing'?'em andamento':'incompleta'} · ${selectedWorkbookBatch.imported_rows} de ${selectedWorkbookBatch.expected_rows} linhas.`;
  await loadWorkbookSheet();
}
async function loadWorkbookSheet(){
  if(!selectedWorkbookBatch||!workbookSheetPicker.value)return;
  const {data,error}=await sb.from('workbook_import_rows').select('row_number,cells').eq('import_id',selectedWorkbookBatch.id).eq('sheet_name',workbookSheetPicker.value).order('row_number').limit(1000);
  if(error){workbookStatus('Não foi possível carregar os dados importados: '+error.message,true);return}
  workbookRows=data||[];renderWorkbookGrid();
}
function workbookCellText(cell){
  if(!cell)return '';
  if(cell.value!==null&&cell.value!==undefined){
    try{if(typeof XLSX!=='undefined'&&cell.number_format)return XLSX.SSF.format(cell.number_format,cell.value)}catch{}
    return typeof cell.value==='object'?JSON.stringify(cell.value):String(cell.value);
  }
  return cell.formula?'='+cell.formula:'';
}
function renderWorkbookGrid(){
  const grid=document.getElementById('workbookGrid');grid.replaceChildren();
  const columns=Array.from(new Set(workbookRows.flatMap(r=>Object.keys(r.cells||{})))).sort((a,b)=>XLSX.utils.decode_col(a)-XLSX.utils.decode_col(b));
  if(!workbookRows.length){document.getElementById('workbookGridSummary').textContent='Esta aba não tem linhas importadas.';return}
  const table=document.createElement('table');table.className='workbook-table';
  const thead=document.createElement('thead'),head=document.createElement('tr');
  const rowHead=document.createElement('th');rowHead.textContent='Linha';head.appendChild(rowHead);
  for(const col of columns){const th=document.createElement('th');th.textContent=col;head.appendChild(th)}
  thead.appendChild(head);table.appendChild(thead);
  const tbody=document.createElement('tbody');
  for(const record of workbookRows){const tr=document.createElement('tr'),number=document.createElement('td');number.textContent=String(record.row_number);number.className='workbook-row-number';tr.appendChild(number);
    for(const col of columns){const td=document.createElement('td'),cell=record.cells?.[col];td.textContent=workbookCellText(cell);if(cell?.formula)td.title='Fórmula: '+cell.formula;tr.appendChild(td)}
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);grid.appendChild(table);
}
function bytesToHex(bytes){return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('')}
function excelCellRecord(cell){
  const record={value:cell.v===undefined?null:cell.v,formula:cell.f||null,array_formula:cell.F||null,type:cell.t||null,number_format:cell.z||null};
  if(cell.l?.Target)record.hyperlink=cell.l.Target;
  if(Array.isArray(cell.c)&&cell.c.length)record.comments=cell.c.map(c=>({author:c.a||'',text:c.t||''}));
  return record;
}
function parseWorkbookFile(workbook){
  const metadata=[],records=[];
  for(const name of workbook.SheetNames){
    const sheet=workbook.Sheets[name];if(!sheet||!sheet['!ref']){metadata.push({name,range:null,rows:0,columns:0,merges:[]});continue}
    const range=XLSX.utils.decode_range(sheet['!ref']);let rowCount=0;
    for(let r=range.s.r;r<=range.e.r;r++){
      const cells={};
      for(let c=range.s.c;c<=range.e.c;c++){
        const address=XLSX.utils.encode_cell({r,c}),cell=sheet[address];
        if(!cell||cell.v===undefined&& !cell.f)continue;
        cells[XLSX.utils.encode_col(c)]=excelCellRecord(cell);
      }
      if(Object.keys(cells).length){records.push({sheet_name:name,row_number:r+1,cells});rowCount++}
    }
    metadata.push({name,range:sheet['!ref'],rows:rowCount,columns:range.e.c-range.s.c+1,merges:(sheet['!merges']||[]).map(m=>XLSX.utils.encode_range(m))});
  }
  const names=(workbook.Workbook?.Names||[]).map(n=>({name:n.Name,reference:n.Ref,comment:n.Comment||null}));
  return {metadata,records,names,properties:workbook.Props||{}};
}
async function importWorkbookFile(file){
  if(!currentUser){workbookStatus('Entre na sua conta antes de importar.',true);return}
  if(typeof XLSX==='undefined'){workbookStatus('O leitor de planilhas não carregou. Recarregue o site e tente novamente.',true);return}
  if(file.size>25*1024*1024){workbookStatus('O arquivo deve ter até 25 MB.',true);return}
  workbookImportButton.disabled=true;workbookStatus('Lendo as abas e preparando os registros no navegador…');
  try{
    const buffer=await file.arrayBuffer(),digest=bytesToHex(await crypto.subtle.digest('SHA-256',buffer));
    const {data:existing,error:lookupError}=await sb.from('workbook_imports').select('id,import_status').eq('file_sha256',digest).maybeSingle();
    if(lookupError)throw lookupError;
    if(existing?.import_status==='complete'){
      workbookStatus('Esta versão da planilha já foi importada.');
      await loadWorkbookImports();workbookBatchPicker.value=existing.id;await selectWorkbookBatch(existing.id);return;
    }
    const workbook=XLSX.read(buffer,{type:'array',cellFormula:true,cellNF:true,cellStyles:true,cellDates:false,bookVBA:false});
    const parsed=parseWorkbookFile(workbook),expectedRows=parsed.records.length;
    if(!expectedRows)throw new Error('Não encontrei linhas preenchidas no arquivo.');
    let batchId=existing?.id;
    if(!batchId){const {data,error}=await sb.from('workbook_imports').insert({owner_id:currentUser.id,source_filename:file.name,file_sha256:digest,sheets_meta:parsed.metadata,workbook_meta:{defined_names:parsed.names,properties:parsed.properties,parser:'SheetJS',macros_executed:false},expected_rows:expectedRows,imported_rows:0,import_status:'processing'}).select('id').single();if(error)throw error;batchId=data.id}
    for(let start=0;start<parsed.records.length;start+=25){
      const chunk=parsed.records.slice(start,start+25).map(r=>({owner_id:currentUser.id,import_id:batchId,sheet_name:r.sheet_name,row_number:r.row_number,cells:r.cells}));
      const {error}=await sb.from('workbook_import_rows').upsert(chunk,{onConflict:'import_id,sheet_name,row_number'});
      if(error){await sb.from('workbook_imports').update({imported_rows:start,import_status:'incomplete'}).eq('id',batchId);throw error}
      const done=Math.min(start+chunk.length,parsed.records.length);
      workbookStatus('Importando linhas da planilha… '+done+' de '+parsed.records.length);
      const {error:progressError}=await sb.from('workbook_imports').update({imported_rows:done,import_status:'processing'}).eq('id',batchId);
      if(progressError)throw progressError;
    }
    const {error:finishError}=await sb.from('workbook_imports').update({import_status:'complete',imported_rows:expectedRows,sheets_meta:parsed.metadata,workbook_meta:{defined_names:parsed.names,properties:parsed.properties,parser:'SheetJS',macros_executed:false}}).eq('id',batchId);
    if(finishError)throw finishError;
    workbookStatus('Planilha importada: '+parsed.metadata.length+' abas e '+expectedRows+' linhas. Os dados agora estão vinculados à sua conta.');
    await loadWorkbookImports();workbookBatchPicker.value=batchId;await selectWorkbookBatch(batchId);
  }catch(error){
    const message=error?.message||'erro desconhecido';
    if(/workbook_imports|workbook_import_rows|schema cache|does not exist/i.test(message))workbookStatus('A estrutura ainda não está pronta. Execute a migration 202611220002_workbook_imports.sql no SQL Editor do Supabase e tente novamente.',true);
    else workbookStatus('A importação foi interrompida: '+message+'. Registros já enviados permanecem marcados como incompletos e podem ser retomados.',true);
  }finally{workbookImportButton.disabled=false}
}
if(workbookBatchPicker)workbookBatchPicker.addEventListener('change',()=>selectWorkbookBatch(workbookBatchPicker.value));
if(workbookSheetPicker)workbookSheetPicker.addEventListener('change',loadWorkbookSheet);
if(workbookImportButton)workbookImportButton.addEventListener('click',()=>document.getElementById('workbookFileInput').click());
const workbookFileInput=document.getElementById('workbookFileInput');
if(workbookFileInput)workbookFileInput.addEventListener('change',async e=>{const file=e.target.files?.[0];if(file)await importWorkbookFile(file);e.target.value=''});
if(typeof sb!=='undefined')sb.auth.onAuthStateChange((event,session)=>{if(session?.user)loadWorkbookImports();else clearWorkbookImports()});
