/**************** CONFIG（請填入你自己的 Web App URL + TOKEN） ****************/
export const API_URL = 'https://script.google.com/macros/s/AKfycbyHc_6KQmrJ2BwHMX6P5aPT87WZ4EZCgoLq6qUvzZxTl7KDYAjhXVGa6vAaHkfvCCm-/exec';
export const API_TOKEN = 'Saray0112-Key';  // ← 與 code.gs 裡 MY_TOKEN 相同
const DB_KEY = 'animeDB_v2_cloud';
/*********************************************************************************/

/* ---------- 本地儲存 ---------- */
export function loadLocal() {
  try { return JSON.parse(localStorage.getItem(DB_KEY)) ?? { items: [], logs: [] }; }
  catch { return { items: [], logs: [] }; }
}
export function saveLocal(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* ---------- 週次 / 日期工具 ---------- */
export function mondayOf(d = new Date()) {
  const x = new Date(d);
  const w = x.getDay() || 7;
  if (w !== 1) x.setDate(x.getDate() - (w - 1));
  x.setHours(0,0,0,0);
  return x;
}
export const isoDate = (d) => d.toISOString().slice(0, 10);
export function weekLabelFromISO(iso) {
  const s = new Date(iso);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  const pad = n => String(n).padStart(2, '0');
  return `${s.getMonth()+1}/${pad(s.getDate())} ~ ${e.getMonth()+1}/${pad(e.getDate())}`;
}
export function recentWeekStarts(n = 12) {
  const base = mondayOf();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() - i*7);
    return isoDate(d);
  });
}

/* ---------- UI 小工具 ---------- */
export function badgeHTML(a) {
  const done = (a.watched?.length || 0);
  const total = a.episodes || 0;
  const complete = total && done >= total ? ' complete' : '';
  return `<span class="badge${complete}">${done} / ${total}</span>`;
}
export function compressRanges(nums) {
  if (!nums?.length) return [];
  const a = [...new Set(nums)].sort((x, y) => x - y);
  const out = [];
  let s = a[0], p = a[0];
  for (let i = 1; i < a.length; i++) {
    if (a[i] === p + 1) {
      p = a[i];
    } else {
      out.push(s === p ? `${s}` : `${s}~${p}`);
      s = p = a[i];
    }
  }
  out.push(s === p ? `${s}` : `${s}~${p}`);
  return out;
}
export function downloadCSV(filename, rows) {
  const csv = rows.map(r => r.map(v => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ---------- 雲端 API ---------- */
export const cloudEnabled = !!API_URL;

async function doPostAction(obj) {
  const body = { ...obj, token: API_TOKEN };
  const r = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`${obj.action} failed`);
  return r.json();
}

export async function cloudGetAll() {
  const url = `${API_URL}?action=getAll&token=${API_TOKEN}`;
  const r = await fetch(url, { method: 'GET' });
  if (!r.ok) throw new Error('getAll failed');
  return r.json();
}

export async function cloudAddAnime(data) {
  return await doPostAction({ action: 'addAnime', data });
}

export async function cloudDeleteAnime(id) {
  return await doPostAction({ action: 'deleteAnime', id });
}

export async function cloudAddLog(animeId, weekStartISO, eps) {
  return await doPostAction({ action: 'addLog', data: { animeId, weekStartISO, eps } });
}

/* ---------- 主題切換 ---------- */
function setupHeaderThemeToggle() {
  const saved = localStorage.getItem('theme');
  if (saved === 'light') document.documentElement.classList.add('light');

  const btn = document.getElementById('themeToggle');
  if (!btn) return;

  const applyLabel = () => {
    const isLight = document.documentElement.classList.contains('light');
    btn.textContent = isLight ? '深色' : '淺色';
    btn.setAttribute('aria-pressed', String(isLight));
  };
  applyLabel();

  btn.addEventListener('click', () => {
    const isLight = document.documentElement.classList.toggle('light');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    applyLabel();
  });
}

if (typeof window !== 'undefined') {
  window.setupHeader = setupHeaderThemeToggle;
}
document.addEventListener('DOMContentLoaded', () => {
  try { setupHeaderThemeToggle(); } catch (_) {}
});
