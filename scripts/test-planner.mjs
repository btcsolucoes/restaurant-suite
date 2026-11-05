import assert from 'node:assert/strict';
import {initialState,applyAction,sessions,validateBackup,addDays,proposals,adherence,effective} from '../.qa/domain.mjs';
import {defaultProfile,weekProposal,runningTrend} from '../.qa/planner.mjs';
import {parseWorkbook,exportBackup} from '../.qa/workbook.mjs';
const date='2026-11-08',empty={filename:'empty',sheets:[{name:'Calendario',rows:[['Data','Dia','Semana','Sessão','Treino prescrito','Musculação','Intensidade','Min estimados']]}]};
let s=initialState(empty);assert.equal(weekProposal(s,date),null);
s=applyAction(s,'profile',defaultProfile(date),date);const p=weekProposal(s,date);
assert.equal(p.totals.run,70);assert.equal(p.start,'2026-11-09');assert.equal(p.summary.length,7);assert.equal(p.eligible,false);assert(p.summary[6][3].includes('Simulado'));assert(p.summary.slice(0,6).every(r=>r[5]!=='—'));
const old=structuredClone(s);let approved=applyAction(s,'week-decision',{id:p.id,status:'approved'},date);
assert.deepEqual(s,old,'preview and approval are immutable');assert.equal(sessions(approved.source).length,7);assert.deepEqual(approved.logs,old.logs);assert(weekProposal(approved,date).decided);
validateBackup(approved);assert.throws(()=>applyAction(approved,'week-decision',{id:p.id,status:'approved'},date),/expirada/);
let undone=applyAction(approved,'week-undo',{id:p.id},date);assert.deepEqual(undone.source,old.source);validateBackup(undone);
const stale=structuredClone(s);stale.checkins.push({date,sleep:5,recovery:1,pain:0,alert:false,notes:'',updatedAt:'new'});assert.throws(()=>applyAction(stale,'week-decision',{id:p.id,status:'approved'},date),/expirada/);
let reject=applyAction(s,'week-decision',{id:p.id,status:'rejected'},date);assert.deepEqual(reject.source,s.source);assert(!weekProposal(reject,date).decided);
const log=(id,day,kind='run',duration=30)=>({id,date:day,sessionId:'',kind,status:'completed',distance:kind==='run'?duration/7:0,duration,hr:null,rpe:4,pain:0,notes:'',createdAt:''});
let rich=structuredClone(s);rich.profile.weeklyRunMinutes=90;
for(let i=0;i<14;i++){rich.checkins.push({date:addDays(date,-i),sleep:8,recovery:4,pain:0,alert:false,notes:'',updatedAt:String(i)});if(i%2===0)rich.logs.push(log('r'+i,addDays(date,-i)));}
let grow=weekProposal(rich,date);assert(grow.eligible);assert(grow.totals.run<=Math.min(90,120)*1.1);assert(grow.quality.includes('×'));assert(grow.summary.find(r=>r[1]==='Qua')[4].includes('indoor'));
rich.logs.push({...log('pain',date),pain:4});const paused=weekProposal(rich,date);assert(paused.needsReview);assert(!paused.locked);assert(paused.totals.run+paused.totals.bike+paused.totals.strength>0);
const future=log('future',p.start);let locked={...s,logs:[future]};assert(!weekProposal(locked,date).locked);assert(!weekProposal(locked,date).dates.includes(p.start));
const planned=sessions(approved.source)[0];approved=applyAction(approved,'training',{...log('completed',planned.date,'strength',40),sessionId:planned.id},date);assert.throws(()=>applyAction(approved,'week-undo',{id:p.id},date),/desfazer/);
const tue=sessions(approved.source)[1];let mixed=applyAction(approved,'training',{...log('tue-run',tue.date),sessionId:tue.id},date);assert.equal(adherence(mixed,tue.date,tue.date).done,0);mixed=applyAction(mixed,'training',{...log('tue-strength',tue.date,'strength',20),sessionId:tue.id},date);assert.equal(adherence(mixed,tue.date,tue.date).done,1);assert.equal(effective(mixed,tue).runKm,null);
assert.equal(runningTrend(s,date),null);let t=structuredClone(s);for(const offset of [1,3,5,15,17,19])t.logs.push({...log('t'+offset,addDays(date,-offset),'run',30),distance:offset<14?5:4.5,environment:'outdoor',workoutType:'easy'});assert(runningTrend(t,date).change>0);t.logs.forEach(x=>x.workoutType='brick');assert.equal(runningTrend(t,date),null);
let captured;globalThis.URL.createObjectURL=b=>{captured=b;return 'blob:test'};globalThis.URL.revokeObjectURL=()=>{};globalThis.document={createElement:()=>({click(){},remove(){}}),body:{appendChild(){}}};globalThis.setTimeout=()=>0;
exportBackup(approved);const parsed=await parseWorkbook(new File([await captured.arrayBuffer()],'backup.xlsx'));assert.deepEqual(parsed.backup,approved);
assert.throws(()=>applyAction(s,'profile',{...s.profile,longRunMinutes:100},date));
const boundary=weekProposal(s,'2026-12-27');assert.equal(boundary.summary.length,4);assert(boundary.taper);assert.equal(weekProposal(s,'2027-01-01'),null);
console.log('PASS: native onboarding, immutable week preview, six strength days, Sunday brick, stale approval, rejection, undo, recorded-week lock, progression evidence, pain pause, goal boundary, matched performance and complete XLSX backup.');

