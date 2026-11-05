import {addDays,dateKey,sessions,sheetRows,today,effective,type State,type Source} from './domain';

export type AthleteProfile={goalDate:string;runKm:number;bikeKm:number;runPaceSeconds:number;bikeSpeed:number;weeklyRunMinutes:number;longRunMinutes:number;bikeMinutes:number;strengthMinutes:number;anchor:string};
export type WeekDecision={id:string;start:string;dates?:string[];status:'approved'|'rejected'|'undone';createdAt:string;reason:string;before?:Source;beforeOverrides?:State['overrides'];after?:string};
export const defaultProfile=(date=today()):AthleteProfile=>({goalDate:'2026-12-31',runKm:21.1,bikeKm:90,runPaceSeconds:320,bikeSpeed:30,weeklyRunMinutes:70,longRunMinutes:35,bikeMinutes:60,strengthMinutes:40,anchor:date});
export function validateProfile(p:AthleteProfile){
 if(!p||dateKey(p.goalDate)!==p.goalDate||dateKey(p.anchor)!==p.anchor)throw Error('Datas do perfil inválidas.');
 for(const [key,min,max] of [['runKm',1,100],['bikeKm',1,500],['runPaceSeconds',180,1200],['bikeSpeed',5,60],['weeklyRunMinutes',30,1200],['longRunMinutes',10,240],['bikeMinutes',15,360],['strengthMinutes',15,90]] as const)if(typeof p[key]!=='number'||!Number.isFinite(p[key])||p[key]<min||p[key]>max)throw Error(`Perfil: ${key} fora do intervalo.`);
 if(p.longRunMinutes>p.weeklyRunMinutes*.7)throw Error('O maior treino não deve ocupar mais de 70% dos minutos semanais informados. Confira os dados.');
}
export function digest(x:unknown){let h=2166136261;for(const ch of JSON.stringify(x))h=Math.imul(h^ch.charCodeAt(0),16777619);return (h>>>0).toString(16);}
export const nextMonday=(date:string)=>addDays(date,((8-new Date(date+'T12:00:00Z').getUTCDay())%7)||7);
export function runningTrend(s:State,date:string){
 const valid=s.logs.filter(l=>l.status==='completed'&&l.date<=date&&l.date>=addDays(date,-27)&&l.kind==='run'&&l.workoutType==='easy'&&l.environment==='outdoor'&&l.pain===0&&l.rpe!==null&&l.rpe>=3&&l.rpe<=5&&l.distance>0&&l.duration>=20&&l.duration<=60);
 const before=valid.filter(l=>l.date<addDays(date,-13)),after=valid.filter(l=>l.date>=addDays(date,-13));
 const pairs=after.flatMap(a=>{const b=before.filter(b=>Math.abs(b.duration/a.duration-1)<=.2&&Math.abs(b.rpe!-a.rpe!)<=1);return b.length?[{a,b:b.slice().sort((x,y)=>Math.abs(x.duration-a.duration)-Math.abs(y.duration-a.duration))[0]}]:[];});
 if(before.length<3||pairs.length<3)return null;
 const previous=pairs.reduce((n,x)=>n+x.b.duration/x.b.distance,0)/pairs.length,current=pairs.reduce((n,x)=>n+x.a.duration/x.a.distance,0)/pairs.length;
 return {previous,current,count:pairs.length,change:(previous-current)/previous*100};
}
// Observed easy pace is not a race prediction or lactate threshold.
export function paceCalibration(s:State,date:string){
 const eligible=s.logs.filter(l=>l.status==='completed'&&l.kind==='run'&&l.environment==='outdoor'&&l.workoutType==='easy'&&l.pain===0&&l.rpe!==null&&l.rpe>=3&&l.rpe<=4&&l.distance>0&&l.duration>=20&&l.duration<=60&&l.date<=date&&l.date>=addDays(date,-27));
 const recent=eligible.filter(l=>l.date>=addDays(date,-13)),older=eligible.filter(l=>l.date<addDays(date,-13));
 if(new Set(recent.map(l=>l.date)).size<3)return {ready:false as const,count:recent.length,reason:'Registre corridas fáceis em 3 dias distintos, ao ar livre, de 20–60 min, RPE 3–4 e sem dor nos últimos 14 dias para calibrar distância e ritmo.'};
 const median=(a:number[])=>{const sorted=a.slice().sort((a,b)=>a-b),i=Math.floor(sorted.length/2);return sorted.length%2?sorted[i]:(sorted[i-1]+sorted[i])/2;};
 const observed=median(recent.map(l=>l.duration*60/l.distance));
 const before=older.length>=3?median(older.map(l=>l.duration*60/l.distance)):observed;
 const low=Math.round(Math.max(observed,before-5)),high=low+20;
 const fmt=(sec:number)=>Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');
 return {ready:true as const,count:recent.length,low,high,label:fmt(low)+'–'+fmt(high),reason:'Referência de corridas fáceis registradas, não limiar. Recalibração limitada a 5 s/km mais rápida que a quinzena anterior quando há dados; regra operacional, não garantia fisiológica. RPE 3–4 prevalece sobre o pace.'};
}
const days=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const exercises=[
 ['Seg','Supino reto',3,'6–10'],['Seg','Remada apoiada',3,'8–12'],['Seg','Elevação lateral',3,'12–20'],['Seg','Tríceps polia',2,'10–15'],
 ['Ter','Puxada frontal',3,'8–12'],['Ter','Crucifixo inverso',2,'12–20'],['Ter','Rosca alternada',2,'10–15'],
 ['Qua','Ponte de quadril',2,'10–15'],['Qua','Flexora',2,'10–15'],['Qua','Panturrilha',2,'12–20'],['Qua','Sentar e levantar de banco sem dor',1,'8–10'],
 ['Qui','Elevação lateral',2,'12–20'],['Qui','Tríceps polia',2,'10–15'],
 ['Sex','Supino inclinado',3,'8–12'],['Sex','Remada apoiada',3,'8–12'],['Sex','Desenvolvimento halteres',2,'8–12'],['Sex','Elevação lateral',2,'12–20'],
 ['Sáb','Puxada frontal',2,'8–12'],['Sáb','Crucifixo inverso',2,'12–20'],['Sáb','Dead bug',2,'8/lado']];
