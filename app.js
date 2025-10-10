/**************** CONFIG：請改你的 URL / TOKEN ****************/
export const API_URL   = 'https://script.google.com/macros/s/AKfycbyHc_6KQmrJ2BwHMX6P5aPT87WZ4EZCgoLq6qUvzZxTl7KDYAjhXVGa6vAaHkfvCCm-/exec';
export const API_TOKEN = 'Saray0112-Key';
const DB_KEY = 'animeDB_v2_cloud';
/**************************************************************/

/* 本機快取 */
export function loadLocal(){
  try { return JSON.parse(localStorage.getItem(DB_KEY)) ?? { items:[], logs:[] }; }
  catch { return { items:[], logs:[] }; }
}
export function saveLocal(db){ localStorage.setItem(DB_KEY, JSON.stringify(db)); }
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const uniq  = arr => Array.from(new Set(arr));

/* ====== 週次（台北時區） ======
   台灣固定 UTC+8，透過「加 8 小時後用 UTC API 取週幾」來得到台北時區的邏輯日曆。 */
const TPE_OFFSET = 8 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

function toTpe(ms){ return new Date(ms + TPE_OFFSET); }      // 轉到「台北時區」視角
function fromTpe(ms){ return new Date(ms - TPE_OFFSET); }    // 從「台北視角」轉回實際 UTC

export function mondayOfTpe(d = new Date()){
  const tpe = toTpe(d.getTime());
  const dow = tpe.getUTCDay();               // 0(日)~6(六) 但以台北視角計
  const delta = (dow === 0 ? 6 : dow - 1);   // 距離週一的天數
  const mondayTpe = new Date(tpe.getTime() - delta * DAY);
  mondayTpe.setUTCHours(0,0,0,0);            // 台北 00:00
  return fromTpe(mondayTpe.getTime());       // 還原為實際 UTC 時刻
}

export function isoDateTpe(d){               // 回傳「台北視角」日期 YYYY-MM-DD
  const tpe = toTpe(d.getTime());
  return tpe.toISOString().slice(0,10);
}

export function recentWeekStarts(n = 12){
  const base = mondayOfTpe(new Date());     // 本週一（台北）
  const out = [];
  for(let i=0; i<n; i++){
    const d = new Date(base.getTime() - i * 7 * DAY);
    out.push(isoDateTpe(d));
  }
  return out;
}

export function weekLabelFromISO(iso){      // 顯示：MM/DD ~ MM/DD（台北）
  const startUTC = new Date(`${iso}T00:00:00Z`);             // 以 UTC 解析
  const startTpe = toTpe(startUTC.getTime());
  const endTpe   = new Date(startTpe.getTime() + 6 * DAY);
  const fmt = new Intl.DateTimeFormat('zh-TW', { timeZone:'Asia/Taipei', month:'numeric', day:'2-digit' });
  return `${fmt.format(startTpe)} ~ ${fmt.format(endTpe)}`;
}

/* ====== 工具 ====== */
export function nextUnwatched(anime){
  const set = new Set(anime?.watched || []);
  for(let i=1; i<= (anime?.episodes||0); i++){
    if(!set.has(i)) return i;
  }
  return 1;
}
export function expandRange(start, end){
  const [s,e] = [Number(start), Number(end)];
  if(!Number.isFinite(s) || !Number.isFinite(e)) return [];
  const lo = Math.min(s,e), hi = Math.max(s,e);
  const out = [];
  for(let i=lo;i<=hi;i++) out.push(i);
  return out;
}

/* ====== 雲端 API（避免 preflight） ====== */
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

/* ====== 重複集數檢查 ====== */
export function findDupEpisodes(anime, eps){
  const watched = new Set(anime?.watched || []);
  return uniq(eps).filter(x => watched.has(x));
}

/* ====== 主題切換（header 的按鈕） ====== */
function setupHeaderThemeToggle(){
  const saved = localStorage.getItem('theme');
  if(saved === 'light') document.documentElement.classList.add('light');
  const btn = document.getElementById('themeToggle'); if(!btn) return;
  const apply = ()=>{
    const light = document.documentElement.classList.contains('light');
    btn.textContent = light ? '深色' : '淺色';
    btn.setAttribute('aria-pressed', String(light));
  };
  apply();
  btn.addEventListener('click', ()=>{
    const light = document.documentElement.classList.toggle('light');
    localStorage.setItem('theme', light ? 'light' : 'dark');
    apply();
  });
}
if(typeof window!=='undefined') window.setupHeader = setupHeaderThemeToggle;
document.addEventListener('DOMContentLoaded', ()=>{ try{ setupHeaderThemeToggle(); }catch(e){} });
