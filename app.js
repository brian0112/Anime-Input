const STORAGE_KEY = 'animeDB_v4'; // 更新 Key

// ===== 基礎資料存取 =====
function loadData() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) { return []; }
}

function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ===== 工具：產生週次選單資料 =====
function getWeekOptions() {
    const options = [];
    const now = new Date();
    // 取得本週一 (UTC+8 簡易處理)
    const day = now.getDay();
    const diff = now.getDate() - day + (day == 0 ? -6 : 1); 
    const monday = new Date(now.setDate(diff));

    for (let i = -4; i <= 1; i++) {
        let tempMon = new Date(monday);
        tempMon.setDate(monday.getDate() + (i * 7));
        let tempSun = new Date(tempMon);
        tempSun.setDate(tempMon.getDate() + 6);
        
        const fmt = d => `${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')}`;
        const val = `${fmt(tempMon)}~${fmt(tempSun)}`;
        options.push({ value: val, label: i === 0 ? `${val} (本週)` : val, isCurrent: i === 0 });
    }
    return options;
}

// ===== 1. 新增動畫 (Index) =====
function addAnime(e) {
    e.preventDefault();
    const title = document.getElementById('title').value.trim();
    const total = parseInt(document.getElementById('total').value);
    const imgUrl = document.getElementById('imgUrl').value.trim();

    if (!title || total <= 0) return alert('請輸入正確資料');

    const newAnime = {
        id: Date.now(),
        title,
        total,
        image: imgUrl || 'https://placehold.co/600x400/1e293b/FFF?text=No+Image',
        history: [] // 改用 history 陣列來儲存進度
    };

    const data = loadData();
    data.push(newAnime);
    saveData(data);
    alert('新增成功');
    window.location.href = 'dashboard.html';
}

// ===== 2. 紀錄頁面 (Dashboard) =====
let currentAnimeId = null; // 暫存目前正在編輯的動畫 ID

function loadDashboard() {
    const list = document.getElementById('animeGrid');
    if (!list) return;
    const data = loadData();
    list.innerHTML = '';

    if (data.length === 0) {
        list.innerHTML = '<p style="text-align:center; grid-column:1/-1;">目前無資料</p>';
        return;
    }

    data.forEach(anime => {
        // 計算目前的觀看進度 (取歷史紀錄中最大的集數)
        const watched = anime.history.length > 0 
            ? Math.max(...anime.history.map(h => h.end)) 
            : 0;
        const progress = Math.round((watched / anime.total) * 100);

        const card = document.createElement('div');
        card.className = 'glass-card';
        card.innerHTML = `
            <img src="${anime.image}" class="anime-cover">
            <h3 style="margin:0 0 10px 0;">${anime.title}</h3>
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; color:var(--text-secondary);">
                <span>進度: ${watched}/${anime.total}</span>
                <span>${progress}%</span>
            </div>
            <div style="background:rgba(255,255,255,0.1); height:6px; border-radius:3px; overflow:hidden; margin-bottom:15px;">
                <div style="background:var(--success-color); width:${progress}%;"></div>
            </div>
            <div style="display:flex; gap:10px;">
                <button onclick="openUpdateModal(${anime.id}, ${watched}, ${anime.total})">更新進度</button>
                <button class="outline" onclick="openHistoryModal(${anime.id})">紀錄</button>
            </div>
        `;
        list.appendChild(card);
    });
}

// --- 彈窗邏輯：開啟更新視窗 ---
function openUpdateModal(id, currentWatched, total) {
    currentAnimeId = id;
    const modal = document.getElementById('updateModal');
    const weekSelect = document.getElementById('modalWeek');
    
    // 1. 填入週次選項
    weekSelect.innerHTML = '';
    getWeekOptions().forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        if(opt.isCurrent) option.selected = true;
        weekSelect.appendChild(option);
    });

    // 2. 預設集數 (自動帶入下一集)
    document.getElementById('modalStart').value = currentWatched + 1;
    document.getElementById('modalEnd').value = currentWatched + 1;
    document.getElementById('modalTotal').textContent = total; // 隱藏欄位供驗證用

    modal.classList.add('active');
}

