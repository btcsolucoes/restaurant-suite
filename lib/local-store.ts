import { applyAction, initialState, State, Source } from './domain';
const DATABASE='stride-athlete:'+(typeof document==='undefined'?'tests':new URL('./',document.baseURI).pathname);
const STORE='records';
type Snapshot={state:State;revision:number;updatedAt:string};
const empty:Source={filename:'Importe seu plano XLSX',sheets:[{name:'Calendario',rows:[['Data','Dia','Semana','Sessão','Treino prescrito','Musculação','Intensidade','Min estimados','Min reais','RPE real','Observações','Pace principal corrida','Tempo-alvo corrida (min)','RPE corrida','Ver detalhes']]}]};
export function openDatabase():Promise<IDBDatabase>{
  if(!('indexedDB' in globalThis))return Promise.reject(new Error('Este navegador não oferece banco local. Abra no Chrome ou Safari atualizado.'));
  return new Promise((resolve,reject)=>{const r=indexedDB.open(DATABASE,1);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);};r.onsuccess=()=>{r.result.onversionchange=()=>r.result.close();resolve(r.result);};r.onerror=()=>reject(r.error||new Error('Não foi possível abrir o banco local.'));r.onblocked=()=>reject(new Error('Feche outras abas do STRIDE e tente novamente.'));});
}
export async function readLocal():Promise<Snapshot>{
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);let result:Snapshot;
    const req=store.get('athlete');req.onsuccess=()=>{result=req.result||{state:initialState(empty),revision:0,updatedAt:new Date().toISOString()};if(!req.result)store.put(result,'athlete');};
    tx.oncomplete=()=>{db.close();resolve(result);};tx.onabort=()=>{db.close();reject(tx.error||new Error('Não foi possível ler seus dados.'));};tx.onerror=()=>{};
  });
}
export async function writeLocal(action:string,data:any,revision:number):Promise<Snapshot>{
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);let next:Snapshot,problem:Error|undefined;
    const req=store.get('athlete');req.onsuccess=()=>{try{const prev=req.result as Snapshot;if(!prev||prev.revision!==revision)throw new Error('Os dados mudaram em outra aba. Recarregue para preservar seus registros.');next={state:applyAction(prev.state,action,data),revision:prev.revision+1,updatedAt:new Date().toISOString()};store.put(next,'athlete');}catch(e){problem=e as Error;tx.abort();}};
    tx.oncomplete=()=>{db.close();try{const ch=new BroadcastChannel('stride-changes');ch.postMessage({revision:next.revision});ch.close();}catch{}resolve(next);};tx.onabort=()=>{db.close();reject(problem||tx.error||new Error('Não foi possível gravar. Verifique o espaço do telefone.'));};tx.onerror=()=>{};
  });
}
export async function requestPersistentStorage(){try{return await navigator.storage?.persist?.()||false;}catch{return false;}}
