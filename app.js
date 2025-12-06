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


// ===== Add New Anime (修復並升級) =====
function addAnime(event) {
  event.preventDefault();

  const title = document.getElementById('title').value.trim();
  const imageUrl = document.getElementById('imageUrl').value.trim(); // 新增圖片
  const total = parseInt(document.getElementById('total').value);
  const rating = document.getElementById('rating').value;

  if (!title || total <= 0) {
    alert('請輸入正確資料');
    return;
  }

  const newAnime = {
    id: Date.now(), // 給每個動畫一個唯一 ID
    title: title,
    image: imageUrl || 'https://placehold.co/600x400?text=No+Image', // 預設圖
    total: total,
    watched: 0, // 預設觀看進度為 0
    rating: rating
  };

  const data = loadLocalData();
  data.push(newAnime);
  saveLocalData(data);

  alert('新增成功！');
  window.location.href = 'dashboard.html'; // 新增完跳轉到紀錄頁
}

// ===== Load Dashboard (渲染卡片的核心) =====
function loadDashboard() {
  const data = loadLocalData();
  const container = document.getElementById('animeList');
  
  if (!container) return; // 防止在非 dashboard 頁面報錯

  container.innerHTML = ''; // 清空目前內容

  if (data.length === 0) {
    container.innerHTML = '<p class="muted">目前沒有資料，去新增幾部吧！</p>';
    return;
  }

  // 遍歷資料，產生卡片 HTML
  data.forEach(anime => {
    // 計算進度百分比
    const progress = Math.round((anime.watched / anime.total) * 100);
    
    const card = document.createElement('div');
    card.className = 'card'; // 使用你的 CSS class
    card.innerHTML = `
      <div style="height: 200px; overflow: hidden; border-radius: 0.5rem; margin-bottom: 1rem;">
        <img src="${anime.image}" style="width: 100%; height: 100%; object-fit: cover;" alt="${anime.title}">
      </div>
      <h3 style="margin: 0 0 0.5rem 0;">${anime.title}</h3>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
        <span class="badge">${anime.rating} 級</span>
        <span class="muted">${anime.watched} / ${anime.total} 集</span>
      </div>
      
      <div style="background: #333; height: 6px; border-radius: 3px; overflow: hidden;">
        <div style="background: var(--brand); width: ${progress}%; height: 100%;"></div>
      </div>
      
      <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
        <button class="btn outline" style="flex: 1" onclick="updateProgress(${anime.id}, 1)">+1集</button>
      </div>
    `;
    container.appendChild(card);
  });
}

// ===== Update Progress (讓按鈕能運作) =====
function updateProgress(id, change) {
  const data = loadLocalData();
  const index = data.findIndex(item => item.id === id);
  
  if (index !== -1) {
    let anime = data[index];
    anime.watched += change;
    
    // 限制範圍
    if (anime.watched > anime.total) anime.watched = anime.total;
    if (anime.watched < 0) anime.watched = 0;
    
    saveLocalData(data);
    loadDashboard(); // 重新整理畫面
  }
}