// --- 彈窗邏輯：提交更新 ---
function submitUpdate() {
    const start = parseInt(document.getElementById('modalStart').value);
    const end = parseInt(document.getElementById('modalEnd').value);
    const week = document.getElementById('modalWeek').value;
    const maxTotal = parseInt(document.getElementById('modalTotal').textContent);

    // 驗證 1: 數字邏輯
    if (start > end) return alert('開始集數不能大於結束集數');
    if (start < 1) return alert('集數必須大於 0');
    if (end > maxTotal) return alert(`超過總集數 (${maxTotal})`);

    const data = loadData();
    const anime = data.find(a => a.id === currentAnimeId);

    // 驗證 2: 防呆 (是否重複)
    // 檢查歷史紀錄中，是否有任何區間跟現在輸入的 [start, end] 重疊
    const isOverlap = anime.history.some(h => {
        return (start <= h.end && end >= h.start); 
    });

    if (isOverlap) {
        return alert('❌ 錯誤：輸入的集數範圍與過去紀錄重疊！請檢查是否重複輸入。');
    }

    // 寫入紀錄
    anime.history.push({
        id: Date.now(), // 紀錄 ID
        week: week,
        start: start,
        end: end,
        count: (end - start + 1)
    });

    saveData(data);
    closeModal('updateModal');
    loadDashboard();
    alert('✅ 進度已更新');
}

