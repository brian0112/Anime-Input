/*********** CONFIG ***********/
export const API_URL = ''; // 雲端停用
const DB_KEY = 'animeDB_v2_local';
/******************************/

/* 本機資料操作 */
export function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(DB_KEY)) ?? { items: [], logs: [] };
  } catch {
    return { items: [], logs: [] };
  }
}

export function saveLocal(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

/* 產生隨機ID */
export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/* 限制範圍 */
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/* 取得目前週一日期（台北時區） */
export function getCurrentWeekStartISO() {
  const now = new Date();
  const tzOffset = 8 * 60; // +8 小時
  const local = new Date(now.getTime() + tzOffset * 60000);
  const day = local.getDay(); // 0=日
  const diff = (day === 0 ? -6 : 1) - day;
  local.setDate(local.getDate() + diff);
  const iso = local.toISOString().split('T')[0];
  return iso;
}

/* 取得最近 12 週 */
export function getRecentWeeks(n = 12) {
  const arr = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - 7 * i);
    arr.push(getWeekStartISO(d));
  }
  return arr;
}

/* 計算週一 ISO */
export function getWeekStartISO(date) {
  const tzOffset = 8 * 60;
  const local = new Date(date.getTime() + tzOffset * 60000);
  const day = local.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  local.setDate(local.getDate() + diff);
  return local.toISOString().split('T')[0];
}

/* 週次標籤 */
export function weekLabel(iso) {
  const d = new Date(iso);
  const start = new Date(d);
  const end = new Date(d);
  end.setDate(start.getDate() + 6);
  const fmt = (x) =>
    `${String(x.getMonth() + 1).padStart(2, '0')}/${String(x.getDate()).padStart(2, '0')}`;
  return `${fmt(start)} ~ ${fmt(end)}`;
}

/* 匯出本機 JSON */
export function exportBackup() {
  const data = localStorage.getItem(DB_KEY);
  const blob = new Blob([data], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'animeDB_backup.json';
  a.click();
}

/* 匯入本機 JSON */
export function importBackup(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const obj = JSON.parse(e.target.result);
        if (obj.items && obj.logs) {
          saveLocal(obj);
          resolve(true);
        } else reject('檔案格式錯誤');
      } catch {
        reject('解析失敗');
      }
    };
    reader.onerror = () => reject('讀取失敗');
    reader.readAsText(file);
  });
}
