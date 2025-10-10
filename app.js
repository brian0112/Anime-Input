/**************** CONFIG（請改成你的 URL / TOKEN） ****************/
export const API_URL   = 'https://script.google.com/macros/s/AKfycbyHc_6KQmrJ2BwHMX6P5aPT87WZ4EZCgoLq6qUvzZxTl7KDYAjhXVGa6vAaHkfvCCm-/exec';
export const API_TOKEN = 'Saray0112_Key';
const DB_KEY = 'animeDB_v2_cloud';
/******************************************************************/

/* 本機快取 */
export function loadLocal(){
  try{ return JSON.parse(localStorage.getItem(DB_KEY)) ?? { items:[], logs:[] }; }
  catch{ return { items:[], logs:[] }; }
}
export function saveLocal(db){ localStorage.setItem(DB_KEY, JSON.stringify(db)); }

/* 小工具 */
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const uniq  = arr => Array.from(new Set(arr));
export const byStr = (a,b)=> String(a).localeCompare(String(b),'zh-Hant');

/* 台北時區週次（週一~週日） */
const TPE = 8*60*60*1000, DAY=24*60*60*1000;
const toTpe = ms => new Date(ms + TPE);
export function mondayOfTpe(d=new Date()){
  const t=toTpe(d.getTime()), dow=t.getUTCDay(), delta=(dow===0?6:dow-1);
  const mon = new Date(t.getTime()-delta*DAY); mon.setUTCHours(0,0,0,0);
  return new Date(mon.getTime()-TPE);
}
export function isoDateTpe(d){ return toTpe(d.getTime()).toISOString().slice(0,10); }
export function recentWeekStarts(n=12){
  const base = mondayOfTpe(new Date()); const out=[];
  for(let i=0;i<n;i++){ const d=new Date(base.getTime()-i*7*DAY); out.push(isoDateTpe(d)); }
  return out;
}
export function weekLabelFromISO(iso){
  const sUTC = new Date(iso+'T00:00:00Z');
  const s = toTpe(sUTC.getTime()), e = new Date(s.getTime()+6*DAY);
  const fmt = new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',month:'numeric',day:'2-digit'});
  return `${fmt.format(s)} ~ ${fmt.format(e)}`;
}

/* Badge：完成亮色 */
export function badgeHTML(done,total){
  const complete = total>0 && done>=total ? ' complete' : '';
  return `<span class="badge${complete}">${done}/${total}</span>`;
}

/* 區間壓縮： [1,2,3,7,8] → ["1~3","7~8"] */
export function compressRanges(nums){
  if(!nums?.length) return [];
  const a=[...new Set(nums)].sort((x,y)=>x-y), out=[]; let s=a[0],p=a[0];
  for(let i=1;i<a.length;i++){ const v=a[i]; if(v===p+1){p=v;continue;} out.push(s===p?`${s}`:`${s}~${p}`); s=p=v; }
  out.push(s===p?`${s}`:`${s}~${p}`); return out;
}

/* 匯出 CSV */
export function downloadCSV(filename, rows){
  const csv = rows.map(r => r.map(v=>{
    const s=String(v??''); return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;
  }).join(',')).join('\r\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=filename;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

/* 速度評價（以本週總集數 Y） */
export function speedRating(y){
  if(y<=5) return '極慢';
  if(y<=15) return '緩慢';
  if(y<=30) return '中等';
  if(y<=50) return '快速';
  if(y<=70) return '極快';
  if(y<=100) return '極限';  // 100 歸入極限
  if(y<=200) return '混沌';
  return '混沌';
}

/* 雲端 API（避免預檢） */
async function postAction(obj){
  const payload = JSON.stringify({ ...obj, token: API_TOKEN });
  const r = await fetch(API_URL, { method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:payload });
  const j = await r.json();
  if(!r.ok || j.error) throw new Error(j.error || `${obj.action} failed`);
  return j;
}
export async function cloudGetAll(){
  const r = await fetch(`${API_URL}?action=getAll&token=${encodeURIComponent(API_TOKEN)}`);
  const j = await r.json();
  if(j.error) throw new Error(j.error);
  return j;
}
export const cloudAddAnime    = data => postAction({ action:'addAnime', data });
export const cloudDeleteAnime = id   => postAction({ action:'deleteAnime', id });
export const cloudAddLog      = (animeId, weekStartISO, eps) => postAction({ action:'addLog', data:{animeId, weekStartISO, eps} });

/* 匯出：單週 CSV（依規格 A/B/C/E 欄，含總計與速度評價） */
export function exportWeekCSV(db, weekISO){
  const id2 = Object.fromEntries(db.items.map(a=>[a.id,a]));
  const by  = new Map(); // animeId -> Set(eps)
  db.logs.filter(l=>l.weekStartISO===weekISO).forEach(l=>{
    const set = by.get(l.animeId) ?? new Set();
    l.eps.forEach(e=>set.add(e)); by.set(l.animeId,set);
  });
  const rows=[]; rows.push(['動漫','集數','進度(第X集)','', '速度評價(Y集)']);
  let total=0;
  const entries = Array.from(by.entries()).sort((A,B)=>byStr(id2[A[0]]?.name||A[0], id2[B[0]]?.name||B[0]));
  for(const [aid,set] of entries){
    const eps = Array.from(set).sort((x,y)=>x-y);
    total += eps.length;
    rows.push([ id2[aid]?.name || aid, String(eps.length), compressRanges(eps).join(', ') ]);
  }
  rows.push([]); rows.push(['總計', String(total)]);
  rows[0][4] = `速度評價（${total}集）`;
  rows[1][4] = speedRating(total);
  const filename = `anime_week_${weekISO} (${weekLabelFromISO(weekISO)}).csv`;
  downloadCSV(filename, rows);
}

/* 匯出：多週（所選範圍）一次各出一檔 */
export function exportWeeksCSV(db, weeks){
  const list = weeks.slice().sort();
  if(!list.length){ alert('沒有週次'); return; }
  list.forEach(w => exportWeekCSV(db, w));
}

/* 搜尋過濾 */
export function filterItemsByKeyword(items, kw){
  const k = String(kw||'').trim().toLowerCase();
  if(!k) return items;
  return items.filter(a => String(a.name||'').toLowerCase().includes(k));
}
