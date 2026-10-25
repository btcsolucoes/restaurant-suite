import * as XLSX from 'xlsx';
import { Source, State, validateSource, validateBackup, macrosKcal, pace, speed, volume } from './domain';
export async function parseWorkbook(file: File|{name:string;arrayBuffer:()=>Promise<ArrayBuffer>;size:number}){
  if(!/\.xlsx$/i.test(file.name))throw new Error('Selecione um arquivo .xlsx.');
  if(file.size>10*1024*1024)throw new Error('O limite por arquivo é 10 MB.');
  const w=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false,sheetRows:5002});
  if(w.SheetNames.length>40)throw new Error('Limite de 40 abas.');
  const backup=w.Sheets['_STRIDE_BACKUP'];
  if(backup){
    const rows=XLSX.utils.sheet_to_json<any[]>(backup,{header:1,defval:null});
    const raw=rows.slice(1).map(r=>r[1]||'').join('');
    const state=JSON.parse(raw) as State;validateBackup(state);
    return {source:state.source,backup:state,validation:validateSource(state.source)};
  }
  const source:Source={filename:file.name,sheets:w.SheetNames.map(name=>{
    const ws=w.Sheets[name];const range=ws['!ref']?XLSX.utils.decode_range(ws['!ref']):null;
    if(range&&(range.e.r>=5000||range.e.c>=100))throw new Error(`${name}: a aba excede 5.000 linhas ou 100 colunas.`);
    return {name,rows:XLSX.utils.sheet_to_json<any[]>(ws,{header:1,defval:null,blankrows:true,raw:true})};
  })};
  return {source,backup:null,validation:validateSource(source)};
}
function download(data:Blob|ArrayBuffer,name:string){const u=URL.createObjectURL(data instanceof Blob?data:new Blob([data]));const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),5000);}
export function exportBackup(s:State){
  const w=XLSX.utils.book_new();
  s.source.sheets.forEach(sh=>{if(!sh.name.startsWith('_STRIDE'))XLSX.utils.book_append_sheet(w,XLSX.utils.aoa_to_sheet(sh.rows),sh.name.slice(0,31));});
  const add=(n:string,rows:any[][])=>XLSX.utils.book_append_sheet(w,XLSX.utils.aoa_to_sheet(rows),n);
  add('_STRIDE_TREINOS', [['ID','Data','Sessão ID','Modalidade','Status','Distância km','Duração min','Pace min/km','Velocidade km/h','FC bpm','RPE','Dor','Observações'],...s.logs.map(l=>[l.id,l.date,l.sessionId,l.kind,l.status,l.distance,l.duration,pace(l.distance,l.duration),speed(l.distance,l.duration),l.hr,l.rpe,l.pain,l.notes])]);
  add('_STRIDE_FORCA',[['ID','Data','Exercício','Série','Repetições','Carga kg','Volume total kg','Observações'],...s.strength.flatMap(l=>l.sets.map((x,i)=>[l.id,l.date,l.exercise,i+1,x.reps,x.kg,volume(l),l.notes]))]);
  add('_STRIDE_NUTRICAO',[['ID','Data','Refeição','Momento','kcal informado','kcal calculado 4/4/9','Proteína g','Carboidratos g','Gorduras g','Água mL','Sintomas GI','Observações'],...s.meals.map(m=>[m.id,m.date,m.name,m.timing,m.calories,macrosKcal(m),m.protein,m.carbs,m.fat,m.water,m.gi,m.notes])]);
  add('_STRIDE_DECISOES',[['ID','Decisão','Título','Motivo','Data sessão','Sessão ID','Fator','Data decisão'],...s.decisions.map(d=>[d.id,d.status,d.title,d.reason,d.date,d.sessionId,d.factor,d.createdAt])]);
  const raw=JSON.stringify(s),chunks=[];for(let i=0;i<raw.length;i+=30000)chunks.push([i/30000,raw.slice(i,i+30000)]);
  add('_STRIDE_BACKUP',[['Parte','JSON completo · não editar'],...chunks]);
  download(XLSX.write(w,{bookType:'xlsx',type:'array'}),`stride-backup-${new Date().toISOString().slice(0,10)}.xlsx`);
}
export function exportCsv(s:State,type:'training'|'strength'|'nutrition'){
  let rows:any[][]=[];
  if(type==='training')rows=[['id','data','sessao_id','modalidade','status','distancia_km','duracao_min','pace_min_km','velocidade_km_h','fc_bpm','rpe','dor','observacoes'],...s.logs.map(l=>[l.id,l.date,l.sessionId,l.kind,l.status,l.distance,l.duration,pace(l.distance,l.duration),speed(l.distance,l.duration),l.hr,l.rpe,l.pain,l.notes])];
  if(type==='strength')rows=[['id','data','exercicio','serie','repeticoes','carga_kg','observacoes'],...s.strength.flatMap(l=>l.sets.map((x,i)=>[l.id,l.date,l.exercise,i+1,x.reps,x.kg,l.notes]))];
  if(type==='nutrition')rows=[['id','data','refeicao','momento','calorias_informadas','calorias_4_4_9','proteina_g','carboidratos_g','gorduras_g','agua_ml','sintomas_gi','observacoes'],...s.meals.map(m=>[m.id,m.date,m.name,m.timing,m.calories,macrosKcal(m),m.protein,m.carbs,m.fat,m.water,m.gi,m.notes])];
  const escape=(v:any)=>{let str=String(v??'');if(/^[=+@\-\t\r]/.test(str))str="'"+str;return '"'+str.replace(/"/g,'""')+'"';};
  download(new Blob(['\ufeff'+rows.map(r=>r.map(escape).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}),`stride-${type}.csv`);
}
