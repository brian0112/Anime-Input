<!-- 在三個 HTML 頁面底部用：<script type="module" src="app.js"></script> -->
// app.js
/*********** CONFIG ***********/
export const API_URL = 'https://script.google.com/macros/s/AKfycbwn3uHYaGgRsGg2y0zV9SHpBkbhG9tP6OQtN_qD8gF7QXCyeBXsCxNrjzKDsGkoof5H/exec'; // ← 填你的 Web app URL
const DB_KEY = 'animeDB_v2_cloud';
/******************************/

// ========== 本機儲存（做為快取與離線備援） ==========
export function loadLocal(){
  try{ return JSON.parse(localStorage.getItem(DB_KEY)) ?? { items:[], logs:[] }; }
  catch{ return { items:[], logs:[] }; }
}
export function saveLocal(db){ localStorage.setItem(DB_KEY, JSON.stringify(db)); }
export function uid(){ return Math.random().toString(36).slice(2,10); }
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// ========== 後端 API（Apps Script） ==========
export const cloudEnabled = !!API_URL;
export async function cloudGetAll(){
  const r = await fetch(API_URL+'?action=getAll');
  if(!r.ok) throw new Error('getAll failed');
  return r.json();
}
export async function cloudAddAnime(a){
  const r = await fetch(API_URL, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ action:'addAnime', data:a })
  });
  if(!r.ok) throw new Error('addAnime failed');
}
export async function cloudDeleteAnime(id){
  const r = await fetch(API_URL, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ action:'deleteAnime', id })
  });
  if(!r.ok) throw new Error('deleteAnime failed');
}
export async function cloudAddLog(animeId, weekStartISO, eps){
  const r = await fetch(API_URL, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ action:'addLog', data:{ animeId, weekStartISO, eps } })
  });
  if(!r.ok) throw new Error('addLog failed');
}

// 啟動：若有雲端就用雲端資料覆蓋本機
export async function bootstrap(){
  try{
    if(cloudEnabled){
      const data = await cloudGetAll();
      saveLocal(data);
    }
  }catch(e){
    console.warn('Cloud init failed, using local cache:', e);
  }
}

// ========== 週次（台北時區，本地時間） ==========
export function mondayOf(d){ const x=new Date(d.getFullYear(),d.getMonth(),d.getDate()); const day=x.getDay(); const off=(day+6)%7; x.setDate(x.getDate()-off); x.setHours(0,0,0,0); return x; }
export function sundayOf(d){ const m=mondayOf(d); const s=new Date(m); s.setDate(m.getDate()+6); s.setHours(23,59,59,999); return s; }
export function weekLabel(d){ const m=mondayOf(d), s=sundayOf(d); const fmt=dt=> String(dt.getMonth()+1).padStart(2,'0')+'/'+String(dt.getDate()).padStart(2,'0'); return `${fmt(m)}–${fmt(s)}`; }
export function weekStartISOFromDate(d){ return mondayOf(d).toISOString(); }
export function formatWeekRangeFromISO(iso){ return weekLabel(new Date(iso)); }
export function recentWeeks(n=12){ const arr=[]; const now=new Date(); const base=mondayOf(now); for(let i=0;i<n;i++){ const st=new Date(base); st.setDate(base.getDate()-7*i); arr.push(st);} return arr; }

// ========== 共用 UI 工具 ==========
export function isComplete(a){ return (a.watched?.length||0) >= a.episodes && a.episodes>0; }
export function badgeHTML(a){ return `<span class="badge ${isComplete(a)?'complete':''}">觀看 ${a.watched?.length||0} / ${a.episodes}</span>`; }
export function nextUnwatched(a){ const set=new Set(a.watched||[]); for(let i=1;i<=a.episodes;i++){ if(!set.has(i)) return i; } return null; }
export function csvEscape(v){ const s=String(v??''); return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; }
export function compressToRanges(nums){
  if(nums.length===0) return [];
  const a=nums.slice().sort((x,y)=>x-y), out=[]; let start=a[0], prev=a[0];
  for(let i=1;i<a.length;i++){ const cur=a[i]; if(cur===prev+1){ prev=cur; continue; }
    out.push(start===prev?String(start):`${start}~${prev}`); start=prev=cur; }
  out.push(start===prev?String(start):`${start}~${prev}`); return out;
}
export function downloadText(text, filename){
  const blob = new Blob([text], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

// 「週次選單自動更新」：頁面每次重新載入、或分頁回到可見時，若已跨到新的一週，就重建最近 12 週選項。
export function autoUpdateWeekSelect(weekSelectEl){
  const build = ()=>{
    const weeks = recentWeeks(12);
    const cur = weekSelectEl.value;
    weekSelectEl.innerHTML = '';
    weeks.forEach((startDate, idx)=>{
      const opt = new Option(weekLabel(startDate), weekStartISOFromDate(startDate));
      if(idx===0) opt.selected = true;
      weekSelectEl.add(opt);
    });
    // 若原本選的週仍在範圍內就維持，否則預設本週
    if(cur && Array.from(weekSelectEl.options).some(o=>o.value===cur)){
      weekSelectEl.value = cur;
    }
  };
  build();
  document.addEventListener('visibilitychange', ()=>{
    if(document.visibilityState==='visible') build();
  });
}
