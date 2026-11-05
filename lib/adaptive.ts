import {State, Session, Proposal, sessions, effective, addDays, weekStart, adherence, today} from './domain';

export const ENGINE_VERSION = '2.0.0';
export const GOAL = {date:'2026-12-31', bikeKm:90, bikeSpeed:[30,35], runKm:21.1, runPaceSeconds:320} as const;
export function modality(p:Session):'run'|'bike'|'strength'|'brick'|'other' {
  return /simulado|evento|brick/i.test(p.title)?'brick':/corrida/i.test(p.title)?'run':/bike|ciclismo|pedal/i.test(p.title)?'bike':/muscula|força/i.test(p.title)?'strength':'other';
}
function fingerprint(value:unknown) {let h=2166136261;for(const c of JSON.stringify(value)){h=Math.imul(h^c.charCodeAt(0),16777619);}return (h>>>0).toString(16);}
export function adaptiveProposals(s:State,date=today(s.settings.timezone)):Proposal[] {
  const all=sessions(s.source), logs=s.logs.filter(l=>l.status==='completed'&&l.date>=addDays(date,-14)&&l.date<=date).sort((a,b)=>a.id.localeCompare(b.id));
  const checks=s.checkins.filter(c=>c.date>=addDays(date,-14)&&c.date<=date).sort((a,b)=>a.date.localeCompare(b.date));
  const recent=logs.filter(l=>l.date>=addDays(date,-3)), recovery=checks.filter(c=>c.date>=addDays(date,-2));
  const pain=recent.some(l=>l.pain>=4)||recovery.some(c=>c.alert||c.pain>=4);
  const fatigue=recent.some(l=>(l.rpe??0)>=8)||recovery.some(c=>c.sleep<6||c.recovery<=2);
  const evidence={evaluatedOn:date,logs,checkins:checks,settings:s.settings,source:s.source,overrides:s.overrides};
  const token=fingerprint(evidence), result:Proposal[]=[];
  for(const p of all.filter(p=>p.date>=date&&p.date<=addDays(date,7)&&modality(p)!=='other')) {
    if(s.logs.some(l=>l.sessionId===p.id&&l.status==='completed'))continue;
    const kind=modality(p), current=effective(s,p).factor;
    let rule='',factor=current,reason='';
    if(pain&&p.date===date){rule='pain';factor=0;reason='Dor ≥4/10 ou alerta nos registros recentes. Pausa proposta para reavaliar antes de retomar.';}
    else if(fatigue&&p.date<=addDays(date,2)){rule='fatigue';factor=Math.min(current,.8);reason='Sono <6 h, recuperação ≤2/5 ou RPE ≥8 recente, considerando todas as modalidades. Reduzir volume e manter esforço confortável.';}
    else if(p.date<=addDays(date,1)&&recent.filter(l=>l.date>=addDays(date,-2)&&(l.rpe??0)>=7).length>=2){rule='intensity';factor=Math.min(current,.8);reason='Duas sessões com RPE ≥7 nos últimos três dias. Redução para separar esforços intensos entre modalidades.';}
    else if(current===1&&kind!=='brick'&&p.minutes>0&&p.date<'2026-12-13'&&!['S4','S8','S10'].includes(p.week)&&!/tiro|interval|forte|limiar|ritmo/i.test(p.title+' '+p.intensity)&&!(kind==='bike'&&!s.settings.stiRepaired)){
      const past=logs.filter(l=>l.date<date&&l.kind===kind), cs=checks.filter(c=>c.date<date);
      const clean=past.length>=4&&logs.every(l=>l.pain===0&&l.rpe!==null&&l.rpe<=6)&&cs.length>=10&&cs.every(c=>!c.alert&&c.pain===0&&c.sleep>=6&&c.recovery>=3);
      const ws=weekStart(p.date), we=addDays(ws,6);
      // One increase per week across sports; reductions never erase this audit limit.
      const already=s.decisions.some(d=>d.status==='approved'&&d.factor>1&&d.date>=ws&&d.date<=we);
      if(clean&&!already&&adherence(s,addDays(date,-14),addDays(date,-1)).percent>=80){
        const total=(kindFilter:boolean,from:string,to:string)=>logs.filter(l=>l.date>=from&&l.date<=to&&(!kindFilter||l.kind===kind)).reduce((a,l)=>a+l.duration,0);
        const baseline=(k:boolean)=>Math.min(total(k,addDays(date,-14),addDays(date,-8)),total(k,addDays(date,-7),addDays(date,-1)));
        const planned=(k:boolean)=>all.filter(x=>x.date>=ws&&x.date<=we&&(!k||modality(x)===kind)).reduce((a,x)=>a+effective(s,x).minutes,0);
        const budget=Math.min(baseline(true)*1.05-planned(true),baseline(false)*1.05-planned(false),p.minutes*.05);
        if(budget>=1){rule='progress';factor=1+Math.floor(budget)/p.minutes;reason=`Duas semanas registradas, aderência ≥80%, sem dor e recuperação consistente. Acréscimo de ${Math.floor(budget)} min; limites de 5% por sessão e por semana, por modalidade e no total, sobre a menor das duas semanas realizadas. Sem acelerar pace ou aumentar pesos.`;}
      }
    }
    if(!rule||factor===current)continue;
    const id=`v2:${rule}:${p.id}:${token}`;
    if(s.decisions.some(d=>d.id===id))continue;
    result.push({id,sessionId:p.id,date:p.date,factor,level:factor===0?'danger':factor<1?'warning':'info',title:`${factor===0?'Pausar':factor<1?'Reduzir volume de':'Progredir duração de'} ${p.title}`,reason,engineVersion:ENGINE_VERSION,rule,evidence:JSON.stringify(evidence),beforeFactor:current});
  }
  // Only one progression can be displayed at a time; approval recalculates budgets.
  if(s.profile)return result.filter(p=>p.factor<=1);
  let increase=false;return result.filter(p=>p.factor<=1||(!increase&&(increase=true)));
}

