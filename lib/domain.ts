export type Sheet = { name: string; rows: any[][] };
export type Source = { filename: string; sheets: Sheet[] };
export type Session = { id: string; date: string; day: string; week: string; title: string; prescription: string; strength: string; intensity: string; minutes: number; pace: string; target: string; runRpe: string; row: any[]; paceDetails?: any[]; brick?: any[] };
export type TrainingLog = { id: string; date: string; sessionId: string; sessionLabel?: string; kind: 'run'|'bike'|'strength'|'other'; status: 'completed'|'skipped'; distance: number; duration: number; hr: number|null; rpe: number|null; pain: number; notes: string; createdAt: string };
export type StrengthLog = { id: string; date: string; exercise: string; sets: {reps: number; kg: number}[]; notes: string; createdAt: string };
export type Meal = { id: string; date: string; name: string; timing: string; calories: number|null; protein: number; carbs: number; fat: number; water: number; gi: string; notes: string; createdAt: string };
export type Checkin = {date: string; sleep: number; recovery: number; pain: number; alert: boolean; notes: string; updatedAt: string};
export type Override = { sessionId: string; factor: number; reason: string; createdAt: string };
export type Decision = {id: string; status: 'approved'|'rejected'; title: string; reason: string; date: string; sessionId: string; factor: number; createdAt: string};
export type State = { schemaVersion: 1; source: Source; archives?: {source: Source; archivedAt: string}[]; logs: TrainingLog[]; strength: StrengthLog[]; meals: Meal[]; checkins: Checkin[]; overrides: Override[]; decisions: Decision[]; settings: { stiRepaired: boolean; timezone: string }; importedAt: string };
export type Proposal = {id: string; title: string; reason: string; sessionId: string; date: string; factor: number; level: 'warning'|'danger'|'info'};
export const sheetRows = (s: Source, name: string) => s.sheets.find(x=>x.name === name)?.rows || [];
export const present = (v: any) => v !== null && v !== undefined && v !== '';
export const str = (v: any) => present(v) ? String(v) : '';
export const num = (v: any) => Number(String(v ?? '').replace(',','.')) || 0;
export function dateKey(value: any): string {
  if(typeof value === 'number') return new Date(Date.UTC(1899,11,30) + value*86400000).toISOString().slice(0,10);
  if(value instanceof Date) return value.toISOString().slice(0,10);
  let v = str(value).trim();
  if(/^\d{2}\/\d{2}\/\d{4}$/.test(v)) v = v.slice(6)+'-'+v.slice(3,5)+'-'+v.slice(0,2);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(v)) return '';
  const d = new Date(v+'T12:00:00Z');
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === v ? v : '';
}
export function today(tz='America/Sao_Paulo', now=new Date()): string { return new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(now); }
export function addDays(d: string, n: number) {const x=new Date(d+'T12:00:00Z'); x.setUTCDate(x.getUTCDate()+n); return x.toISOString().slice(0,10);}
export function weekStart(d: string) {return addDays(d,-new Date(d+'T12:00:00Z').getUTCDay());}
export function sessions(source: Source): Session[] {
  const paces = sheetRows(source,'Paces por Corrida').slice(1);
  const bricks = sheetRows(source,'Domingos e Evento').slice(1);
  return sheetRows(source,'Calendario').slice(1).flatMap((r,i)=>dateKey(r[0])?[{
    id:dateKey(r[0])+':'+(i+2),date:dateKey(r[0]),day:str(r[1]),week:str(r[2]),title:str(r[3]),prescription:str(r[4]),strength:str(r[5]),intensity:str(r[6]),minutes:num(r[7]),pace:str(r[11]),target:str(r[12]),runRpe:str(r[13]),row:r,
    paceDetails:paces.find(p=>dateKey(p[0])===dateKey(r[0])),brick:bricks.find(p=>dateKey(p[0])===dateKey(r[0]))
  }]:[]).sort((a,b)=>a.date.localeCompare(b.date));
}
export function initialState(source: Source): State {return {schemaVersion:1,source,logs:[],strength:[],meals:[],checkins:[],overrides:[],decisions:[],settings:{stiRepaired:false,timezone:'America/Sao_Paulo'},importedAt:new Date().toISOString()};}
export function validateSource(source: Source) {
  const errors: string[] = [], warnings: string[] = [];
  if(!source || !Array.isArray(source.sheets) || !source.sheets.length) return {errors:['Arquivo sem abas válidas.'],warnings:[]};
  if(source.sheets.length>40 || source.sheets.some(s=>!Array.isArray(s.rows)||s.rows.length>5000 || s.rows.some(r=>!Array.isArray(r)||r.length>100||r.some(v=>v!==null&&!['number','string','boolean'].includes(typeof v))))) return {errors:['Limite de estrutura: 40 abas, 5.000 linhas e 100 colunas por aba; células precisam ser valores simples.'],warnings:[]};
  const names=source.sheets.map(s=>s.name);
  if(new Set(names).size!==names.length) errors.push('Há nomes de abas repetidos.');
  const cal=sheetRows(source,'Calendario');
  if(!cal.length) errors.push('A aba Calendario é obrigatória. Use o modelo original ou um backup STRIDE.');
  else {
    const expected=['Data','Dia','Semana','Sessão','Treino prescrito','Musculação','Intensidade','Min estimados'];
    expected.forEach((v,i)=>{if(cal[0]?.[i]!==v)errors.push(`Calendario: coluna ${i+1} deve ser “${v}”.`);});
    cal.slice(1).forEach((r,i)=>{
      if(!r.some(present)) return;
      const d=dateKey(r[0]);
      if(!d) errors.push(`Calendario, linha ${i+2}: data inválida.`);
      if(!str(r[3]).trim())errors.push(`Calendario, linha ${i+2}: sessão sem nome.`);
      if(!Number.isFinite(Number(r[7]))||num(r[7])<0)errors.push(`Calendario, linha ${i+2}: minutos inválidos.`);
      if(d){const dow=new Date(d+'T12:00:00Z').getUTCDay(); if([5,6].includes(dow)&&!/muscula|descanso/i.test(str(r[3])))warnings.push(`${d}: atividade fora da regra de sexta/sábado. Fonte preservada, revisar antes de treinar.`);}
    });
  }
  if(!cal.slice(1).some(r=>dateKey(r[0])))errors.push('Nenhuma sessão com data válida.');
  ['Musculacao','Nutricao por Data','Paces por Corrida','Regras e Prontidao','Dieta Original e Ajustes'].forEach(n=>{if(!names.includes(n))warnings.push(`Aba ${n} ausente. Os detalhes correspondentes ficarão indisponíveis.`);});
  if(sheetRows(source,'Paces por Corrida').some(r=>dateKey(r[0])==='2026-12-29'&&num(r[12])===19))warnings.push('29/12: tempo-alvo de 19–24 min diverge dos blocos e do calendário (45 min). Valores originais preservados.');
  const rows=sheetRows(source,'Domingos e Evento');
  if(rows.some(r=>dateKey(r[0])==='2026-11-08'&&str(r[5]).includes('<90'))) warnings.push('08/11: simulado estimado em 107 min; orientação sobre <90 min difere da nutrição por data. Conferir duração real.');
  if(cal.some(r=>dateKey(r[0])==='2026-12-31'&&num(r[7])===0)) warnings.push('31/12: 0 min representa duração não definida para o evento condicional, não um treino de zero minutos.');
  return {errors,warnings};
}
export function effective(s: State, p: Session) {const o=s.overrides.find(x=>x.sessionId===p.id);return {factor:o?.factor??1,reason:o?.reason,minutes:Math.round(p.minutes*(o?.factor??1)),runKm:present(p.paceDetails?.[3])?num(p.paceDetails?.[3])*(o?.factor??1):null,bikeKm:p.brick?num(p.brick[2]):null};}
export function pace(distance: number, minutes: number) {if(!(distance>0&&minutes>0))return '—';const sec=Math.round(minutes/distance*60);return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');}
export function speed(distance: number, minutes: number) {return distance>0&&minutes>0?Math.round(distance/minutes*600)/10:0;}
export const volume = (l: StrengthLog) => l.sets.reduce((a,v)=>a+v.reps*v.kg,0);
export const macrosKcal = (m: Pick<Meal,'protein'|'carbs'|'fat'>) => m.protein*4+m.carbs*4+m.fat*9;
export function adherence(s: State, start: string, end: string) {
  const planned=sessions(s.source).filter(p=>p.date>=start&&p.date<=end&&!/descanso/i.test(p.title)&&effective(s,p).factor>0);
  let done=0;
  planned.forEach(p=>{
    const logs=s.logs.filter(l=>l.sessionId===p.id&&l.status==='completed');
    const isBrick=/simulado|evento/i.test(p.title);
    const cardio=isBrick?logs.some(l=>l.kind==='bike')&&logs.some(l=>l.kind==='run'):logs.some(l=>/muscula/i.test(p.title)?l.kind==='strength':/bike/i.test(p.title)?l.kind==='bike':l.kind==='run');
    const weights=p.strength&&p.strength!=='—'?s.strength.some(x=>x.date===p.date)||logs.some(l=>l.kind==='strength'):true;
    if(cardio&&weights)done++;
  });
  return {done,total:planned.length,percent:planned.length?Math.round(done/planned.length*100):0};
}
export function proposals(s: State, date=today(s.settings.timezone)): Proposal[] {
  const upcoming=sessions(s.source).filter(p=>p.date>=date&&p.date<=addDays(date,7)&&/corrida/i.test(p.title)&&!/simulado|evento/i.test(p.title)&&![5,6].includes(new Date(p.date+'T12:00:00Z').getUTCDay()));
  const next=upcoming[0]; if(!next)return [];
  const logs=s.logs.filter(l=>l.date>=addDays(date,-3)&&l.date<=date&&l.status==='completed');
  const c=s.checkins.filter(c=>c.date>=addDays(date,-2)&&c.date<=date).sort((a,b)=>b.date.localeCompare(a.date))[0];
  let p: Proposal|undefined;
  const painful=logs.find(l=>l.pain>=4);
  if(c?.alert||num(c?.pain)>=4||painful) p={id:`pain:${next.id}:${c?.updatedAt||painful?.id}`,sessionId:next.id,date:next.date,factor:0,level:'danger',title:'Pausar a próxima corrida',reason:'Dor ≥4/10 ou sinal de alerta registrado. Proposta de pausa e avaliação antes de retomar. Sinais agudos exigem interrupção imediata, independentemente da aprovação no app.'};
  else if((c&&(c.recovery<=2||c.sleep<6))||logs.some(l=>(l.rpe??0)>=8))p={id:`fatigue:${next.id}:${c?.updatedAt||logs.find(l=>(l.rpe??0)>=8)?.id}`,sessionId:next.id,date:next.date,factor:0.8,level:'warning',title:'Reduzir 20% do volume da próxima corrida',reason:'Recuperação baixa, sono <6 h ou RPE ≥8 recente. Reduzir duração/distância e manter esforço confortável. Esta regra conservadora não é uma zona fisiológica medida.'};
  else {
    const last14=s.logs.filter(l=>l.date>=addDays(date,-14)&&l.date<date&&l.kind==='run'&&l.status==='completed');
    const checks=s.checkins.filter(c=>c.date>=addDays(date,-14)&&c.date<date);
    const long=upcoming.find(p=>/longa/i.test(p.title)&&!['S4','S8','S10'].includes(p.week));
    if(long&&date<'2026-12-13'&&last14.length>=4&&last14.every(l=>l.pain===0&&l.rpe!==null&&l.rpe<=6)&&checks.length>=10&&checks.every(c=>!c.alert&&c.pain===0&&c.recovery>=3&&c.sleep>=6)&&adherence(s,addDays(date,-14),addDays(date,-1)).percent>=80)
      p={id:`progress:${long.id}`,sessionId:long.id,date:long.date,factor:1.05,level:'info',title:'Avaliar mais 5% de volume no longão',reason:'Duas semanas registradas sem dor, esforço controlado e aderência ≥80%. Proposta limitada a uma corrida fácil; sem acelerar pace. Requer sua aprovação e pode ser recusada.'};
  }
  return p&&!s.decisions.some(d=>d.id===p!.id)&&!s.overrides.some(o=>o.sessionId===p!.sessionId)?[p]:[];
}
function fail(msg: string): never {throw new Error(msg);}
function bounded(v: any, min: number,max: number,label: string) {if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)fail(`${label}: valor entre ${min} e ${max}.`);return v;}
function text(v: any, max=2000) {if(typeof v!=='string'||v.length>max)fail('Texto inválido ou muito longo.');return v;}
function validDate(d: any){if(!dateKey(d)||dateKey(d)!==d)fail('Data inválida.');return d as string;}
function id(v: any){return text(v,100);}
export function validateLog(d: TrainingLog,s: State) {
  id(d.id);validDate(d.date);text(d.notes);
  if(!['run','bike','strength','other'].includes(d.kind)||!['completed','skipped'].includes(d.status))fail('Tipo de registro inválido.');
  bounded(d.distance,0,1000,'Distância');bounded(d.duration,0,3000,'Duração');bounded(d.pain,0,10,'Dor');
  if(d.rpe!==null)bounded(d.rpe,1,10,'RPE');if(d.hr!==null)bounded(d.hr,20,260,'Frequência cardíaca');
  if(d.status==='completed'&&d.duration<=0)fail('Informe a duração realizada.');
  const p=sessions(s.source).find(p=>p.id===d.sessionId);
  if(d.sessionId&&(!p||p.date!==d.date))fail('Sessão não corresponde à data.');
  if(p&&[5,6].includes(new Date(d.date+'T12:00:00Z').getUTCDay())&&d.kind!=='strength')fail('Sexta e sábado: o planejamento aceita apenas musculação. Registre atividade extra sem vincular à sessão.');
}
export function validateStrength(d: StrengthLog) {id(d.id);validDate(d.date);text(d.exercise,150);text(d.notes);if(!d.exercise.trim()||!Array.isArray(d.sets)||!d.sets.length||d.sets.length>30)fail('Informe exercício e séries válidas.');d.sets.forEach(x=>{bounded(x.reps,1,200,'Repetições');if(!Number.isInteger(x.reps))fail('Repetições devem ser inteiras.');bounded(x.kg,0,600,'Carga');});}
export function validateMeal(d: Meal){id(d.id);validDate(d.date);text(d.name,150);text(d.timing,50);text(d.gi,500);text(d.notes);if(!d.name.trim())fail('Informe a refeição.');['protein','carbs','fat','water'].forEach(k=>bounded((d as any)[k],0,20000,k));if(d.calories!==null)bounded(d.calories,0,20000,'Calorias');}
export function validateCheckin(d: Checkin){validDate(d.date);bounded(d.sleep,0,24,'Sono');bounded(d.recovery,1,5,'Recuperação');bounded(d.pain,0,10,'Dor');text(d.notes);if(typeof d.alert!=='boolean')fail('Sinal de alerta inválido.');}
export function validateBackup(d: State){
  if(d?.schemaVersion!==1)fail('Versão de backup incompatível.');
  const v=validateSource(d.source);if(v.errors.length)fail(v.errors.join(' '));
  for(const key of ['logs','strength','meals','checkins','overrides','decisions'] as const)if(!Array.isArray(d[key])||d[key].length>20000)fail('Estrutura do backup inválida.');
  if(d.archives&&(!Array.isArray(d.archives)||d.archives.length>8||d.archives.some(a=>validateSource(a.source).errors.length)))fail('Archives inválidos.');
  d.logs.forEach(l=>validateLog(l,d));d.strength.forEach(validateStrength);d.meals.forEach(validateMeal);d.checkins.forEach(validateCheckin);
  for(const key of ['logs','strength','meals'] as const)if(new Set(d[key].map(v=>v.id)).size!==d[key].length)fail('Identificadores duplicados no backup.');
  d.overrides.forEach(o=>{text(o.sessionId,100);bounded(o.factor,0,1.05,'Fator de ajuste');text(o.reason);const p=sessions(d.source).find(p=>p.id===o.sessionId);if(!p||!/corrida/i.test(p.title)||/simulado|evento/i.test(p.title))fail('Ajuste fora das corridas permitidas.');});
  d.decisions.forEach(v=>{id(v.id);text(v.title);text(v.reason);validDate(v.date);if(!['approved','rejected'].includes(v.status))fail('Decisão inválida.');});
  if(!d.settings||typeof d.settings.stiRepaired!=='boolean')fail('Configurações inválidas.');try{today(d.settings.timezone);}catch{fail('Fuso horário inválido.');}
}
function upsert<T extends {id:string}>(list:T[],d:T){const i=list.findIndex(x=>x.id===d.id);if(i<0)list.push(d);else list[i]=d;}
export function applyAction(original: State, action: string, d: any, date=today(original.settings.timezone)): State {
  const s:State=JSON.parse(JSON.stringify(original)), stamp=new Date().toISOString();
  if(action==='training'){validateLog(d,s);upsert(s.logs,{...d,createdAt:stamp});}
  else if(action==='strength'){validateStrength(d);upsert(s.strength,{...d,createdAt:stamp});}
  else if(action==='meal'){validateMeal(d);upsert(s.meals,{...d,createdAt:stamp});}
  else if(action==='checkin'){validateCheckin(d);s.checkins=s.checkins.filter(c=>c.date!==d.date);s.checkins.push({...d,updatedAt:stamp});}
  else if(action==='delete'){if(!['logs','strength','meals'].includes(d.collection))fail('Coleção inválida.');(s as any)[d.collection]=(s as any)[d.collection].filter((x:any)=>x.id!==d.id);}
  else if(action==='settings'){if(typeof d.stiRepaired!=='boolean')fail('STI inválido.');try{today(d.timezone);}catch{fail('Fuso inválido.');}s.settings={stiRepaired:d.stiRepaired,timezone:d.timezone};}
  else if(action==='import'){const v=validateSource(d);if(v.errors.length)fail(v.errors.join(' '));const old=sessions(s.source), fresh=sessions(d);
    if(old.length&&JSON.stringify(d)!==JSON.stringify(s.source))s.archives=[...(s.archives||[]),{source:s.source,archivedAt:stamp}].slice(-8);
    s.logs=s.logs.map(l=>{const previous=old.find(p=>p.id===l.sessionId);const match=previous&&fresh.find(p=>p.date===previous.date&&p.title===previous.title);return {...l,sessionLabel:l.sessionLabel||previous?.title||'',sessionId:match?.id||''};});
    s.source=d;s.overrides=[];s.importedAt=stamp;}
  else if(action==='restore'){validateBackup(d);return d;}
  else if(action==='decision'){
    const p=proposals(s,date).find(p=>p.id===d.id);if(!p)fail('Proposta expirada. Atualize os dados.');
    if(!['approved','rejected'].includes(d.status))fail('Decisão inválida.');
    s.decisions.push({...p,status:d.status,createdAt:stamp});
    if(d.status==='approved')s.overrides.push({sessionId:p.sessionId,factor:p.factor,reason:p.reason,createdAt:stamp});
  }
  else if(action==='undo'){const o=s.overrides.find(x=>x.sessionId===d.sessionId);if(!o)fail('Ajuste não encontrado.');s.overrides=s.overrides.filter(x=>x.sessionId!==d.sessionId);s.decisions.push({id:crypto.randomUUID(),status:'approved',title:'Restaurar planejamento original',reason:'Restauração solicitada pelo usuário.',sessionId:d.sessionId,date, factor:1,createdAt:stamp});}
  else fail('Ação desconhecida.');
  return s;
}
