const STORAGE_KEY = 'animeDB_v5'; // 更新 Key

// ... (保留 loadData, saveData, getWeekOptions, addAnime 等函式不變) ...
// 為了節省篇幅，請保留 V4 的 addAnime, getWeekOptions
// 以下是【有修改】或【新增】的部分：

// ===== 基礎資料存取 (同前) =====
function loadData() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) { return []; }
}
function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
// 補回 V4 的 getWeekOptions
function getWeekOptions() {
    const options = [];
    const now = new Date();
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

// ===== 1. 新增動畫 (同 V4) =====
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
        history: [] 
    };
    const data = loadData();
    data.push(newAnime);
    saveData(data);
    alert('新增成功');
    window.location.href = 'dashboard.html';
}

// ===== 2. 紀錄頁面 (修正進度條不顯示的問題) =====
let currentAnimeId = null;

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
        const watched = anime.history.length > 0 
            ? Math.max(...anime.history.map(h => h.end)) 
            : 0;
        // 確保 progress 是有效數字且不超過 100
        let progress = Math.round((watched / anime.total) * 100);
        if (progress > 100) progress = 100;
        if (isNaN(progress)) progress = 0;

        const card = document.createElement('div');
        card.className = 'glass-card';
        card.innerHTML = `
            <img src="${anime.image}" class="anime-cover">
            <h3 style="margin:0 0 10px 0;">${anime.title}</h3>
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; color:var(--text-secondary);">
                <span>進度: ${watched}/${anime.total}</span>
                <span>${progress}%</span>
            </div>
            
            <div style="background:rgba(255,255,255,0.1); height:8px; border-radius:4px; overflow:hidden; margin-bottom:15px; width: 100%;">
                <div style="background:var(--success-color); width:${progress}%; height:100%; transition: width 0.5s ease-out; min-width: ${progress > 0 ? '5px' : '0'};"></div>
            </div>

            <div style="display:flex; gap:10px;">
                <button onclick="openUpdateModal(${anime.id}, ${watched}, ${anime.total})">更新進度</button>
                <button class="outline" onclick="openHistoryModal(${anime.id})">紀錄</button>
            </div>
        `;
        list.appendChild(card);
    });
}

// ... (保留 openUpdateModal, submitUpdate, openHistoryModal, deleteHistory, closeModal 等 V4 函式，這些不需要改) ...
// 為了完整性，請確保這裡有 V4 的那些函式 (如 submitUpdate 邏輯)
// ...

function openUpdateModal(id, currentWatched, total) {
    currentAnimeId = id;
    const modal = document.getElementById('updateModal');
    const weekSelect = document.getElementById('modalWeek');
    weekSelect.innerHTML = '';
    getWeekOptions().forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        if(opt.isCurrent) option.selected = true;
        weekSelect.appendChild(option);
    });
    document.getElementById('modalStart').value = currentWatched + 1;
    document.getElementById('modalEnd').value = currentWatched + 1;
    document.getElementById('modalTotal').textContent = total;
    modal.classList.add('active');
}

function submitUpdate() {
    const start = parseInt(document.getElementById('modalStart').value);
    const end = parseInt(document.getElementById('modalEnd').value);
    const week = document.getElementById('modalWeek').value;
    const maxTotal = parseInt(document.getElementById('modalTotal').textContent);
    
    if (start > end || start < 1 || end > maxTotal) return alert('集數輸入錯誤');

    const data = loadData();
    const anime = data.find(a => a.id === currentAnimeId);
    
    const isOverlap = anime.history.some(h => (start <= h.end && end >= h.start));
    if (isOverlap) return alert('錯誤：集數範圍與過去紀錄重疊！');

    anime.history.push({ id: Date.now(), week, start, end, count: (end - start + 1) });
    saveData(data);
    closeModal('updateModal');
    loadDashboard();
}

// app.js - 找到 openHistoryModal 函式並替換
function openHistoryModal(id) {
    currentAnimeId = id;
    const modal = document.getElementById('updateModal'); // 修正：這裡應該要對應 historyModal，如果你原本代碼是 updateModal 請自行確認，通常是 'historyModal'
    // --- 為了保險起見，請直接用下面這段完整的 historyModal 邏輯 ---
    
    const historyModal = document.getElementById('historyModal');
    const list = document.getElementById('historyList');
    const data = loadData();
    const anime = data.find(a => a.id === id);
    list.innerHTML = '';
    
    const sortedHistory = [...anime.history].sort((a,b) => b.id - a.id);

    if (sortedHistory.length === 0) {
        list.innerHTML = '<p style="color:var(--text-secondary)">尚無紀錄</p>';
    } else {
        sortedHistory.forEach(h => {
            const item = document.createElement('div');
            item.className = 'history-item';
            
            // V6 修改：判斷集數顯示邏輯
            const epDisplay = (h.start === h.end) ? `第 ${h.start} 集` : `第 ${h.start}-${h.end} 集`;

            item.innerHTML = `
                <div>
                    <span style="color:var(--accent-color); margin-right:8px;">${h.week}</span> 
                    <span>${epDisplay}</span>
                </div>
                <button class="danger btn-sm" onclick="deleteHistory(${h.id})">刪除</button>
            `;
            list.appendChild(item);
        });
    }
    historyModal.classList.add('active');
}

function deleteHistory(historyId) {
    if(!confirm('確定刪除此紀錄？')) return;
    const data = loadData();
    const anime = data.find(a => a.id === currentAnimeId);
    anime.history = anime.history.filter(h => h.id !== historyId);
    saveData(data);
    openHistoryModal(currentAnimeId);
    loadDashboard();
}