export function weekProposal(s:State,date=today(s.settings.timezone),scope:'current'|'next'='next'){
 const p=s.profile;if(!p)return null;validateProfile(p);
 const monday=scope==='current'?addDays(date,-((new Date(date+'T12:00:00Z').getUTCDay()+6)%7)):nextMonday(date);
 const start=scope==='current'?date:monday,end=addDays(monday,6);if(start>p.goalDate)return null;
 const logs=s.logs.filter(l=>l.status==='completed'&&l.date>=addDays(date,-28)&&l.date<=date);
 const recent=logs.filter(l=>l.date>=addDays(date,-7));
 const checks=s.checkins.filter(c=>c.date>=addDays(date,-7)&&c.date<=date);
 const latest=checks.slice().sort((a,b)=>b.date.localeCompare(a.date))[0];
 const recoverySignals=[...recent.filter(l=>l.pain>=4).map(l=>({date:l.date,detail:`Treino: dor ${l.pain}/10`,alert:false})),...checks.filter(c=>c.alert||c.pain>=4).map(c=>({date:c.date,detail:c.alert?'Check-in: sinal de alerta marcado':`Check-in: dor ${c.pain}/10`,alert:c.alert}))];
 const unresolvedSignals=recoverySignals.filter(signal=>signal.alert||!latest||latest.date!==date||latest.date<=signal.date||latest.alert||latest.pain>0);
 const needsReview=unresolvedSignals.length>0;
 const pause=false; // Recovery never blocks approval of the whole week.
 const reduce=needsReview||(recent.some(l=>l.pain>2)||checks.some(c=>c.pain>2||c.sleep<6||c.recovery<=2));
 const runs=logs.filter(l=>l.kind==='run'),bikes=logs.filter(l=>l.kind==='bike');
 // Require observations across two weeks. Missing data never enables progression.
 const completeChecks=checks.length>=4&&latest?.date>=addDays(date,-1);
 const eligible=!pause&&!reduce&&completeChecks&&runs.filter(l=>l.date>=addDays(date,-14)).length>=6&&recent.every(l=>l.pain<=2&&l.rpe!==null&&l.rpe<=7)&&checks.every(c=>c.pain<=2&&!c.alert&&c.sleep>=6&&c.recovery>=3);
 const total=(from:number,to:number)=>runs.filter(l=>l.date>=addDays(date,from)&&l.date<=addDays(date,to)).reduce((n,l)=>n+l.duration,0);
 const twoWeeks=[total(-13,-7),total(-6,0)];
 const sufficientVolume=runs.length>=3&&twoWeeks.every(v=>v>0);
 const baseline=sufficientVolume?Math.min(...twoWeeks):p.weeklyRunMinutes;
 const runLong=runs.length?Math.max(...runs.map(l=>l.duration)):p.longRunMinutes;
 const bikeLong=bikes.length?Math.max(...bikes.map(l=>l.duration)):p.bikeMinutes;
 const cycle=Math.max(0,Math.floor((Date.parse(monday)-Date.parse(p.anchor))/604800000));
 const taper=Math.round((Date.parse(p.goalDate)-Date.parse(start))/86400000)<=13;
 const deload=!taper&&cycle%4===3;
 const factor=pause?0:reduce?.65:taper?.6:deload?.75:eligible?1.1:1;
 const budget=Math.max(0,Math.floor(baseline*factor));
 const long=Math.min(120,Math.floor(runLong*(eligible&&!deload&&!taper?1.1:Math.min(1,factor))),Math.floor(budget*.4));
 const brick=Math.min(45,Math.floor(budget*.2));
 const easy=Math.floor(budget*.1);
 const quality=Math.max(0,budget-long-brick-easy);
 const bikeProgress=eligible&&bikes.filter(l=>l.date>=addDays(date,-14)).length>=3&&!(eligible&&long>runLong);
 const sundayBike=pause?0:Math.min(210,Math.round(bikeLong*(bikeProgress?1.1:Math.min(1,factor))));
 const midBike=pause?0:Math.round(Math.min(60,bikeLong*.5)*Math.min(1,factor));
 const reason=(!sufficientVolume?'Base semanal declarada usada: registros incompletos não significam zero capacidade. ':'')+(needsReview?'Reavaliação necessária: '+unresolvedSignals.map(x=>x.date+' — '+x.detail).join('; ')+'. Semana editável; próximos treinos leves e condicionais à recuperação. Sinais de alerta exigem avaliação antes de retomar.':reduce?'Sintomas ou recuperação baixa: reduzir e retirar intensidade.':taper?'Redução antes da data-alvo.':deload?'Semana de descarga: reduzir duração e séries.':eligible?'Duas semanas com registros e recuperação: aumentar apenas resistência de corrida; manter dose rápida e bike.':'Consolidar: dados insuficientes ou recuperação ainda sem evidência para aumento. Complete diário e check-ins.');
 const qualityOK=!pause&&!reduce&&!taper&&!deload&&quality>=28&&completeChecks&&recent.every(l=>l.pain===0)&&checks.every(c=>c.pain===0)&&runs.length>=3;
 const variant=cycle%3;
 const blocks=qualityOK?(variant===0?'6 × 1 min a RPE 6–7, 90 s fáceis ENTRE repetições':variant===1?'Fartlek 4 × (2 min a RPE 6 + 2 min fáceis)':'Tempo fracionado 2 × 5 min a RPE 6, 3 min fáceis entre blocos'):'Corrida fácil a RPE 3–4, conversa em frases completas; sem blocos rápidos nesta proposta';
 const qualityMinimum=variant===0?31.5:variant===1?34:variant===2?31:0;
 const actualQuality=qualityOK&&quality>=qualityMinimum;
 const title=actualQuality?['Corrida INTERVALADA','Corrida FARTLEK','Corrida TEMPO FRACIONADO'][variant]:'Corrida fácil de consolidação';
 const header=['Data','Dia','Semana','Sessão','Treino prescrito','Musculação','Intensidade','Min estimados','Min reais','RPE real','Observações','Pace principal corrida','Tempo-alvo corrida (min)','RPE corrida'];
 const cal:any[][]=[header],paces:any[][]=[['Data','Semana','Sessão','Distância km','Aquecimento','Pace aquecimento','Principal','Pace principal','Recuperação','Pace recuperação','Desaquecimento','Pace desaquecimento','Min','Max','RPE','Observação']],bricks:any[][]=[['Data','Semana','Bike km','Corrida km','Prescrição','Abastecimento','Conclusão']];
 const strength:any[][]=[['Dia','Exercício','Séries','Repetições','Intensidade','Descanso','Data']];
 const nutrition:any[][]=[['Data','Dia','Semana','Sessão','Pré','Durante','Pós']];
 const guidance='Concluir com técnica estável; registrar duração, distância, RPE, dor e recuperação no dia seguinte. Parar se dor crescer ou alterar passada. Se houver piora depois, repetir/reduzir; não compensar treino perdido.';
 const fueling='Manter dieta do nutricionista. Em sessões >75–90 min, praticar 30–60 g carboidrato/h conforme tolerância. Hidratar por sede e condições; não forçar excesso de água.';
 const calibration=paceCalibration(s,date);
 const totals={run:0,bike:0,strength:0,runKm:0};
 // A partial-week revision must account for completed runs and retained past sessions.
 const protectedDates=new Set([...s.logs.map(l=>l.date),...s.strength.map(l=>l.date)].filter(dt=>dt>=start&&dt<=end));
 const retainedRun=Array.from({length:7},(_,i)=>addDays(monday,i)).filter(dt=>dt<start||protectedDates.has(dt)).reduce((sum,dt)=>{
  const actual=s.logs.filter(l=>l.date===dt&&l.kind==='run'&&l.status==='completed').reduce((n,l)=>n+l.duration,0);
  const planned=sessions(s.source).filter(x=>x.date===dt).reduce((n,x)=>{const target=Number(x.target||x.paceDetails?.[13]);return n+(Number.isFinite(target)&&target>0?target*effective(s,x).factor:/corrida/i.test(x.title)&&(!x.strength||x.strength==='—')?effective(s,x).minutes:0);},0);
  const recorded=s.logs.some(l=>l.date===dt&&l.kind==='run');
  return sum+(dt<start&&recorded?actual:Math.max(actual,planned));
 },0);
 let remainingRun=Math.max(0,budget-retainedRun);
 for(let i=0;i<7;i++){
  const dt=addDays(start,i);if(dt>p.goalDate||dt>end)break;if(protectedDates.has(dt))continue;
  const pause=needsReview&&dt===date;
  const dow=new Date(dt+'T12:00:00Z').getUTCDay(),day=days[dow],week=`P${cycle+1}`;
  const force=pause||dow===0?0:Math.round(([2,4].includes(dow)?20:dow===3?20:dow===6?25:p.strengthMinutes)*Math.min(1,factor));
  const forceText=pause?'Pausa por recuperação':exercises.filter(x=>x[0]===day).map(x=>`${x[1]} ${deload||taper||reduce?1:x[2]}×${x[3]}`).join('; ');
  const dose=forceText+(dow===3?'. RIR 4, sem falha; descanso 60–120 s. Dose inicial de readaptação: reavaliar após registrar dor e recuperação, não é volume definitivo.':'. RIR 2–3; sábado RIR 4. Descanso 60–120 s. Sem falha.');
  let name='Musculação '+day,run=0,bike=0,main='5 min de aquecimento + '+dose+'; terminar antes do limite de tempo.',intensity='Força RIR 2–3';
  if(dow===2){name=title+' + musculação';run=Math.min(quality,remainingRun);main=actualQuality?`10 min fáceis; ${blocks}; completar fácil até ${quality-5} min; 5 min fáceis finais. Total ${quality} min de corrida, incluindo recuperações.`:`${run} min totais fáceis, primeiros e últimos 5 min bem leves.`;intensity=actualQuality?'Corrida RPE 3–4; blocos 6–7':'Corrida RPE 3–4';}
  if(dow===3){bike=Math.ceil(midBike*.6);name='Bike aeróbica + musculação de pernas';main=`${bike} min bike RPE 3–4; primeiros e últimos 5 min leves. Pernas: ${dose}`;intensity='Bike RPE 3–4';}
  if(dow===4){run=Math.min(long,remainingRun);name='Corrida LONGÃO + musculação leve';main=`${run} min totais a RPE 3–4, sem final forte; primeiros e últimos 5 min bem leves. Pode intercalar 9 min corrida / 1 min caminhada dentro do total. Depois força curta: ${dose}`;intensity='Corrida RPE 3–4';}
  if(dow===5){run=Math.min(easy,remainingRun);name='Corrida fácil curta + musculação de superiores';main=`${run} min de corrida fácil RPE 2–3; começar caminhando se necessário, sem tiros ou final forte. Tempo total inclui início e fim leves. ${dose}`;intensity='Corrida RPE 2–3';}
  if(dow===6){bike=Math.floor(midBike*.4);name='Bike leve + musculação leve';main=`${bike} min bike RPE 2–3, terreno plano ou indoor com resistência funcional; sem sprints. ${dose}`;intensity='Bike RPE 2–3';}
  if(dow===0){run=Math.min(brick,remainingRun);bike=sundayBike;name='Simulado bike + corrida';main=`${bike} min bike RPE 3–4 (primeiros/últimos 10% leves); T2 até 5 min; ${run} min corrida RPE 3–4 começando mais leve. Não é prova semanal.`;intensity='Ambas RPE 3–4';}
  if(dow===2&&run<quality){main=`${run} min fáceis RPE 3–4; volume limitado pelo restante da semana.`;intensity='Corrida RPE 3–4';name='Corrida fácil + musculação';}
  if(pause){run=0;bike=0;name='Hoje: reavaliar antes de treinar';main=reason;}else if(needsReview){main+=' Proposta condicional: realizar somente após resolução dos sintomas; se persistirem, não executar e reavaliar. Sinais de alerta exigem avaliação antes de retomar.';}
  remainingRun-=run;
  const mechanical=bike?(s.settings.stiRepaired?'Bike revisada informada; confirmar demais itens de segurança.':'STI pendente: usar indoor com resistência funcional; distância do painel não equivale à rua. Não prescrever pedal de estrada exigente até reparo.'):' ';
  const minutes=run+bike+force+(dow===0&&!pause?5:0);
  const calibrated=calibration.ready&&!reduce&&!needsReview&&run>0&&!(dow===2&&actualQuality);
  const runKm=calibrated?Math.floor(run*60/calibration.high*10)/10:null;
  const paceLabel=calibrated?calibration.label:'Por RPE; ritmo numérico ainda não calibrado';
  if(runKm!==null){main+=` Meta de corrida: ${runKm.toFixed(1)} km, com limite de ${run} min; encerrar no primeiro limite. Referência fácil ${paceLabel} min/km; reduzir o ritmo se necessário para manter RPE ${dow===5?'2–3':'3–4'}. Na transição e no longão, o esforço prevalece.`;totals.runKm+=runKm;}
  cal.push([dt,day,week,name,`${main}\n${guidance}\n${mechanical}\n${fueling}`,dow===0?'—':dose,intensity,minutes,null,null,reason,paceLabel,run||'',actualQuality&&dow===2?'6–7 nos blocos':dow===5?'2–3':'3–4']);
  if(run)paces.push([dt,week,name,runKm,'Primeiros 5–10 min leves','RPE 2–3',main,paceLabel,actualQuality&&dow===2?blocks:'Sem intervalo obrigatório','RPE 2–3','Últimos 5 min leves','RPE 2–3',run,run,actualQuality&&dow===2?'6–7':dow===5?'2–3':'3–4',guidance]);
  if(dow===0)bricks.push([dt,week,null,runKm,main,fueling,guidance]);
  if(dow!==0)for(const x of exercises.filter(x=>x[0]===day))strength.push([day,x[1],pause?0:deload||taper||reduce?1:x[2],x[3],dow===3||dow===6?'RIR 4':'RIR 2–3','60–120 s',dt]);
  nutrition.push([dt,day,week,name,'Refeição habitual com carboidrato, conforme tolerância',fueling,'Refeição com carboidrato e proteína']);
  totals.run+=run;totals.bike+=bike;totals.strength+=force;
 }
 const source:Source=JSON.parse(JSON.stringify(s.source));
 for(const [name,incoming] of [['Calendario',cal],['Paces por Corrida',paces],['Domingos e Evento',bricks],['Nutricao por Data',nutrition]] as [string,any[][]][]){
  let sh=source.sheets.find(x=>x.name===name);if(!sh){sh={name,rows:[incoming[0]]};source.sheets.push(sh);}
  // Replace in place to preserve date/row-based session IDs, including untouched history.
  for(let i=1;i<sh.rows.length;i++){const dt=dateKey(sh.rows[i][0]);if(dt>=start&&dt<=end&&!protectedDates.has(dt)&&!incoming.some(r=>r[0]===dt))sh.rows[i]=[];}
  for(const row of incoming.slice(1)){const existing=sh.rows.findIndex((r,i)=>i>0&&dateKey(r[0])===row[0]);if(existing<0)sh.rows.push(row);else{sh.rows[existing]=row;for(let j=existing+1;j<sh.rows.length;j++)if(dateKey(sh.rows[j][0])===row[0])sh.rows[j]=[];}}
 }
 let ms=source.sheets.find(x=>x.name==='Musculacao');if(!ms){ms={name:'Musculacao',rows:[strength[0]]};source.sheets.push(ms);}
 // Date-specific rows coexist with historical weekday routines.
 ms.rows=ms.rows.filter((r,i)=>i===0||!(dateKey(r[6])>=start&&dateKey(r[6])<=end&&!protectedDates.has(dateKey(r[6]))));ms.rows.push(...strength.slice(1));
 const token=digest({date,scope,profile:p,logs:s.logs,checkins:s.checkins,strength:s.strength,source:s.source,overrides:s.overrides});
 const id=`week:${start}:${token}`;
 const dates=cal.slice(1).map(r=>String(r[0]));
 const locked=dates.length===0;
 return {id,start,end,scope,dates,calibration,protectedDates:[...protectedDates],retainedRun,budget,reason,source,totals,eligible,deload,taper,pause,needsReview,locked,decided:!pause&&digest(source)===digest(s.source)&&!s.overrides.some(o=>sessions(s.source).some(x=>x.id===o.sessionId&&dates.includes(x.date))),recoverySignals,unresolvedSignals,quality:actualQuality?blocks:'Fácil: consolidar tolerância',baseline,runLong,bikeLong,summary:cal.slice(1),evidence:JSON.stringify({date,baseline,twoWeeks,runLong,bikeLong,eligible,checks:checks.length,logs:logs.length})};
}
export function applyWeekAction(s:State,action:string,d:any,date:string){
 if(action==='profile'){validateProfile(d);s.profile={...d,anchor:s.profile?.anchor||date};return;}
 if(action==='week-decision'){
  if(d.scope!==undefined&&!['current','next'].includes(d.scope))throw Error('Período inválido.');
  const p=weekProposal(s,date,d.scope||'next');if(!p||p.id!==d.id||p.decided||p.locked)throw Error('Proposta expirada ou semana já registrada. Gere uma nova prévia.');
  if(!['approved','rejected'].includes(d.status))throw Error('Decisão inválida.');
  const entry:WeekDecision={id:p.id,start:p.start,dates:p.dates,status:d.status,createdAt:new Date().toISOString(),reason:p.reason+' '+p.evidence};
  if(d.status==='approved'){entry.before=structuredClone(s.source);entry.beforeOverrides=structuredClone(s.overrides);s.source=p.source;const ids=sessions(s.source).filter(x=>p.dates.includes(x.date)).map(x=>x.id);s.overrides=s.overrides.filter(o=>!ids.includes(o.sessionId));entry.after=digest({source:s.source,overrides:s.overrides});}
  s.weekDecisions=[...(s.weekDecisions||[]),entry].slice(-24);return;
 }
 if(action==='week-undo'){
  const e=s.weekDecisions?.find(x=>x.id===d.id&&x.status==='approved');
  if(!e?.before||digest({source:s.source,overrides:s.overrides})!==e.after||s.logs.some(l=>(e.dates?e.dates.includes(l.date):l.date>=e.start&&l.date<=addDays(e.start,6)))||s.strength.some(l=>(e.dates?e.dates.includes(l.date):l.date>=e.start&&l.date<=addDays(e.start,6))))throw Error('Não é possível desfazer após novos planos ou registros na semana. O histórico foi preservado.');
  s.source=e.before;s.overrides=e.beforeOverrides||[];e.status='undone';return;
 }
 throw Error('Ação semanal inválida.');
}

