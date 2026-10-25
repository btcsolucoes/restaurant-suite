import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const resources=files('dist').filter(p=>!p.endsWith('sw.js')).map(p=>'./'+p.slice(5).replaceAll('\\','/')).sort();
const revision=crypto.createHash('sha256');for(const file of resources)revision.update(fs.readFileSync('dist/'+file.slice(2)));const hash=revision.digest('hex').slice(0,16);
const worker=`const BASE=new URL('./',self.location.href);const PREFIX='stride-shell-'+BASE.pathname+'-';const CACHE=PREFIX+'${hash}';const FILES=${JSON.stringify(resources)};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(p=>new Request(new URL(p,BASE).href,{cache:'reload'}))))));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('activate',e=>e.waitUntil((async()=>{const keys=(await caches.keys()).filter(k=>k.startsWith(PREFIX)&&k!==CACHE);const old=keys.slice(0,-1);await Promise.all(old.map(k=>caches.delete(k)));await self.clients.claim();})()));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==BASE.origin||!u.pathname.startsWith(BASE.pathname)||u.pathname.endsWith('/sw.js'))return;
e.respondWith((async()=>{const cache=await caches.open(CACHE);if(e.request.mode==='navigate'){return await cache.match(new URL('index.html',BASE).href)||fetch(e.request);}
const hit=await cache.match(e.request)||await caches.match(e.request);return hit||fetch(e.request);})());});`;
fs.writeFileSync('dist/sw.js',worker);fs.copyFileSync('dist/index.html','dist/404.html');console.log('Service worker '+hash+' · '+resources.length+' recursos · dados IndexedDB preservados.');
