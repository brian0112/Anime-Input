// ===== Local Storage Keys =====
const STORAGE_KEY = 'animeDB_local';


// ===== Load Local Data =====
function loadLocalData() {
const data = localStorage.getItem(STORAGE_KEY);
return data ? JSON.parse(data) : [];
}


// ===== Save Data =====
function saveLocalData(data) {
localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}


// ===== Export JSON Backup =====
function exportToJSON() {
const data = loadLocalData();
const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);


const a = document.createElement('a');
a.href = url;
a.download = 'animeDB_backup.json';
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
}


// ===== Import JSON Backup =====
function importFromJSON(event) {
const file = event.target.files[0];
if (!file) return;


const reader = new FileReader();
reader.onload = (e) => {
try {
const importedData = JSON.parse(e.target.result);
if (Array.isArray(importedData)) {
saveLocalData(importedData);
alert('匯入完成! 資料已覆蓋本機資料庫');
location.reload();
} else {
alert('匯入失敗：格式錯誤');
}
} catch (err) {
alert('匯入失敗：無法解析 JSON');
}
};
reader.readAsText(file);
}


// ===== Add New Anime =====
function addAnime(event) {
event.preventDefault();


const title = document.getElementById('title').value.trim();
const total = parseInt(document.getElementById('total').value);
const rating = document.getElementById('rating').value;


if (!title || total <= 0) {
alert('請輸入正確資料');
return;
}


}
