// app.js — 共用邏輯（雲端同步 / 週次 / 匯出 / UI 工具）
/*********** CONFIG ***********/
export const API_URL = 'https://script.google.com/macros/s/AKfycbwn3uHYaGgRsGg2y0zV9SHpBkbhG9tP6OQtN_qD8gF7QXCyeBXsCxNrjzKDsGkoof5H/exec'; // ← 改成你的 Web App URL
const DB_KEY = 'animeDB_v2_cloud';
/******************************/

/* 本機儲存（快取＋離線備援） */
export function loadLocal(){
  try{ return JSON.parse(localStorage.getItem(DB_KEY)) ?? { items:[], logs:[] }; }
  catch{ return { items:[], logs:[] }; }
}
export function saveLocal(db){ localStorage.setItem(DB_KEY, JSON.stringify(db)); }
export function uid(){ return Math.random().toString(36).slice(2,10); }
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/* 後端（Apps Script）API */
export const cloudEnabled = !!API_URL;
export async function cloudGetAll(){
  const r = await fetch(API_URL+'?action=getAll'); if(!r.ok) throw new Error('getAll failed'); return r.json();
}
// app.js 內，替換這三個函式

export async function cloudAddAnime(a){
  const body = new URLSearchParams({ action: 'addAnime', data: JSON.stringify(a) });
  const r = await fetch(API_URL, { method: 'POST', body });
  if (!r.ok) throw new Error('addAnime failed');
}

export async function cloudDeleteAnime(id){
  const body = new URLSearchParams({ action: 'deleteAnime', id });
  const r = await fetch(API_URL, { method: 'POST', body });
  if (!r.ok) throw new Error('deleteAnime failed');
}

export async function cloudAddLog(animeId, weekStartISO, eps){
  const body = new URLSearchParams({
    action: 'addLog',
    data: JSON.stringify({ animeId, weekStartISO, eps })
  });
  const r = await fetch(API_URL, { method: 'POST', body });
  if (!r.ok) throw new Error('addLog failed');
}

/** 啟動：若雲端可用，抓雲端覆蓋本機 */
export async function bootstrap(){
  try{ if(cloudEnabled){ const data = await cloudGetAll(); saveLocal(data); } }
  catch(e){ console.warn('Cloud init failed, using local cache:', e); }
}

/* 週次工具（以本地時區計算週一～週日） */
export function mondayOf(d){ const x=new Date(d.getFullYear(),d.getMonth(),d.getDate()); const day=x.getDay(); const off=(day+6)%7; x.setDate(x.getDate()-off); x.setHours(0,0,0,0); return x; }
export function sundayOf(d){ const m=mondayOf(d); const s=new Date(m); s.setDate(m.getDate()+6); s.setHours(23,59,59,999); return s; }
export function weekLabel(d){ const m=mondayOf(d), s=sundayOf(d); const f=dt=>String(dt.getMonth()+1).padStart(2,'0')+'/'+String(dt.getDate()).padStart(2,'0'); return `${f(m)}–${f(s)}`; }
export function weekStartISOFromDate(d){ return mondayOf(d).toISOString(); }
export function formatWeekRangeFromISO(iso){ return weekLabel(new Date(iso)); }
export function recentWeeks(n=12){ const arr=[]; const base=mondayOf(new Date()); for(let i=0;i<n;i++){ const st=new Date(base); st.setDate(base.getDate()-7*i); arr.push(st);} return arr; }
/** 週次選單自動保持最新 */
export function autoUpdateWeekSelect(weekSelectEl){
  const build=()=>{ const cur=weekSelectEl.value; weekSelectEl.innerHTML='';
    recentWeeks(12).forEach((d,i)=>{ const opt=new Option(weekLabel(d),weekStartISOFromDate(d)); if(i===0) opt.selected=true; weekSelectEl.add(opt); });
    if(cur && Array.from(weekSelectEl.options).some(o=>o.value===cur)) weekSelectEl.value=cur; };
  build(); document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible') build(); });
}

/* 共用 UI/資料 輔助 */
export function isComplete(a){ return (a.watched?.length||0) >= a.episodes && a.episodes>0; }
export function badgeHTML(a){ return `<span class="badge ${isComplete(a)?'complete':''}">觀看 ${a.watched?.length||0} / ${a.episodes}</span>`; }
export function nextUnwatched(a){ const set=new Set(a.watched||[]); for(let i=1;i<=a.episodes;i++){ if(!set.has(i)) return i; } return null; }

/* 匯出：CSV 工具 */
export function csvEscape(v){ const s=String(v??''); return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; }
export function compressToRanges(nums){ if(!nums||nums.length===0) return []; const a=nums.slice().sort((x,y)=>x-y), out=[]; let start=a[0], prev=a[0];
  for(let i=1;i<a.length;i++){ const c=a[i]; if(c===prev+1){prev=c;continue;} out.push(start===prev?String(start):`${start}~${prev}`); start=prev=c; }
  out.push(start===prev?String(start):`${start}~${prev}`); return out; }
export function downloadText(text, filename){ const blob=new Blob([text],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
