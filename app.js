/* app.js - V10.0 完整版 (Cloud + API Search) */
const STORAGE_KEY = 'animeDB_v10'; // 本機備用 Key

// ===== 核心：資料讀取 (包含白畫面修復) =====
async function loadData() {
    // 1. 如果已登入，優先讀取雲端
    if (window.currentUser && window.firebaseDB) {
        const { ref, get, child } = window.firebaseModule; 
        const dbRef = ref(window.firebaseDB);
        
        try {
            const snapshot = await get(child(dbRef, `users/${window.currentUser.uid}/animes`));
            if (snapshot.exists()) {
                let data = snapshot.val();
                
                // 【修復】Firebase 回傳物件轉陣列
                if (!Array.isArray(data)) {
                    data = Object.values(data);
                }

                // 【修復】資料清洗：確保 history 存在，防止白畫面
                data = data.map(anime => ({
                    ...anime,
                    history: anime.history || [] 
                }));

                return data;
            } else {
                // 雲端沒資料，嘗試同步本機
                const local = loadLocalData();
                if (local.length > 0) {
                    console.log("偵測到本機資料，自動同步至雲端...");
                    await saveData(local);
                    return local;
                }
                return [];
            }
        } catch (error) {
            console.error("雲端讀取失敗:", error);
            return [];
        }
    } 
    // 2. 未登入，讀取本機
    else {
        return loadLocalData();
    }
}

// 輔助：純本機讀取
function loadLocalData() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) { return []; }
}