function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// ===== 3. CSV 導出 (同 V4) =====
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
function generateCSV() {
    const targetWeek = document.getElementById('csvWeekSelect').value;
    const data = loadData();
    let csvContent = "\uFEFF動漫名稱,當週集數,觀看進度(區間),,速度評價\n"; 
    
    let totalEp = 0;
    let hasData = false;
    
    data.forEach(anime => {
        const logs = anime.history.filter(h => h.week === targetWeek);
        if (logs.length > 0) {
            hasData = true;
            const count = logs.reduce((sum, log) => sum + log.count, 0);
            totalEp += count;
            const rangeStr = logs.map(l => l.start === l.end ? l.start : `${l.start}~${l.end}`).join('&');
            csvContent += `${anime.title},${count},"${rangeStr}",,\n`;
        }
    });

    if (!hasData) return alert('該週無資料');
    
    let speedRating = "混沌";
    if (totalEp <= 5) speedRating = "極慢";
    else if (totalEp <= 15) speedRating = "緩慢";
    else if (totalEp <= 30) speedRating = "中等";
    else if (totalEp <= 50) speedRating = "快速";
    else if (totalEp <= 70) speedRating = "極快";
    else if (totalEp <= 100) speedRating = "極限";

    csvContent += `\n總計,${totalEp},,,\n`;
    let rows = csvContent.split("\n");
    if (rows.length > 1) rows[1] += `${speedRating}`;
    csvContent = rows.join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Anime_Report_${targetWeek}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ===== 4. 新增：JSON 備份與還原 (Manage 頁面用) =====
function exportToJSON() {
    const data = loadData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anime_backup_full.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function importFromJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const json = JSON.parse(e.target.result);
            if (Array.isArray(json)) {
                if(confirm('這將覆蓋目前所有資料，確定還原嗎？')) {
                    saveData(json);
                    alert('還原成功！');
                    location.reload();
                }
            } else {
                alert('檔案格式錯誤');
            }
        } catch (err) { alert('無法解析檔案'); }
    };
    reader.readAsText(file);
}

// ===== 5. 管理列表 (同 V4) =====
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
            <button class="danger btn-sm" onclick="deleteAnime(${anime.id})">刪除</button>
        `;
        list.appendChild(item);
    });
}
function deleteAnime(id) {
    if(!confirm('確定刪除？')) return;
    let data = loadData();
    data = data.filter(a => a.id !== id);
    saveData(data);
    loadManage();
}

// ===== 6. 總覽增強版 (Pie Chart + Recent Activity) =====
function loadOverview() {
    // 1. 數據計算
    const data = loadData();
    const totalAnimes = data.length;
    const totalEpisodes = data.reduce((acc, cur) => acc + cur.total, 0);
    const watchedEpisodes = data.reduce((acc, cur) => {
        const animeWatched = cur.history.reduce((hAcc, h) => hAcc + h.count, 0);
        return acc + animeWatched;
    }, 0);
    const rate = totalEpisodes ? Math.round((watchedEpisodes / totalEpisodes) * 100) : 0;

    // 2. 更新文字數據
    if(document.getElementById('valTotal')) {
        document.getElementById('valTotal').textContent = totalAnimes;
        document.getElementById('valEp').textContent = totalEpisodes;
        document.getElementById('valWatched').textContent = watchedEpisodes;
    }

    // 3. 更新甜甜圈圖 (CSS Conic Gradient)
    const pieChart = document.getElementById('pieChart');
    if (pieChart) {
        // 這裡設定 CSS 變數，讓 CSS 去畫圖
        pieChart.style.background = `conic-gradient(var(--brand) 0% ${rate}%, rgba(255,255,255,0.1) ${rate}% 100%)`;
        document.getElementById('pieText').textContent = `${rate}%`;
    }

    // 4. 更新近期活動列表
    // 4. 更新近期活動列表
    const activityList = document.getElementById('activityList');
    if (activityList) {
        activityList.innerHTML = '';
        let allHistory = [];
        data.forEach(anime => {
            anime.history.forEach(h => {
                // V6 修改：判斷集數顯示邏輯
                const epDisplay = (h.start === h.end) ? `看了第 ${h.start} 集` : `看了第 ${h.start}-${h.end} 集`;
                
                allHistory.push({
                    animeTitle: anime.title,
                    week: h.week,
                    desc: epDisplay, // 使用新的變數
                    timestamp: h.id
                });
            });
        });
        
        allHistory.sort((a, b) => b.timestamp - a.timestamp);
        const recent = allHistory.slice(0, 5); // 取最新 5 筆

        if (recent.length === 0) {
            activityList.innerHTML = '<div style="color:var(--text-secondary)">尚無活動</div>';
        } else {
            recent.forEach(act => {
                const row = document.createElement('div');
                row.style.padding = '12px 0';
                row.style.borderBottom = '1px solid var(--glass-border)';
                // 使用 Flex 讓左右對齊更漂亮
                row.style.display = 'flex';
                row.style.justifyContent = 'space-between';
                row.style.alignItems = 'center';
                
                row.innerHTML = `
                    <div>
                        <div style="font-weight:bold; margin-bottom:4px;">${act.animeTitle}</div>
                        <div style="font-size:0.85rem; color:var(--text-secondary);">${act.desc}</div>
                    </div>
                    <div style="font-size:0.85rem; color:var(--text-secondary); text-align:right;">
                        ${act.week}
                    </div>
                `;
                activityList.appendChild(row);
            });
        }
    }

window.onload = function() {
    loadDashboard();
    loadManage();
    loadOverview();
    initCSVSelect();
};
