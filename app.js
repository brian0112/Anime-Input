const STORAGE_KEY = 'animeDB_v2'; // 更新 Key 避免與舊資料衝突

// ===== 1. 資料存取邏輯 =====
function loadData() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ===== 2. 日期與週次處理邏輯 (UTC+8 台北時間) =====
function getWeekRange(offsetWeeks) {
    const now = new Date();
    // 取得當前是星期幾 (0=週日, 1=週一... 6=週六)
    const dayOfWeek = now.getDay(); 
    // 計算距離本週一差幾天 (如果今天是週日0，則當作7來算，確保週一為起點)
    const distToMonday = (dayOfWeek === 0 ? 7 : dayOfWeek) - 1;
    
    // 設定為本週一
    const monday = new Date(now);
    monday.setDate(now.getDate() - distToMonday + (offsetWeeks * 7));
    
    // 設定為該週的週日
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    // 格式化日期 MM/DD
    const fmt = (d) => `${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
    
    return `${fmt(monday)}~${fmt(sunday)}`;
}

// 初始化週次選單 (給 Index.html 用)
function initWeekSelector() {
    const select = document.getElementById('weekSelect');
    if (!select) return;

    select.innerHTML = '';
    // 產生 -4週 到 +1週 (共6個選項)
    for (let i = -4; i <= 1; i++) {
        const range = getWeekRange(i);
        const option = document.createElement('option');
        option.value = range;
        option.textContent = (i === 0) ? `${range} (本週)` : range;
        if (i === 0) option.selected = true; // 預設選中本週
        select.appendChild(option);
    }
}

// ===== 3. 新增動畫 =====
function addAnime(e) {
    e.preventDefault();
    
    const title = document.getElementById('title').value;
    const week = document.getElementById('weekSelect').value;
    const total = parseInt(document.getElementById('total').value);
    const imgUrl = document.getElementById('imgUrl').value || 'https://placehold.co/600x400/1e293b/FFF?text=No+Image';

    const newAnime = {
        id: Date.now(),
        title,
        week, // 儲存週次字串
        total,
        watched: 0,
        image: imgUrl
    };

    const data = loadData();
    data.push(newAnime);
    saveData(data);

    alert('✨ 動畫新增成功！');
    window.location.href = 'dashboard.html';
}

// ===== 4. 儀表板 (Dashboard) 渲染 =====
function loadDashboard() {
    const list = document.getElementById('animeGrid');
    if (!list) return;

    const data = loadData();
    list.innerHTML = '';

    if (data.length === 0) {
        list.innerHTML = '<p style="text-align:center; grid-column: 1/-1; opacity: 0.6;">目前沒有動畫，去新增一部吧！</p>';
        return;
    }

    // 根據週次排序 (可選)
    data.sort((a, b) => b.id - a.id); // 新的在前面

    data.forEach(anime => {
        const progress = Math.round((anime.watched / anime.total) * 100);
        
        const card = document.createElement('div');
        card.className = 'glass-card';
        card.innerHTML = `
            <img src="${anime.image}" class="anime-cover" onerror="this.src='https://placehold.co/600x400?text=Error'">
            <span class="badge">📅 ${anime.week}</span>
            <h3 style="margin: 5px 0 10px 0;">${anime.title}</h3>
            
            <div style="display:flex; justify-content:space-between; font-size:0.9rem; color:var(--text-secondary);">
                <span>進度: ${anime.watched}/${anime.total}</span>
                <span>${progress}%</span>
            </div>
            
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${progress}%"></div>
            </div>

            <div style="display:flex; gap:10px; margin-top:15px;">
                <button class="outline" onclick="updateProgress(${anime.id}, -1)">-1</button>
                <button onclick="updateProgress(${anime.id}, 1)">+1 集</button>
            </div>
        `;
        list.appendChild(card);
    });
}

// ===== 5. 更新進度 =====
function updateProgress(id, amount) {
    const data = loadData();
    const index = data.findIndex(item => item.id === id);
    if (index !== -1) {
        let anime = data[index];
        anime.watched += amount;
        if (anime.watched < 0) anime.watched = 0;
        if (anime.watched > anime.total) anime.watched = anime.total;
        
        saveData(data);
        
        // 判斷當前頁面重新渲染
        if(document.getElementById('animeGrid')) loadDashboard();
        if(document.getElementById('manageList')) loadManage();
    }
}

// ===== 6. 管理頁面 (Manage) 渲染 =====
function loadManage() {
    const list = document.getElementById('manageList');
    if (!list) return;

    const data = loadData();
    list.innerHTML = '';

    data.forEach(anime => {
        const item = document.createElement('div');
        item.className = 'glass-card';
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.marginBottom = '15px';
        
        item.innerHTML = `
            <div style="display:flex; align-items:center; gap:15px;">
                <img src="${anime.image}" style="width:60px; height:60px; object-fit:cover; border-radius:8px;">
                <div>
                    <div style="font-weight:bold; font-size:1.1rem;">${anime.title}</div>
                    <div style="color:var(--text-secondary); font-size:0.9rem;">${anime.week}</div>
                </div>
            </div>
            <button class="danger" style="width:auto; padding:8px 16px;" onclick="deleteAnime(${anime.id})">刪除</button>
        `;
        list.appendChild(item);
    });
}

// ===== 7. 刪除功能 =====
function deleteAnime(id) {
    if(!confirm('確定要刪除這部動畫嗎？')) return;
    
    let data = loadData();
    data = data.filter(item => item.id !== id);
    saveData(data);
    loadManage(); // 重新整理管理列表
    loadOverview(); // 重新整理總覽(如果有的話)
}

// ===== 8. 總覽頁面 (Overview) =====
function loadOverview() {
    const data = loadData();
    
    const totalAnimes = data.length;
    const totalEpisodes = data.reduce((sum, item) => sum + item.total, 0);
    const watchedEpisodes = data.reduce((sum, item) => sum + item.watched, 0);
    const completionRate = totalEpisodes ? Math.round((watchedEpisodes / totalEpisodes) * 100) : 0;

    // 更新 DOM
    const update = (id, val) => {
        if(document.getElementById(id)) document.getElementById(id).textContent = val;
    };

    update('statTotal', totalAnimes);
    update('statEpisodes', totalEpisodes);
    update('statWatched', watchedEpisodes);
    update('statRate', completionRate + '%');
}

// ===== 頁面初始化判定 =====
window.onload = function() {
    initWeekSelector(); // 嘗試初始化週次選單
    loadDashboard();    // 嘗試載入卡片
    loadManage();       // 嘗試載入管理列表
    loadOverview();     // 嘗試載入統計
};
