/* app.js - V6.1 完整版 */
const STORAGE_KEY = 'animeDB_v6_1'; // 更新Key以確保環境乾淨

// ===== 基礎資料存取 =====
function loadData() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("資料讀取失敗", e);
        return [];
    }
}

function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ===== 工具：週次計算 =====
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

// ===== 1. 新增動畫 =====
function addAnime(e) {
    e.preventDefault();
    
    // 確保這裡的 ID 與 index.html 對應
    const titleEl = document.getElementById('title');
    const totalEl = document.getElementById('total');
    const imgUrlEl = document.getElementById('imgUrl');

    if (!titleEl || !totalEl) {
        alert('程式錯誤：找不到輸入框');
        return;
    }

    const title = titleEl.value.trim();
    const total = parseInt(totalEl.value);
    const imgUrl = imgUrlEl.value.trim();

    if (!title || total <= 0) {
        alert('請輸入有效的標題與集數');
        return;
    }

    const newAnime = {
        id: Date.now(),
        title: title,
        total: total,
        image: imgUrl || 'https://placehold.co/600x400/1e293b/FFF?text=No+Image',
        history: [] 
    };

    const data = loadData();
    data.push(newAnime);
    saveData(data);

    alert(`✨ 成功加入：${title}`);
    window.location.href = 'dashboard.html';
}

// ===== 2. 紀錄頁面 (Dashboard) =====
let currentAnimeId = null;

function loadDashboard() {
    const list = document.getElementById('animeGrid');
    if (!list) return;

    const data = loadData();
    list.innerHTML = '';

    if (data.length === 0) {
        list.innerHTML = '<p style="text-align:center; grid-column:1/-1; opacity:0.6;">目前沒有動畫，去新增一部吧！</p>';
        return;
    }

    // 新增的動畫排在前面
    data.sort((a, b) => b.id - a.id);

    data.forEach(anime => {
        // 計算觀看進度 (取歷史中最大的集數)
        const watched = anime.history.length > 0 
            ? Math.max(...anime.history.map(h => h.end)) 
            : 0;
        
        let progress = Math.round((watched / anime.total) * 100);
        if (progress > 100) progress = 100;
        
        const card = document.createElement('div');
        card.className = 'glass-card';
        card.innerHTML = `
            <img src="${anime.image}" class="anime-cover" onerror="this.src='https://placehold.co/600x400?text=Error'">
            <h3 style="margin:0 0 10px 0;">${anime.title}</h3>
            
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; color:var(--text-secondary); font-size:0.9rem;">
                <span>進度: ${watched}/${anime.total}</span>
                <span>${progress}%</span>
            </div>
            
            <div style="background:rgba(255,255,255,0.1); height:8px; border-radius:4px; overflow:hidden; margin-bottom:15px; width:100%;">
                <div style="background:var(--success-color); width:${progress}%; height:100%; transition:width 0.5s ease; min-width:${progress > 0 ? '5px' : '0'};"></div>
            </div>

            <div style="display:flex; gap:10px;">
                <button onclick="openUpdateModal(${anime.id}, ${watched}, ${anime.total})">更新進度</button>
                <button class="outline" onclick="openHistoryModal(${anime.id})">紀錄</button>
            </div>
        `;
        list.appendChild(card);
    });
}

// --- 更新進度 Modal ---
function openUpdateModal(id, currentWatched, total) {
    currentAnimeId = id;
    const modal = document.getElementById('updateModal');
    const weekSelect = document.getElementById('modalWeek');
    
    // 填入週次
    weekSelect.innerHTML = '';
    getWeekOptions().forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        if(opt.isCurrent) option.selected = true;
        weekSelect.appendChild(option);
    });

    // 預設填入下一集
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
    
    if (isNaN(start) || isNaN(end)) return alert('請輸入數字');
    if (start > end) return alert('開始集數不能大於結束集數');
    if (start < 1) return alert('集數必須大於 0');
    if (end > maxTotal) return alert(`超過總集數 (${maxTotal})`);

    const data = loadData();
    const anime = data.find(a => a.id === currentAnimeId);
    
    // 檢查重疊
    const isOverlap = anime.history.some(h => (start <= h.end && end >= h.start));
    if (isOverlap) return alert('錯誤：輸入的集數範圍與過去紀錄重疊！');

    anime.history.push({ 
        id: Date.now(), 
        week: week, 
        start: start, 
        end: end, 
        count: (end - start + 1) 
    });

    saveData(data);
    closeModal('updateModal');
    loadDashboard();
}