// ===== 核心：資料存檔 =====
async function saveData(data) {
    // 1. 如果已登入，存到雲端
    if (window.currentUser && window.firebaseDB) {
        const { ref, set } = window.firebaseModule;
        try {
            await set(ref(window.firebaseDB, `users/${window.currentUser.uid}/animes`), data);
            console.log("雲端存檔成功");
        } catch (e) {
            console.error("雲端存檔失敗", e);
        }
    } 
    // 2. 備份到 LocalStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ===== 監聽登入狀態改變 =====
window.addEventListener('authChanged', async () => {
    console.log("身分狀態改變，重新載入資料...");
    await refreshAll();
});

async function refreshAll() {
    if(document.getElementById('animeGrid')) await loadDashboard();
    if(document.getElementById('manageList')) await loadManage();
    if(document.getElementById('pieChart')) await loadOverview();
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

// ==========================================
// 🔥 V10.0 新增：Bangumi API 搜尋功能 🔥
// ==========================================

async function searchBangumi() {
    const input = document.getElementById('title');
    const query = input.value.trim();
    
    if (!query) return alert("請先輸入關鍵字！");
    
    const modal = document.getElementById('searchModal');
    const resultsContainer = document.getElementById('searchResults');
    
    modal.classList.add('active');
    resultsContainer.innerHTML = '<p style="text-align:center; grid-column:1/-1;">🚀 正在前往 Bangumi 搜尋...</p>';
    
    try {
        const url = `https://api.bgm.tv/search/subject/${encodeURIComponent(query)}?type=2&responseGroup=small&max_results=20`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.list || data.list.length === 0) {
            resultsContainer.innerHTML = '<p style="text-align:center; grid-column:1/-1;">找不到相關動畫，請嘗試其他關鍵字。</p>';
            return;
        }
        renderSearchResults(data.list);
    } catch (error) {
        console.error("API Error:", error);
        resultsContainer.innerHTML = '<p style="text-align:center; grid-column:1/-1; color: #ef4444;">搜尋發生錯誤，請稍後再試。</p>';
    }
}

function renderSearchResults(list) {
    const container = document.getElementById('searchResults');
    container.innerHTML = '';
    
    list.forEach(item => {
        const title = item.name_cn || item.name;
        let imgUrl = item.images ? item.images.large : 'https://placehold.co/300x450?text=No+Image';
        imgUrl = imgUrl.replace('http://', 'https://');
        const eps = (item.eps && item.eps > 0) ? item.eps : 0;
        const epsText = eps > 0 ? `全 ${eps} 集` : '集數未知';

        const card = document.createElement('div');
        card.className = 'search-card';
        card.onclick = () => selectAnimeFromAPI(title, eps, imgUrl, item.air_date);
        
        card.innerHTML = `
            <img src="${imgUrl}" loading="lazy">
            <h4>${title}</h4>
            <p>${epsText}</p>
            <p style="font-size:0.75rem; opacity:0.7;">${item.air_date || ''}</p>
        `;
        container.appendChild(card);
    });
}

// 修改 selectAnimeFromAPI 函式，接收 airDate
function selectAnimeFromAPI(title, eps, imgUrl, airDate) {
    document.getElementById('title').value = title;
    if (eps > 0) document.getElementById('total').value = eps;
    document.getElementById('imgUrl').value = imgUrl;

    // 【新增】自動推算放送日
    const weekdaySelect = document.getElementById('weekday');
    if (airDate) {
        // 建立日期物件 (注意：這裡假設 air_date 是 YYYY-MM-DD)
        const date = new Date(airDate);
        if (!isNaN(date.getTime())) {
            // getDay() 回傳 0(週日)~6(週六)，剛好對應我們的 value
            weekdaySelect.value = date.getDay();
        } else {
            weekdaySelect.value = -1; // 格式錯誤就選不固定
        }
    } else {
        weekdaySelect.value = -1; // 沒有日期就選不固定
    }

    closeModal('searchModal');
    alert(`已自動填寫：${title} (放送日已自動設定)`);
}

// ==========================================
// 原有功能：新增與管理
// ==========================================

// 1. 新增動畫
// 修改 addAnime 函式
async function addAnime(e) {
    e.preventDefault();
    const title = document.getElementById('title').value.trim();
    const total = parseInt(document.getElementById('total').value);
    const imgUrl = document.getElementById('imgUrl').value.trim();
    // 【新增】讀取放送日
    const weekday = parseInt(document.getElementById('weekday').value);

    if (!title || total <= 0) return alert('請輸入正確資料');

    const newAnime = {
        id: Date.now(),
        title, total,
        image: imgUrl || 'https://placehold.co/600x400/1e293b/FFF?text=No+Image',
        weekday, // 【新增】存入資料庫
        history: [] 
    };

    const data = await loadData();
    data.push(newAnime);
    await saveData(data);

    alert(`✨ 成功加入：${title}`);
    window.location.href = 'dashboard.html';
}

// 2. 紀錄頁面 (Dashboard)
let currentAnimeId = null;

async function loadDashboard() {
    const list = document.getElementById('animeGrid');
    if (!list) return;

    list.innerHTML = '<p style="grid-column:1/-1; text-align:center;">載入中...</p>';
    const data = await loadData();
    list.innerHTML = '';

    if (data.length === 0) {
        list.innerHTML = '<p style="text-align:center; grid-column:1/-1; opacity:0.6;">目前沒有動畫，去新增一部吧！</p>';
        return;
    }

    data.sort((a, b) => b.id - a.id);

    data.forEach(anime => {
        const watched = anime.history.length > 0 ? Math.max(...anime.history.map(h => h.end)) : 0;
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

async function submitUpdate() {
    const start = parseInt(document.getElementById('modalStart').value);
    const end = parseInt(document.getElementById('modalEnd').value);
    const week = document.getElementById('modalWeek').value;
    const maxTotal = parseInt(document.getElementById('modalTotal').textContent);
    
    if (isNaN(start) || isNaN(end) || start > end || start < 1 || end > maxTotal) return alert('輸入錯誤');

    const data = await loadData();
    const anime = data.find(a => a.id === currentAnimeId);
    if(anime.history.some(h => (start <= h.end && end >= h.start))) return alert('範圍重疊！');

    anime.history.push({ id: Date.now(), week, start, end, count: (end - start + 1) });
    await saveData(data);
    
    closeModal('updateModal');
    loadDashboard();
}

async function openHistoryModal(id) {
    currentAnimeId = id;
    const modal = document.getElementById('historyModal');
    const list = document.getElementById('historyList');
    
    list.innerHTML = '<p>讀取中...</p>';
    modal.classList.add('active');

    const data = await loadData();
    const anime = data.find(a => a.id === id);
    list.innerHTML = '';
    
    const sortedHistory = [...anime.history].sort((a,b) => b.id - a.id);
    if (sortedHistory.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--text-secondary)">尚無紀錄</p>';
    } else {
        sortedHistory.forEach(h => {
            const item = document.createElement('div');
            item.className = 'history-item';
            const epText = (h.start === h.end) ? `第 ${h.start} 集` : `第 ${h.start}-${h.end} 集`;
            item.innerHTML = `
                <div><span style="color:var(--accent-color); margin-right:8px;">${h.week}</span> ${epText}</div>
                <button class="danger btn-sm" onclick="deleteHistory(${h.id})">刪除</button>
            `;
            list.appendChild(item);
        });
    }
}

async function deleteHistory(historyId) {
    if(!confirm('確定刪除？')) return;
    const data = await loadData();
    const anime = data.find(a => a.id === currentAnimeId);
    anime.history = anime.history.filter(h => h.id !== historyId);
    await saveData(data);
    openHistoryModal(currentAnimeId); 
    loadDashboard(); 
}

function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// 3. 管理頁面 (Manage)
async function loadManage() {
    const list = document.getElementById('manageList');
    if (!list) return;
    
    list.innerHTML = '<p>載入中...</p>';
    const data = await loadData();
    list.innerHTML = '';

    data.forEach(anime => {
        const item = document.createElement('div');
        item.className = 'glass-card';
        // 手機版樣式由 CSS 處理，這裡只需基本的
        item.innerHTML = `
            <div style="font-weight:500; flex:1;">${anime.title}</div>
            <div style="display:flex; gap:10px;">
                <button class="btn-sm" style="background:var(--accent-color); color:var(--bg-color);" onclick="openEditModal(${anime.id})">編輯</button>
                <button class="danger btn-sm" onclick="deleteAnime(${anime.id})">刪除</button>
            </div>
        `;
        list.appendChild(item);
    });
}

let editingAnimeId = null;
async function openEditModal(id) {
    const data = await loadData();
    const anime = data.find(a => a.id === id);
    if (!anime) return;

    editingAnimeId = id;
    document.getElementById('editTitle').value = anime.title;
    document.getElementById('editTotal').value = anime.total;
    document.getElementById('editImgUrl').value = anime.image;
    
    // 【新增】讀取放送日，如果舊資料沒有這個欄位，預設為 -1 (不固定)
    const weekdayVal = (anime.weekday !== undefined) ? anime.weekday : -1;
    document.getElementById('editWeekday').value = weekdayVal;

    document.getElementById('editModal').classList.add('active');
}

async function submitEdit() {
    const newTitle = document.getElementById('editTitle').value.trim();
    const newTotal = parseInt(document.getElementById('editTotal').value);
    const newImg = document.getElementById('editImgUrl').value.trim();
    // 【新增】讀取新的放送日
    const newWeekday = parseInt(document.getElementById('editWeekday').value);

    if (!newTitle || newTotal <= 0) return alert('請輸入有效資料');

    const data = await loadData();
    const index = data.findIndex(a => a.id === editingAnimeId);
    
    if (index !== -1) {
        // 更新資料
        data[index].title = newTitle;
        data[index].total = newTotal;
        data[index].image = newImg || 'https://placehold.co/600x400/1e293b/FFF?text=No+Image';
        data[index].weekday = newWeekday; // 【新增】寫入資料庫
        
        await saveData(data);
        alert('修改成功');
        closeModal('editModal');
        loadManage(); // 重新整理列表
    }
}

async function deleteAnime(id) {
    if(!confirm('確定刪除？此動作將同步至雲端。')) return;
    let data = await loadData();
    data = data.filter(a => a.id !== id);
    await saveData(data);
    loadManage();
}

// 【新增】顯示今日放送清單
function renderTodaySchedule(data) {
    const container = document.getElementById('todayList');
    const title = document.getElementById('todayTitle');
    if (!container) return;

    // 1. 取得今天是星期幾 (0-6)
    const today = new Date().getDay();
    const weekNames = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
    
    // 更新標題
    title.innerHTML = `📅 今日放送 (${weekNames[today]})`;

    // 2. 篩選出今天播出的動畫 (且尚未完結的)
    // 邏輯：weekday 符合今天 且 觀看進度 < 總集數
    const todaysAnime = data.filter(anime => {
        // 先計算已看集數
        const watched = anime.history.length > 0 ? Math.max(...anime.history.map(h => h.end)) : 0;
        // 條件：星期符合 且 還沒看完
        return anime.weekday === today && watched < anime.total;
    });

    // 3. 渲染畫面
    container.innerHTML = '';
    if (todaysAnime.length === 0) {
        container.innerHTML = '<p style="color:var(--text-secondary); width:100%;">今天沒有要追的新番，休息一下吧 ☕</p>';
        return;
    }

    todaysAnime.forEach(anime => {
        const badge = document.createElement('div');
        // 簡單的小標籤樣式
        badge.style.cssText = "display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.1); padding:8px 12px; border-radius:50px; border:1px solid var(--accent-color);";
        badge.innerHTML = `
            <img src="${anime.image}" style="width:30px; height:30px; border-radius:50%; object-fit:cover;">
            <span style="font-weight:bold; font-size:0.9rem;">${anime.title}</span>
        `;
        container.appendChild(badge);
    });
}

// 4. 總覽與其他 (Overview & CSV)
async function loadOverview() {
    const data = await loadData();
    const totalAnimes = data.length;
    const totalEpisodes = data.reduce((acc, cur) => acc + cur.total, 0);
    const watchedEpisodes = data.reduce((acc, cur) => {
        return acc + cur.history.reduce((hAcc, h) => hAcc + h.count, 0);
    }, 0);
    const rate = totalEpisodes ? Math.round((watchedEpisodes / totalEpisodes) * 100) : 0;

    if(document.getElementById('valTotal')) {
        document.getElementById('valTotal').textContent = totalAnimes;
        document.getElementById('valEp').textContent = totalEpisodes;
        document.getElementById('valWatched').textContent = watchedEpisodes;
    }
    const pieChart = document.getElementById('pieChart');
    if (pieChart) {
        pieChart.style.background = `conic-gradient(var(--brand) 0% ${rate}%, rgba(255,255,255,0.1) ${rate}% 100%)`;
        document.getElementById('pieText').textContent = `${rate}%`;
    }
    renderTodaySchedule(data);
    renderHeatmap(data); 
    renderActivity(data); 
}

function renderActivity(data) {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    activityList.innerHTML = '';
    let allHistory = [];
    data.forEach(anime => {
        anime.history.forEach(h => {
            const epDisplay = (h.start === h.end) ? `看了第 ${h.start} 集` : `看了第 ${h.start}-${h.end} 集`;
            allHistory.push({ animeTitle: anime.title, week: h.week, desc: epDisplay, timestamp: h.id });
        });
    });
    allHistory.sort((a, b) => b.timestamp - a.timestamp);
    const recent = allHistory.slice(0, 5);
    if (recent.length === 0) activityList.innerHTML = '<div style="color:var(--text-secondary); text-align:center;">尚無活動</div>';
    else {
        recent.forEach(act => {
            const row = document.createElement('div');
            row.style.cssText = "padding:12px 0; border-bottom:1px solid var(--glass-border); display:flex; justify-content:space-between; align-items:center;";
            row.innerHTML = `
                <div><div style="font-weight:bold; margin-bottom:4px;">${act.animeTitle}</div><div style="font-size:0.85rem; color:var(--text-secondary);">${act.desc}</div></div>
                <div style="font-size:0.85rem; color:var(--text-secondary); text-align:right;">${act.week}</div>
            `;
            activityList.appendChild(row);
        });
    }
}

function renderHeatmap(data) {
    const container = document.getElementById('heatmap');
    if (!container) return;
    container.innerHTML = '';
    const weekCounts = {};
    data.forEach(anime => {
        anime.history.forEach(h => {
            if (!weekCounts[h.week]) weekCounts[h.week] = 0;
            weekCounts[h.week] += h.count;
        });
    });
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day == 0 ? -6 : 1); 
    const currentMonday = new Date(now.setDate(diff));

    for (let i = 51; i >= 0; i--) {
        let tempMon = new Date(currentMonday);
        tempMon.setDate(currentMonday.getDate() - (i * 7));
        let tempSun = new Date(tempMon);
        tempSun.setDate(tempMon.getDate() + 6);
        const fmt = d => `${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')}`;
        const weekStr = `${fmt(tempMon)}~${fmt(tempSun)}`;
        const count = weekCounts[weekStr] || 0;
        let level = 'level-0';
        if (count > 0) level = 'level-1';
        if (count > 5) level = 'level-2';
        if (count > 12) level = 'level-3';
        if (count > 20) level = 'level-4';
        const square = document.createElement('div');
        square.className = `day-square ${level}`;
        square.title = `${weekStr}: 共 ${count} 集`;
        if (i === 0) square.style.border = '1px solid var(--accent-color)';
        container.appendChild(square);
    }
}

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
async function generateCSV() {
    const targetWeek = document.getElementById('csvWeekSelect').value;
    const data = await loadData();
    let csvContent = "\uFEFF動漫名稱,當週集數,觀看進度(區間),,速度評價\n";
    let totalEp = 0; let hasData = false;
    data.forEach(anime => {
        const logs = anime.history.filter(h => h.week === targetWeek);
        if (logs.length > 0) {
            hasData = true;
            const count = logs.reduce((sum, log) => sum + log.count, 0);
            totalEp += count;
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
async function exportToJSON() {
    const data = await loadData();
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
    reader.onload = async (e) => {
        try {
            const json = JSON.parse(e.target.result);
            if (Array.isArray(json)) {
                if(confirm('這將覆蓋目前所有資料，確定還原嗎？')) {
                    await saveData(json);
                    alert('還原成功！');
                    location.reload();
                }
            } else { alert('檔案格式錯誤'); }
        } catch (err) { alert('無法解析檔案'); }
    };
    reader.readAsText(file);
}

// ===== 初始化 =====
window.onload = function() {
    refreshAll();
    initCSVSelect();
};