// Revising the current week preserves earlier plans and accounts for their running load.
const wed='2026-11-04';let partial=initialState({filename:'legacy.xlsx',sheets:[{name:'Calendario',rows:[empty.sheets[0].rows[0],['2026-11-03','Ter','S1','Corrida fácil','20 min','—','RPE 3',20],[wed,'Qua','S1','Bike + pernas','Bike','Leg press 1 × 10','RPE 3',60]]}]});
partial=applyAction(partial,'profile',defaultProfile(wed),wed);
const current=weekProposal(partial,wed,'current');assert.equal(current.start,wed);assert.equal(current.end,'2026-11-08');assert.equal(current.summary.length,5);assert.equal(current.retainedRun,20);assert(current.totals.run+current.retainedRun<=current.budget);assert(current.summary[0][5].includes('Flexora 2×'));
const fixed=applyAction(partial,'week-decision',{id:current.id,scope:'current',status:'approved'},wed);assert.deepEqual(fixed.source.sheets[0].rows[1],partial.source.sheets[0].rows[1]);assert.equal(fixed.source.sheets.find(x=>x.name==='Musculacao').rows.filter(r=>r[6]===wed).length,4);validateBackup(fixed);
const restored=applyAction(fixed,'week-undo',{id:current.id},wed);assert.deepEqual(restored.source,partial.source);
assert.throws(()=>applyAction(partial,'week-decision',{id:current.id,scope:'next',status:'approved'},wed));
assert.equal(weekProposal(partial,'2026-11-08','current').summary.length,1);
partial.logs.push(log('already',wed,'bike'));
const remaining=weekProposal(partial,wed,'current');assert(!remaining.locked);assert.equal(remaining.summary.length,4);assert(!remaining.dates.includes(wed));
const kept=applyAction(partial,'week-decision',{id:remaining.id,scope:'current',status:'approved'},wed);assert.deepEqual(kept.logs,partial.logs);assert.deepEqual(kept.source.sheets[0].rows[2],partial.source.sheets[0].rows[2]);
assert.deepEqual(applyAction(kept,'week-undo',{id:remaining.id},wed).source,partial.source);
const allRecorded=structuredClone(partial);for(let i=1;i<5;i++)allRecorded.logs.push(log('done'+i,addDays(wed,i)));assert(weekProposal(allRecorded,wed,'current').locked);
const declined=applyAction(partial,'week-decision',{id:remaining.id,scope:'current',status:'rejected'},wed);assert(!weekProposal(declined,wed,'current').decided);
validateBackup(kept);assert.throws(()=>validateBackup({...kept,weekDecisions:[{...kept.weekDecisions[0],dates:['invalid']}]}));

console.log('PASS: current-week revision, Sunday boundary, retained load, dated strength, undo and scope validation.');
// Recovery must be explained and must never overwrite a week with zero sessions.
const recovery=structuredClone(s);recovery.logs=[log('old-pain','2026-11-06')];recovery.logs[0].pain=4;
let held=weekProposal(recovery,date);assert(held.needsReview&&!held.locked);assert(held.reason.includes('2026-11-06'));const appliedRecovery=applyAction(recovery,'week-decision',{id:held.id,status:'approved'},date);validateBackup(appliedRecovery);
recovery.checkins=[{date,sleep:8,recovery:4,pain:0,alert:false,notes:'',updatedAt:''}];assert(!weekProposal(recovery,date).needsReview);
recovery.checkins[0].alert=true;assert(weekProposal(recovery,date).needsReview);recovery.checkins[0].alert=false;
recovery.logs[0].date=date;assert(weekProposal(recovery,date).needsReview);
console.log('PASS: recovery evidence, no whole-week pause writes, newer check-in reevaluation, same-day pain and alerts retained.');

const dayReview=structuredClone(s);dayReview.checkins=[{date:'2026-11-04',sleep:8,recovery:3,pain:4,alert:false,notes:'',updatedAt:''}];const sameDay=weekProposal(dayReview,'2026-11-04','current');assert(!sameDay.locked);assert.equal(sameDay.summary[0][7],0);assert(sameDay.summary[0][3].includes('reavaliar'));assert(sameDay.summary.slice(1).some(r=>r[7]>0));