// --- 彈窗邏輯：歷史紀錄與修正 ---
function openHistoryModal(id) {
    currentAnimeId = id;
    const modal = document.getElementById('historyModal');
    const list = document.getElementById('historyList');
    const data = loadData();
    const anime = data.find(a => a.id === id);

    list.innerHTML = '';
    if (anime.history.length === 0) {
        list.innerHTML = '<p style="color:var(--text-secondary)">尚無觀看紀錄</p>';
    } else {
        // 依日期倒序
        anime.history.sort((a,b) => b.id - a.id).forEach(h => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <div>
                    <div style="color:var(--accent-color)">${h.week}</div>
                    <div>第 ${h.start} - ${h.end} 集 (共 ${h.count} 集)</div>
                </div>
                <button class="danger" style="width:auto; padding:5px 10px; font-size:0.8rem;" onclick="deleteHistory(${h.id})">刪除</button>
            `;
            list.appendChild(item);
        });
    }
    modal.classList.add('active');
}

function deleteHistory(historyId) {
    if(!confirm('確定要刪除這筆紀錄嗎？進度將會回溯。')) return;
    
    const data = loadData();
    const anime = data.find(a => a.id === currentAnimeId);
    anime.history = anime.history.filter(h => h.id !== historyId);
    
    saveData(data);
    openHistoryModal(currentAnimeId); // 重新整理列表
    loadDashboard(); // 重新整理背景
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// ===== 3. CSV 試算表生成 (管理頁面) =====
function generateCSV() {
    const targetWeek = document.getElementById('csvWeekSelect').value;
    const data = loadData();
    
    // 標題列 (A-1 ~ E-1)
    // CSV 格式: "A欄,B欄,C欄,D欄(空),E欄"
    let csvContent = "\uFEFF"; // BOM for Excel Chinese support
    csvContent += "動漫名稱,當週集數,觀看進度(區間),,速度評價\n"; // Row 1

    let totalEpisodesThisWeek = 0;
    let hasData = false;
    let speedRating = "";

    // 資料列 (Row 2 ~ n)
    data.forEach((anime, index) => {
        // 篩選出這部動畫在「目標週次」的所有紀錄
        const logs = anime.history.filter(h => h.week === targetWeek);
        
        if (logs.length > 0) {
            hasData = true;
            // 加總這週看的總集數
            const count = logs.reduce((sum, log) => sum + log.count, 0);
            totalEpisodesThisWeek += count;

            // 整理進度字串 (例如 "1~2, 5~5")
            const rangeStr = logs.map(log => 
                log.start === log.end ? `${log.start}` : `${log.start}~${log.end}`
            ).join(' & ');

            // 處理 E-2: 速度評價 (只在第一筆資料顯示，或依照邏輯填在 E-2)
            // 這裡我們先留空，最後再處理評價
            let ratingCell = ""; 

            csvContent += `${anime.title},${count},"${rangeStr}",,\n`;
        }
    });

    if (!hasData) {
        alert(`週次 ${targetWeek} 沒有任何觀看紀錄，無法生成報表。`);
        return;
    }

    // 計算速度評價 (Row n+2, Column B 總和)
    if (totalEpisodesThisWeek >= 0 && totalEpisodesThisWeek <= 5) speedRating = "極慢";
    else if (totalEpisodesThisWeek <= 15) speedRating = "緩慢";
    else if (totalEpisodesThisWeek <= 30) speedRating = "中等";
    else if (totalEpisodesThisWeek <= 50) speedRating = "快速";
    else if (totalEpisodesThisWeek <= 70) speedRating = "極快";
    else if (totalEpisodesThisWeek <= 100) speedRating = "極限";
    else speedRating = "混沌";

    // 插入總計列 (Row n+2)
    csvContent += `\n總計,${totalEpisodesThisWeek},,,\n`;

    // 為了符合你的 E-2 要求，我們其實比較難在寫入 Row 2 時就知道總數。
    // 但 CSV 是純文字，我們可以用取代的方式，或者簡單點：
    // 把評價放在最後一行，或者修改 Row 2。
    // 這裡我使用一個小技巧：將評價放在 Row 2 的 E 欄 (index=0 的那一列)
    // 但因為我們是逐行寫入，最簡單的方式是重新組合字串，或是將評價放在 Header 下方。
    
    // 為了精確符合你的需求 (E-2 填入評價):
    // 我們將 csvContent 拆成陣列處理
    let rows = csvContent.split("\n");
    // rows[0] 是標題, rows[1] 是第一筆資料 (如果有的話)
    if (rows.length > 2) { // 確保有資料
        // 在第二行 (Index 1) 的尾端加上評價
        // 原本: Anime, Count, Range,,
        // 變為: Anime, Count, Range,,評價
        rows[1] += `${speedRating}`; 
    }
    csvContent = rows.join("\n");

    // 下載檔案
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Anime_Report_${targetWeek.replace(/[\/~]/g, '')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 初始化 CSV 選單
function initCSVSelect() {
    const select = document.getElementById('csvWeekSelect');
    if (!select) return;
    select.innerHTML = '';
    getWeekOptions().forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        if(opt.isCurrent) option.selected = true;
        select.appendChild(option);
    });
}

// ===== 4. 管理頁面列表 (Manage) =====
// 與 V3 類似，只需確保刪除時連同 history 一起刪除 (已在 deleteAnime 處理)
function loadManage() {
    const list = document.getElementById('manageList');
    if (!list) return;
    const data = loadData();
    list.innerHTML = '';
    data.forEach(anime => {
        const item = document.createElement('div');
        item.className = 'glass-card';
        item.style.marginBottom = '15px';
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.innerHTML = `
            <div>${anime.title}</div>
            <button class="danger" style="width:auto; margin:0;" onclick="deleteAnime(${anime.id})">刪除</button>
        `;
        list.appendChild(item);
    });
}
function deleteAnime(id) {
    if(!confirm('刪除後無法復原，確定？')) return;
    let data = loadData();
    data = data.filter(a => a.id !== id);
    saveData(data);
    loadManage();
}
// ===== 5. 總覽 (Overview) =====
function loadOverview() {
    const container = document.getElementById('overviewStats');
    if (!container) return;
    const data = loadData();
    const totalAnimes = data.length;
    const totalEpisodes = data.reduce((acc, cur) => acc + cur.total, 0);
    // 觀看總數要從 history 計算
    const watchedEpisodes = data.reduce((acc, cur) => {
        // 加總每個 history 的 count
        const animeWatched = cur.history.reduce((hAcc, h) => hAcc + h.count, 0);
        return acc + animeWatched;
    }, 0);
    const rate = totalEpisodes ? Math.round((watchedEpisodes / totalEpisodes) * 100) : 0;

    document.getElementById('valTotal').textContent = totalAnimes;
    document.getElementById('valEp').textContent = totalEpisodes;
    document.getElementById('valWatched').textContent = watchedEpisodes;
    document.getElementById('valRate').textContent = rate + '%';
}

window.onload = function() {
    loadDashboard();
    loadManage();
    loadOverview();
    initCSVSelect();
};