export function planRepairs(s:State,date:string){
 const all=sessions(s.source),protectedDate=(dt:string)=>s.logs.some(l=>l.date===dt)||s.strength.some(l=>l.date===dt);
 return all.filter(p=>p.date>=date&&p.date<=addDays(date,7)&&(effective(s,p).factor===0||(p.minutes===0&&/pausa|reavaliar/i.test(p.title)))).map(p=>{
  const overlay=effective(s,p).factor===0&&p.minutes>0;
  const candidates=[...(s.weekDecisions||[]).slice().reverse().flatMap(w=>w.before?[w.before]:[]),...(s.archives||[]).slice().reverse().map(a=>a.source)];
  const prior=overlay?s.source:candidates.find(src=>sessions(src).some(x=>x.date===p.date&&x.minutes>0&&!/pausa|reavaliar/i.test(x.title)));
  const original=prior&&sessions(prior).find(x=>x.date===p.date&&x.minutes>0&&!/pausa|reavaliar/i.test(x.title));
  return {id:p.id,date:p.date,cause:overlay?'Ajuste de pausa ainda salvo sobre o treino':'Pausa gravada dentro do calendário',current:p.title,original,prior,canRestore:!!original&&!protectedDate(p.date),token:digest({source:s.source,overrides:s.overrides,logs:s.logs,strength:s.strength,checks:s.checkins})};
 });
}
export function restoreSession(s:State,d:any,date:string){
 const item=planRepairs(s,date).find(x=>x.id===d.id&&x.token===d.token);
 if(!item?.canRestore||!item.original||!item.prior)throw Error('Restauração indisponível ou prévia desatualizada. Seus registros foram preservados.');
 const before=structuredClone(s.source),beforeOverrides=structuredClone(s.overrides);
 const calendar=s.source.sheets.find(x=>x.name==='Calendario')!;
 const current=sessions(s.source).find(x=>x.id===item.id)!;
 const rowIndex=Number(current.id.split(':')[1])-1;
 calendar.rows[rowIndex]=structuredClone(item.original.row);
 for(const name of ['Paces por Corrida','Domingos e Evento','Nutricao por Data','Musculacao']){
  const old=sheetRows(item.prior,name),column=name==='Musculacao'?6:0;
  let target=s.source.sheets.find(x=>x.name===name);
  if(!target&&old.length){target={name,rows:[structuredClone(old[0])]};s.source.sheets.push(target);}
  if(!target)continue;
  const dated=old.slice(1).filter(r=>dateKey(r[column])===item.date);
  const restored=name==='Musculacao'&&!dated.length?old.slice(1).filter(r=>!dateKey(r[6])&&r[0]===item.original!.day).map(r=>[...r.slice(0,6),item.date]):dated;
  target.rows=target.rows.filter((r,i)=>i===0||dateKey(r[column])!==item.date);target.rows.push(...structuredClone(restored));
 }
 s.overrides=s.overrides.filter(o=>o.sessionId!==item.id);
 s.weekDecisions=[...(s.weekDecisions||[]),{id:'restore:'+item.token+':'+item.id,start:item.date,dates:[item.date],status:'approved' as const,createdAt:new Date().toISOString(),reason:'Restauração do planejamento anterior solicitada pelo usuário; não representa liberação clínica.',before,beforeOverrides,after:digest({source:s.source,overrides:s.overrides})}].slice(-24);
}
