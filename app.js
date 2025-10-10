// app.js — 共用邏輯（雲端同步 / 週次 / 匯出 / UI 工具）
/*********** CONFIG ***********/
export const API_URL = 'https://script.google.com/macros/s/AKfycbyHc_6KQmrJ2BwHMX6P5aPT87WZ4EZCgoLq6qUvzZxTl7KDYAjhXVGa6vAaHkfvCCm-/exec'; // ← 改成最新 Web App URL
export const API_TOKEN = 'Saray0112-Key'; // ← 與 code.gs 的 MY_TOKEN 相同
const DB_KEY = 'animeDB_v2_cloud';
/******************************/

/* 本機儲存（快取＋離線備援） */
export function loadLocal() {
  try { return JSON.parse(localStorage.getItem(DB_KEY)) ?? { items: [], logs: [] }; }
  catch { return { items: [], logs: [] }; }
}
export function saveLocal(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
export function uid() { return Math.random().toString(36).slice(2, 10); }
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/* 後端（Apps Script）API */
export const cloudEnabled = !!API_URL;

export async function cloudGetAll() {
  const r = await fetch(`${API_URL}?action=getAll&token=${API_TOKEN}`);
  if (!r.ok) throw new Error('getAll failed');
  return r.json();
}

export async function cloudAddAnime(a) {
  const body = new URLSearchParams({
    action: 'addAnime',
    data: JSON.stringify(a),
    token: API_TOKEN
  });
  const r = await fetch(API_URL, { method: 'POST', body });
  if (!r.ok) throw new Error('addAnime failed');
}

export async function cloudDeleteAnime(id) {
  const body = new URLSearchParams({
    action: 'deleteAnime',
    id,
    token: API_TOKEN
  });
  const r = await fetch(API_URL, { method: 'POST', body });
  if (!r.ok) throw new Error('deleteAnime failed');
}

export async function cloudAddLog(animeId, weekStartISO, eps) {
  const body = new URLSearchParams({
    action: 'addLog',
    data: JSON.stringify({ animeId, weekStartISO, eps }),
    token: API_TOKEN
  });
  const r = await fetch(API_URL, { method: 'POST', body });
  if (!r.ok) throw new Error('addLog failed');
}

/* UI 工具 */
export function badgeHTML(a) {
  const done = Array.isArray(a?.watched) ? a.watched.length : 0;
  const total = Number(a?.episodes) || 0;
  return `<span class="badge ${done >= total ? 'complete' : ''}">已看 ${done}/${total}</span>`;
}

/* 啟動流程 */
export async function bootstrap() {
  console.log('App bootstrap start');
  try {
    const data = await cloudGetAll();
    saveLocal(data);
    console.log('Cloud sync success:', data);
  } catch (err) {
    console.error('Cloud sync failed:', err);
  }
}
// === 主題切換（深/淺色） ===
function setupHeaderThemeToggle(){
  // 套用記憶的主題（預設深色）
  const saved = localStorage.getItem('theme'); // 'light' | 'dark' | null
  if (saved === 'light') document.documentElement.classList.add('light');

  // 綁定按鈕
  const btn = document.getElementById('themeToggle');
  if (!btn) return; // header 可能尚未載入

  const applyLabel = ()=>{
    const isLight = document.documentElement.classList.contains('light');
    btn.textContent = isLight ? '深色' : '淺色'; // 顯示切換成對方
    btn.setAttribute('aria-pressed', String(isLight));
  };
  applyLabel();

  btn.addEventListener('click', ()=>{
    const isLight = document.documentElement.classList.toggle('light');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    applyLabel();
  });
}

// 讓 include-loader 能在把 header 放進頁面後呼叫
if (typeof window !== 'undefined') {
  window.setupHeader = setupHeaderThemeToggle;
}

// 若某頁沒有用 include-loader，也保險在 DOM 完成時再試一次
document.addEventListener('DOMContentLoaded', ()=> {
  try { setupHeaderThemeToggle(); } catch (_) {}
});
