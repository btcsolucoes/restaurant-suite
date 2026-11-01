import assert from 'node:assert/strict';
import {initialState,applyAction,proposals,sessions,effective,validateBackup,addDays} from '../.qa/domain.mjs';
import {goalProjection} from '../.qa/adaptive.mjs';
import {parseWorkbook} from '../.qa/workbook.mjs';
const date='2026-11-09';
const header=['Data','Dia','Semana','Sessão','Treino prescrito','Musculação','Intensidade','Min estimados'];
const source={filename:'fixture',sheets:[{name:'Calendario',rows:[header,[date,'Seg','S3','Corrida fácil','','—','Leve',40],[date,'Seg','S3','Bike leve','','—','Leve',40],[addDays(date,1),'Ter','S3','Musculação','','—','Leve',40]]}]};
const check={date,sleep:5,recovery:2,pain:0,alert:false,notes:'',updatedAt:'test'};
let s=initialState(source);s.checkins=[check];
assert.deepEqual(proposals(s,date),proposals(structuredClone(s),date),'determinism');
assert.equal(proposals(s,date).length,3,'fatigue crosses all sports');
const original=structuredClone(s);let p=proposals(s,date)[0];
s=applyAction(s,'decision',{id:p.id,status:'approved'},date);
assert.deepEqual(s.source,original.source);assert.equal(effective(s,sessions(s.source)[0]).factor,.8);
assert.ok(s.decisions[0].evidence.includes('"sleep":5'));
assert.throws(()=>applyAction(s,'decision',{id:p.id,status:'approved'},date),/expirada/);
validateBackup(s);
s=applyAction(s,'checkin',{...check,pain:5},date);p=proposals(s,date)[0];assert.equal(p.factor,0,'pain supersedes existing approved reduction');
s=applyAction(s,'decision',{id:p.id,status:'approved'},date);assert.equal(s.overrides.filter(o=>o.sessionId===p.sessionId).length,1);
s=applyAction(s,'undo',{sessionId:p.sessionId},date);assert.equal(effective(s,sessions(s.source)[0]).factor,1);assert.equal(s.decisions.length,3);
const stale=proposals(original,date)[0];const changed=applyAction(original,'checkin',{...check,sleep:4},date);
assert.throws(()=>applyAction(changed,'decision',{id:stale.id,status:'approved'},date),/expirada/);
const rejected=applyAction(original,'decision',{id:stale.id,status:'rejected'},date);assert.ok(!proposals(rejected,date).some(p=>p.id===stale.id));
assert.equal(rejected.overrides.length,0);
let healthy=initialState(source);healthy.settings.stiRepaired=true;
for(let i=1;i<=14;i++)healthy.checkins.push({...check,date:addDays(date,-i),sleep:8,recovery:4,updatedAt:String(i)});
for(let i of [2,4,9,11]){
 const day=addDays(date,-i);healthy.source.sheets[0].rows.push([day,'','S2','Corrida fácil','','—','Leve',60]);
 const session=sessions(healthy.source).find(p=>p.date===day);
 healthy.logs.push({id:'run'+i,date:day,sessionId:session.id,kind:'run',status:'completed',distance:10,duration:60,rpe:5,pain:0,hr:null,notes:'',createdAt:''});
}
const progress=proposals(healthy,date).filter(p=>p.factor>1);assert.equal(progress.length,1);assert.ok(progress[0].factor<=1.05);
const grown=applyAction(healthy,'decision',{id:progress[0].id,status:'approved'},date);assert.equal(proposals(grown,date).filter(p=>p.factor>1).length,0);
const insufficient=structuredClone(healthy);insufficient.checkins=[];assert.equal(proposals(insufficient,date).length,0);
const overloaded=structuredClone(healthy);overloaded.source.sheets[0].rows[1][7]=500;assert.equal(proposals(overloaded,date).filter(p=>p.factor>1).length,0);
const taper=structuredClone(healthy);assert.equal(proposals(taper,'2026-12-14').filter(p=>p.factor>1).length,0);
const future=structuredClone(original);future.checkins=[{...check,date:'2027-01-01'}];assert.equal(proposals(future,date).length,0);
const completed=structuredClone(original);completed.logs=[{id:'done',date,sessionId:sessions(source)[0].id,kind:'run',status:'completed',distance:5,duration:30,rpe:5,pain:0,hr:null,notes:'',createdAt:''}];assert.ok(!proposals(completed,date).some(p=>p.sessionId===completed.logs[0].sessionId));
assert.equal(goalProjection(initialState(source),date).status,'Dados insuficientes');
const proj=goalProjection(healthy,date);assert.equal(proj.runMinutes,126.6);assert.equal(proj.bikeMinutes,null);
assert.equal(goalProjection(healthy,'2027-01-01').status,'Prazo encerrado');
const csv=header.join(';')+'\n2026-11-09;Seg;S3;Corrida fácil;5 km;—;Leve;30';
const imported=await parseWorkbook(new File(['\ufeff'+csv],'inicial.csv'));
assert.equal(imported.validation.errors.length,0);assert.equal(sessions(imported.source).length,1);
await assert.rejects(parseWorkbook(new File(['data;errado\nfoo;bar'],'bad.csv')).then(x=>{if(x.validation.errors.length)throw Error('inválido')}),/inválido/);
console.log('PASS: motor determinístico, três modalidades, evidências, aprovação, recusa, expiração, pausa sobre ajuste, reversão, limites semanais, falta de dados, projeções condicionais e CSV.');


for (const [kind,title] of [['bike','Bike leve'],['strength','Musculação']]) {
 const sport=structuredClone(healthy);
 sport.source.sheets[0].rows=sport.source.sheets[0].rows.filter((r,i)=>i===0||r[3]==='Corrida fácil');
 sport.source.sheets[0].rows.slice(1).forEach(r=>r[3]=title);
 sport.logs.forEach(l=>{l.kind=kind;l.sessionId=sessions(sport.source).find(p=>p.date===l.date).id;});
 assert.equal(proposals(sport,date).filter(p=>p.factor>1).length,1,kind+' progression');
 if(kind==='bike'){sport.settings.stiRepaired=false;assert.equal(proposals(sport,date).filter(p=>p.factor>1).length,0,'unrepaired STI');}
}
console.log('PASS: progressão específica de bike e força, bloqueio por STI pendente.');