export function goalProjection(s:State,date=today(s.settings.timezone)) {
  const recent=s.logs.filter(l=>l.status==='completed'&&l.date>=addDays(date,-28)&&l.date<=date&&l.distance>0&&l.duration>0);
  const best=(kind:string)=>recent.filter(l=>l.kind===kind).sort((a,b)=>b.distance-a.distance||b.date.localeCompare(a.date)||a.id.localeCompare(b.id))[0];
  const run=best('run'),bike=best('bike');
  const days=Math.max(0,Math.round((Date.parse(GOAL.date+'T12:00:00Z')-Date.parse(date+'T12:00:00Z'))/86400000));
  const weeks=Math.floor(days/7);
  const scenario=(distance:number,target:number)=>({distance,ceiling:distance*Math.pow(1.05,weeks),weeksNeeded:distance>0?Math.max(0,Math.ceil(Math.log(target/distance)/Math.log(1.05))):null});
  const runScenario=scenario(run?.distance||0,GOAL.runKm),bikeScenario=scenario(bike?.distance||0,GOAL.bikeKm);
  const brick=recent.some(r=>r.kind==='run'&&r.sessionId&&recent.some(b=>b.kind==='bike'&&b.sessionId===r.sessionId&&b.date===r.date));
  const symptoms=recent.some(l=>l.pain>0)||s.checkins.some(c=>c.date>=addDays(date,-7)&&c.date<=date&&(c.alert||c.pain>0));
  return {days,weeks,run,bike,runScenario,bikeScenario,brick,symptoms,expired:date>GOAL.date,
    status:date>GOAL.date?'Prazo encerrado':!run||!bike?'Dados insuficientes':symptoms?'Reavaliar sintomas':runScenario.ceiling<GOAL.runKm||bikeScenario.ceiling<GOAL.bikeKm?'Distância fora do cenário de progressão':'Distância condicionada à evolução',
    runMinutes:run?GOAL.runKm*run.duration/run.distance:null,bikeMinutes:bike?GOAL.bikeKm*bike.duration/bike.distance:null};
}