// --- 歷史紀錄 Modal ---
function openHistoryModal(id) {
    currentAnimeId = id;
    const modal = document.getElementById('historyModal');
    const list = document.getElementById('historyList');
    const data = loadData();
    const anime = data.find(a => a.id === id);

    list.innerHTML = '';
    const sortedHistory = [...anime.history].sort((a,b) => b.id - a.id);

    if (sortedHistory.length === 0) {
        list.innerHTML = '<p style="color:var(--text-secondary); text-align:center;">尚無紀錄</p>';
    } else {
        sortedHistory.forEach(h => {
            const item = document.createElement('div');
            item.className = 'history-item';
            
            // V6.1 修正：判斷是否為單集
            const epText = (h.start === h.end) ? `第 ${h.start} 集` : `第 ${h.start}-${h.end} 集`;

            item.innerHTML = `
                <div>
                    <span style="color:var(--accent-color); font-size:0.9rem; margin-right:8px;">${h.week}</span>
                    <span>${epText}</span>
                </div>
                <button class="danger btn-sm" onclick="deleteHistory(${h.id})">刪除</button>
            `;
            list.appendChild(item);
        });
    }
    modal.classList.add('active');
}

function deleteHistory(historyId) {
    if(!confirm('確定要刪除這筆紀錄嗎？')) return;
    const data = loadData();
    const anime = data.find(a => a.id === currentAnimeId);
    anime.history = anime.history.filter(h => h.id !== historyId);
    
    saveData(data);
    openHistoryModal(currentAnimeId); // 刷新列表
    loadDashboard(); // 刷新背景進度
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// ===== 3. 管理頁面 (Manage) =====
function loadManage() {
    const list = document.getElementById('manageList');
    if (!list) return;

    const data = loadData();
    list.innerHTML = '';

    data.forEach(anime => {
        const item = document.createElement('div');
        item.className = 'glass-card';
        item.style.marginBottom = '15px';
        item.style.padding = '15px 20px';
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        
        item.innerHTML = `
            <div style="font-weight:500;">${anime.title}</div>
            <button class="danger btn-sm" onclick="deleteAnime(${anime.id})">刪除</button>
        `;
        list.appendChild(item);
    });
}

function deleteAnime(id) {
    if(!confirm('確定刪除？這將移除所有觀看紀錄。')) return;
    let data = loadData();
    data = data.filter(a => a.id !== id);
    saveData(data);
    loadManage();
}

// 備份功能
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
    URL.revokeObjectURL(url);
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
            } else { alert('檔案格式錯誤'); }
        } catch (err) { alert('無法解析檔案'); }
    };
    reader.readAsText(file);
}

// CSV 生成
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
            
            // V6.1 修正：CSV 也套用單集顯示邏輯
            const rangeStr = logs.map(l => l.start === l.end ? `${l.start}` : `${l.start}~${l.end}`).join(' & ');
            
            csvContent += `${anime.title},${count},"${rangeStr}",,\n`;
        }
    });

    if (!hasData) return alert(`週次 ${targetWeek} 無資料`);

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

