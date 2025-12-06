// app.js
const STORAGE_KEY = 'animeDB_v3'; // 使用新 Key 確保環境乾淨

// ===== 基礎資料存取 =====
function loadData() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("讀取失敗", e);
        return [];
    }
}

function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ===== 1. 新增動畫 (Index頁面) =====
function addAnime(e) {
    e.preventDefault(); // 防止表單刷新
    
    // 抓取欄位
    const titleInput = document.getElementById('title');
    const totalInput = document.getElementById('total');
    const imgInput = document.getElementById('imgUrl');

    // 檢查欄位是否存在 (防止報錯)
    if (!titleInput || !totalInput) {
        alert('程式錯誤：找不到輸入框');
        return;
    }

    const title = titleInput.value.trim();
    const total = parseInt(totalInput.value);
    const imgUrl = imgInput.value.trim() || 'https://placehold.co/600x400/1e293b/FFF?text=No+Image';

    if (!title || total <= 0) {
        alert('請輸入有效的標題與集數');
        return;
    }

    const newAnime = {
        id: Date.now(),
        title: title,
        total: total,
        watched: 0,
        image: imgUrl,
        lastUpdated: '尚未觀看' // 新增欄位：紀錄最後更新時間
    };

    const data = loadData();
    data.push(newAnime);
    saveData(data);

    alert(`✨ 成功加入：${title}`);
    window.location.href = 'dashboard.html'; // 跳轉到紀錄頁
}

// ===== 2. 紀錄頁面 (Dashboard) =====
function loadDashboard() {
    const list = document.getElementById('animeGrid');
    if (!list) return;

    const data = loadData();
    list.innerHTML = '';

    if (data.length === 0) {
        list.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">目前清單是空的，請去「新增」頁面加入動畫。</p>';
        return;
    }

    // 依照加入時間排序 (新的在前)
    data.sort((a, b) => b.id - a.id);

    data.forEach(anime => {
        const progress = Math.round((anime.watched / anime.total) * 100);
        
        const card = document.createElement('div');
        card.className = 'glass-card';
        card.innerHTML = `
            <img src="${anime.image}" class="anime-cover" onerror="this.src='https://placehold.co/600x400?text=Error'">
            <h3 style="margin: 0 0 10px 0;">${anime.title}</h3>
            
            <div style="display:flex; justify-content:space-between; font-size:0.9rem; color:var(--text-secondary); margin-bottom: 10px;">
                <span>進度: ${anime.watched} / ${anime.total}</span>
                <span>${progress}%</span>
            </div>

            <div style="background: rgba(255,255,255,0.1); height: 6px; border-radius: 3px; overflow: hidden; margin-bottom: 15px;">
                <div style="background: var(--success-color); width: ${progress}%; height: 100%; transition: width 0.3s;"></div>
            </div>
            
            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 15px;">
                上次更新: ${anime.lastUpdated || '無紀錄'}
            </div>

            <div style="display:flex; gap:10px;">
                <button class="outline" onclick="updateProgress(${anime.id}, -1)">-1</button>
                <button onclick="updateProgress(${anime.id}, 1)">+1 集</button>
            </div>
        `;
        list.appendChild(card);
    });
}

// ===== 3. 更新進度邏輯 =====
function updateProgress(id, amount) {
    const data = loadData();
    const index = data.findIndex(item => item.id === id);
    
    if (index !== -1) {
        let anime = data[index];
        
        // 防止超過範圍
        if (amount > 0 && anime.watched >= anime.total) return;
        if (amount < 0 && anime.watched <= 0) return;

        anime.watched += amount;
        
        // 紀錄更新時間 (簡易版週次紀錄)
        const now = new Date();
        const dateStr = `${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getDate().toString().padStart(2,'0')}`;
        anime.lastUpdated = `${dateStr} (本週)`; // 這裡可以改進為複雜的週次計算

        saveData(data);
        
        // 重新渲染畫面
        if(document.getElementById('animeGrid')) loadDashboard();
        if(document.getElementById('overviewStats')) loadOverview();
    }
}

// ===== 4. 管理頁面 (Manage) =====
function loadManage() {
    const list = document.getElementById('manageList');
    if (!list) return;

    const data = loadData();
    list.innerHTML = '';

    if (data.length === 0) {
        list.innerHTML = '<p style="color: var(--text-secondary);">目前沒有資料。</p>';
        return;
    }

    data.forEach(anime => {
        const item = document.createElement('div');
        item.className = 'glass-card';
        item.style.marginBottom = '15px';
        item.style.padding = '15px'; // 縮小一點 padding
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        
        item.innerHTML = `
            <div style="display:flex; align-items:center; gap:15px;">
                <img src="${anime.image}" style="width:50px; height:50px; object-fit:cover; border-radius:8px;">
                <span style="font-weight:bold;">${anime.title}</span>
            </div>
            <button class="danger" style="width: auto; padding: 8px 16px; margin:0;" onclick="deleteAnime(${anime.id})">刪除</button>
        `;
        list.appendChild(item);
    });
}

function deleteAnime(id) {
    if(!confirm('確定要刪除這部動畫嗎？刪除後無法復原。')) return;
    
    let data = loadData();
    data = data.filter(item => item.id !== id);
    saveData(data);
    loadManage(); // 刷新管理列表
}

// ===== 5. 備份功能 (JSON) =====
function exportToJSON() {
    const data = loadData();
    if (data.length === 0) {
        alert('沒有資料可以備份');
        return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `anime_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ===== 6. 總覽頁面 (Overview) =====
function loadOverview() {
    const container = document.getElementById('overviewStats');
    if (!container) return;

    const data = loadData();
    const totalAnimes = data.length;
    const totalEpisodes = data.reduce((sum, item) => sum + item.total, 0);
    const watchedEpisodes = data.reduce((sum, item) => sum + item.watched, 0);
    const completionRate = totalEpisodes ? Math.round((watchedEpisodes / totalEpisodes) * 100) : 0;

    // 這裡我們直接寫入 HTML，不依賴 span id，避免找不到元素的錯誤
    document.getElementById('valTotal').textContent = totalAnimes;
    document.getElementById('valEp').textContent = totalEpisodes;
    document.getElementById('valWatched').textContent = watchedEpisodes;
    document.getElementById('valRate').textContent = completionRate + '%';
}

// 全域初始化
window.onload = function() {
    loadDashboard();
    loadManage();
    loadOverview();
};
