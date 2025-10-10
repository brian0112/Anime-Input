/**************** CONFIG（請改成你自己的 URL 與 TOKEN） ****************/
export const API_URL   = 'https://script.google.com/macros/s/AKfycbyHc_6KQmrJ2BwHMX6P5aPT87WZ4EZCgoLq6qUvzZxTl7KDYAjhXVGa6vAaHkfvCCm-/exec';
export const API_TOKEN = 'Saray0112-Key';
const DB_KEY = 'animeDB_v2_cloud';
/***********************************************************************/

/* 本機快取 */
export function loadLocal(){
  try { return JSON.parse(localStorage.getItem(DB_KEY)) ?? { items:[], logs:[] }; }
  catch { return { items:[], logs:[] }; }
}
export function saveLocal(db){ localStorage.setItem(DB_KEY, JSON.stringify(db)); }
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* 週次工具 */
export function mondayOf(d=new Date()){ const x=new Date(d); const w=x.getDay()||7; if(w!==1) x.setDate(x.getDate()-(w-1)); x.setHours(0,0,0,0); return x; }
export const isoDate = d => d.toISOString().slice(0,10);
export function weekLabelFromISO(iso){ const s=new Date(iso), e=new Date(s); e.setDate(e.getDate()+6); const pad=n=>String(n).padStart(2,'0'); return `${s.getMonth()+1}/${pad(s.getDate())} ~ ${e.getMonth()+1}/${pad(e.getDate())}`; }
export function recentWeekStarts(n=12){ const base=mondayOf(); return Array.from({length:n},(_,i)=>{const d=new Date(base); d.setDate(d.getDate()-i*7); return isoDate(d);}); }

/* UI 小工具 */
export function badgeHTML(a){ const d=a.watched?.length||0, t=a.episodes||0, done=t&&d>=t?' complete':''; return `<span class="badge${done}">進度：${d} / ${t}</span>`; }
export function compressRanges(nums){ if(!nums?.length) return []; const a=[...new Set(nums)].sort((x,y)=>x-y); const out=[]; let s=a[0],p=a[0]; for(let i=1;i<a.length;i++){ if(a[i]===p+1){p=a[i];continue;} out.push(s===p?`${s}`:`${s}~${p}`); s=p=a[i]; } out.push(s===p?`${s}`:`${s}~${p}`); return out; }
export function downloadCSV(name, rows){ const csv=rows.map(r=>r.map(v=>{const s=String(v??''); return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;}).join(',')).join('\r\n'); const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }

/* ====== 雲端 API（避免 preflight） ======
 * 1) GET：把 token 放在 query 裡
 * 2) POST：用 Content-Type: text/plain；body 傳純字串 JSON
 *    這樣 Apps Script 不會有 OPTIONS 預檢，CORS 也不會擋
 */
export const cloudEnabled = !!API_URL;

async function postAction(obj){
  const payload = JSON.stringify({ ...obj, token: API_TOKEN });
  const r = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: payload
  });
  if(!r.ok) throw new Error(`${obj.action} failed (${r.status})`);
  return r.json();
}

export async function cloudGetAll(){
  const r = await fetch(`${API_URL}?action=getAll&token=${encodeURIComponent(API_TOKEN)}`, { method:'GET' });
  if(!r.ok) throw new Error(`getAll failed (${r.status})`);
  return r.json();
}
export function cloudAddAnime(data){ return postAction({ action:'addAnime', data }); }
export function cloudDeleteAnime(id){ return postAction({ action:'deleteAnime', id }); }
export function cloudAddLog(animeId, weekStartISO, eps){ return postAction({ action:'addLog', data:{ animeId, weekStartISO, eps } }); }

/* 主題切換（header 的「主題」按鈕使用） */
function setupHeaderThemeToggle(){
  const saved = localStorage.getItem('theme');
  if(saved==='light') document.documentElement.classList.add('light');
  const btn = document.getElementById('themeToggle'); if(!btn) return;
  const apply = ()=>{ const light=document.documentElement.classList.contains('light'); btn.textContent=light?'深色':'淺色'; btn.setAttribute('aria-pressed', String(light)); };
  apply();
  btn.addEventListener('click', ()=>{ const light=document.documentElement.classList.toggle('light'); localStorage.setItem('theme', light?'light':'dark'); apply(); });
}
if(typeof window!=='undefined') window.setupHeader = setupHeaderThemeToggle;
document.addEventListener('DOMContentLoaded', ()=>{ try{ setupHeaderThemeToggle(); }catch(e){} });