// ===== V7.0 熱力圖渲染邏輯 =====
function renderHeatmap() {
    const container = document.getElementById('heatmap');
    if (!container) return;

    container.innerHTML = '';
    const data = loadData();
    
    // 1. 建立「週次索引」 (Week Map)
    // 格式: { "12/01~12/07": 15, "12/08~12/14": 5 }
    const weekCounts = {};
    
    data.forEach(anime => {
        anime.history.forEach(h => {
            // h.week 已經是 "MM/DD~MM/DD" 的格式，直接當 key 用
            if (!weekCounts[h.week]) weekCounts[h.week] = 0;
            weekCounts[h.week] += h.count;
        });
    });

    // 2. 生成過去 52 週的格子
    const now = new Date();
    // 找到本週的週一 (定位錨點)
    const day = now.getDay();
    const diff = now.getDate() - day + (day == 0 ? -6 : 1); 
    const currentMonday = new Date(now.setDate(diff));

    // 迴圈 52 次 (一年)
    // 為了讓舊的在左邊，新的在右邊，我們用陣列存起來再反轉，或是直接從 -51 數到 0
    for (let i = 51; i >= 0; i--) {
        // 計算該週的週一與週日
        let tempMon = new Date(currentMonday);
        tempMon.setDate(currentMonday.getDate() - (i * 7));
        
        let tempSun = new Date(tempMon);
        tempSun.setDate(tempMon.getDate() + 6);

        // 格式化成與資料庫一致的字串 "MM/DD~MM/DD"
        const fmt = d => `${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')}`;
        const weekStr = `${fmt(tempMon)}~${fmt(tempSun)}`;
        
        const count = weekCounts[weekStr] || 0;

        // 3. 決定顏色等級 (根據週觀看量調整標準)
        let level = 'level-0';
        if (count > 0) level = 'level-1';
        if (count > 5) level = 'level-2';  // 一週看 5 集以上
        if (count > 12) level = 'level-3'; // 一週看 12 集以上
        if (count > 20) level = 'level-4'; // 一週看 20 集以上 (狂熱)

        // 4. 建立 HTML
        const square = document.createElement('div');
        square.className = `day-square ${level}`;
        
        // Tooltip 顯示週次與集數
        square.title = `${weekStr}: 共 ${count} 集`;
        
        container.appendChild(square);
    }
}
// ===== 4. 總覽頁面 (Overview) =====
function loadOverview() {
    const data = loadData();
    const totalAnimes = data.length;
    const totalEpisodes = data.reduce((acc, cur) => acc + cur.total, 0);
    const watchedEpisodes = data.reduce((acc, cur) => {
        return acc + cur.history.reduce((hAcc, h) => hAcc + h.count, 0);
    }, 0);
    const rate = totalEpisodes ? Math.round((watchedEpisodes / totalEpisodes) * 100) : 0;

    // 更新數據卡片
    if(document.getElementById('valTotal')) {
        document.getElementById('valTotal').textContent = totalAnimes;
        document.getElementById('valEp').textContent = totalEpisodes;
        document.getElementById('valWatched').textContent = watchedEpisodes;
    }

    // 更新圓餅圖
    const pieChart = document.getElementById('pieChart');
    if (pieChart) {
        pieChart.style.background = `conic-gradient(var(--brand) 0% ${rate}%, rgba(255,255,255,0.1) ${rate}% 100%)`;
        const pieText = document.getElementById('pieText');
        if(pieText) pieText.textContent = `${rate}%`;
    }

    // 更新近期活動
    const activityList = document.getElementById('activityList');
    if (activityList) {
        activityList.innerHTML = '';
        let allHistory = [];
        data.forEach(anime => {
            anime.history.forEach(h => {
                // V6.1 修正：活動日誌的單集顯示
                const epDisplay = (h.start === h.end) ? `看了第 ${h.start} 集` : `看了第 ${h.start}-${h.end} 集`;
                
                allHistory.push({
                    animeTitle: anime.title,
                    week: h.week,
                    desc: epDisplay,
                    timestamp: h.id
                });
            });
        });
        
        allHistory.sort((a, b) => b.timestamp - a.timestamp);
        const recent = allHistory.slice(0, 5);

        if (recent.length === 0) {
            activityList.innerHTML = '<div style="color:var(--text-secondary); text-align:center;">尚無活動</div>';
        } else {
            recent.forEach(act => {
                const row = document.createElement('div');
                row.style.padding = '12px 0';
                row.style.borderBottom = '1px solid var(--glass-border)';
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
    renderHeatmap(); 
}

// ===== 初始化 =====
window.onload = function() {
    loadDashboard();
    loadManage();
    loadOverview();
    initCSVSelect();
};
