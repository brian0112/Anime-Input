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

// 修改 app.js 中的 refreshAll 函式

async function refreshAll() {
    // 檢查目前在哪一頁，就刷新那一頁的資料
    if(document.getElementById('animeGrid')) await loadDashboard();
    if(document.getElementById('manageList')) await loadManage();
    if(document.getElementById('pieChart')) await loadOverview();
    
    // 【新增】如果現在是在「個人名片」頁面，也要重新載入資料 (修復顯示未登入的問題)
    if(document.getElementById('profile-card')) await loadProfile();
    
    // 【新增】如果現在是在「探索」頁面，也要重新檢查收藏狀態 (更新 ✅ 圖示)
    if(document.getElementById('exploreGrid')) await loadExplore();
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

// 暫存搜尋結果，避免在 onclick 傳遞大量資料
let currentSearchResults = [];

// 1. 搜尋函式
// 修改 app.js 中的 searchBangumi 函式

async function searchBangumi() {
    // 【修正點】這裡原本是 'searchQuery'，改成你的 HTML 實際使用的 id 'title'
    const queryInput = document.getElementById('title'); 
    const query = queryInput ? queryInput.value : '';

    if (!query) return alert("請輸入關鍵字！");

    const resultArea = document.getElementById('searchResults');
    // 開啟搜尋視窗
    document.getElementById('searchModal').classList.add('active'); 
    
    resultArea.innerHTML = '<p style="text-align:center;">搜尋中...</p>';

    try {
        const url = `https://api.bgm.tv/search/subject/${encodeURIComponent(query)}?type=2&responseGroup=large&max_results=20`;
        const response = await fetch(url);
        const data = await response.json();

        if (!data.list || data.list.length === 0) {
            resultArea.innerHTML = '<p style="text-align:center;">找不到相關結果。</p>';
            return;
        }

        // 存入全域變數
        currentSearchResults = data.list;

        resultArea.innerHTML = '';
        data.list.forEach((item, index) => {
            const title = item.name_cn || item.name;
            let imgUrl = item.images ? (item.images.large || item.images.common) : '';
            if (imgUrl) imgUrl = imgUrl.replace('http://', 'https://');

            const card = document.createElement('div');
            card.className = 'glass-card';
            card.style.cursor = 'pointer';
            card.style.textAlign = 'center';
            card.style.padding = '10px';
            
            card.onclick = () => selectAnimeFromAPI(index);

            card.innerHTML = `
                <img src="${imgUrl || 'https://placehold.co/300x450?text=No+Image'}" style="width:100%; aspect-ratio:2/3; object-fit:cover; border-radius:5px;">
                <h4 style="margin:10px 0 5px 0; font-size:0.9rem;">${title}</h4>
                <div style="font-size:0.8rem; color:var(--text-secondary);">
                    ${item.eps ? '全 ' + item.eps + ' 集' : '集數未知'}
                    <br>${item.air_date || '年份未知'}
                </div>
            `;
            resultArea.appendChild(card);
        });

    } catch (error) {
        console.error(error);
        resultArea.innerHTML = '<p style="text-align:center; color:red;">搜尋發生錯誤。</p>';
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

// 2. 選擇函式 (升級版：填入隱藏資料)
// 修改 app.js 中的 selectAnimeFromAPI 函式

async function selectAnimeFromAPI(index) {
    const item = currentSearchResults[index];
    if(!item) return;

    // 顯示載入中，因為我們要多發一個請求
    const originalText = document.body.style.cursor;
    document.body.style.cursor = 'wait'; // 讓滑鼠變漏斗

    try {
        console.log(`正在獲取《${item.name_cn || item.name}》的詳細資料...`);
        
        // 🚀 關鍵升級：根據 ID 再去抓一次詳細資料 (確保 Tags 100% 準確)
        const detailUrl = `https://api.bgm.tv/subject/${item.id}?responseGroup=large`;
        const response = await fetch(detailUrl);
        const detailData = await response.json();

        // 1. 準備資料
        const title = detailData.name_cn || detailData.name;
        const eps = detailData.eps || 0;
        let imgUrl = detailData.images ? (detailData.images.large || detailData.images.common) : '';
        if (imgUrl) imgUrl = imgUrl.replace('http://', 'https://');
        const airDate = detailData.air_date;

        // 2. 填入可見欄位
        document.getElementById('title').value = title;
        if (eps > 0) document.getElementById('total').value = eps;
        document.getElementById('imgUrl').value = imgUrl;

        // 3. 填入隱藏欄位 (這裡使用 detailData，保證有 tags)
        document.getElementById('bangumiId').value = detailData.id;
        
        const tags = detailData.tags || [];
        document.getElementById('animeTags').value = JSON.stringify(tags); 
        document.getElementById('animeRating').value = JSON.stringify(detailData.rating || {});

        // 4. Console 驗證 (這是給你檢查用的)
        console.log("🔥 [驗證] ID:", detailData.id);
        if (tags.length > 0) {
            console.log("🔥 [驗證] 成功抓取標籤:", tags.map(t => t.name));
        } else {
            console.warn("⚠️ [驗證] 這部動畫在 Bangumi 上沒有任何標籤！");
        }

        // 5. 判斷放送日 (邏輯不變)
        const weekdaySelect = document.getElementById('weekday');
        if (airDate) {
            const startDate = new Date(airDate);
            if (!isNaN(startDate.getTime())) {
                const startDay = startDate.getDay();
                // 簡單判斷：如果有總集數且完結日已過，設為已完結(-1)，否則設為放送日
                let finalValue = -1; 
                if (eps && eps > 0) {
                    const estimatedDays = (eps * 7) + 28; // 寬限一個月
                    const estimatedEndDate = new Date(startDate);
                    estimatedEndDate.setDate(startDate.getDate() + estimatedDays);
                    const today = new Date();
                    if (today > estimatedEndDate) finalValue = -1;
                    else finalValue = startDay;
                } else {
                    finalValue = startDay;
                }
                weekdaySelect.value = finalValue;
            } else {
                weekdaySelect.value = -1;
            }
        } else {
            weekdaySelect.value = -1;
        }

        closeModal('searchModal');

        // 6. 提示使用者結果
        const statusText = (weekdaySelect.value == -1) ? "已完結" : "連載中";
        const tagCount = tags.length;
        alert(`✅ 資料填寫完成！\n📖 作品：${title}\n🏷️ 標籤：成功抓取 ${tagCount} 個 (請看F12 Console)\n📺 狀態：${statusText}`);

    } catch (error) {
        console.error("抓取詳細資料失敗:", error);
        alert("抓取詳細資料失敗，將使用基本資料填入。");
        
        // 如果失敗(例如斷網)，退回使用 item (搜尋結果) 的資料
        // ... (這裡可以保留舊邏輯作為備案，或是直接報錯)
    } finally {
        document.body.style.cursor = originalText; // 恢復滑鼠
    }
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
    const bangumiId = document.getElementById('bangumiId').value;
    const tagsStr = document.getElementById('animeTags').value;
    const ratingStr = document.getElementById('animeRating').value;

    if (!title || total <= 0) return alert('請輸入正確資料');

    const newAnime = {
        id: Date.now(), // 這是我們系統內部的 ID (保持原本邏輯)
        bangumiId: bangumiId ? parseInt(bangumiId) : null, // 【新增】Bangumi ID
        title: title,
        total: parseInt(total),
        image: imgUrl,
        weekday: parseInt(weekday),
        history: [],
        
        // 【新增】擴充資料
        tags: tagsStr ? JSON.parse(tagsStr) : [],
        rating: ratingStr ? JSON.parse(ratingStr) : {},
        addedDate: new Date().toISOString() // 順便紀錄加入時間
    };

    const data = await loadData();
    data.push(newAnime);
    await saveData(data);
    document.getElementById('bangumiId').value = '';
    document.getElementById('animeTags').value = '';
    document.getElementById('animeRating').value = '';

    alert(`✨ 成功加入：${title}`);
    window.location.href = 'dashboard.html';
}

// 2. 紀錄頁面 (Dashboard)
let currentAnimeId = null;
let currentFilter = 'all'; // 預設顯示全部

// 1. 切換篩選器
function filterDashboard(type) {
    currentFilter = type;
    
    // 更新按鈕亮燈狀態
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.getAttribute('onclick').includes(`'${type}'`)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // 重新載入列表
    loadDashboard();
}

// 1. 產生週次選項的輔助函式 (產生 過去4週 ~ 未來1週)
function generateWeekOptions() {
    const options = [];
    const today = new Date();
    // 調整到本週日 (假設週日為一週開始)
    const day = today.getDay();
    const diff = today.getDate() - day;
    const sunday = new Date(today.setDate(diff));

    // 產生前後幾週
    for (let i = -4; i <= 1; i++) {
        const start = new Date(sunday);
        start.setDate(sunday.getDate() + (i * 7));
        
        const end = new Date(start);
        end.setDate(start.getDate() + 6);

        // 格式化日期 MM/DD
        const fmt = d => `${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')}`;
        const val = `${start.getFullYear()}/${fmt(start)} ~ ${fmt(end)}`; // 格式: 2026/01/12 ~ 01/18
        
        // 標記本週
        let label = val;
        if (i === 0) label += " (本週)";

        options.push({ value: val, label: label, selected: i === 0 });
    }
    // 反轉陣列，讓最新的在最上面
    return options.reverse();
}

async function loadDashboard() {
    const list = document.getElementById('animeGrid');
    if (!list) return;

    list.innerHTML = '<p style="grid-column:1/-1; text-align:center;">載入中...</p>';
    
    let data = await loadData(); // 讀取所有資料
    
    // --- 搜尋過濾 (既有的) ---
    const searchInput = document.getElementById('searchInput'); // 假設你有給搜尋框 id
    if (searchInput && searchInput.value) {
        const keyword = searchInput.value.toLowerCase();
        data = data.filter(a => a.title.toLowerCase().includes(keyword));
    }

    // --- 【新增】狀態過濾 ---
    if (currentFilter !== 'all') {
        data = data.filter(anime => {
            const watched = anime.history.length > 0 ? Math.max(...anime.history.map(h => h.end)) : 0;
            
            if (currentFilter === 'watching') {
                // 追番中：看過大於0 且 還沒看完
                return watched > 0 && watched < anime.total;
            } else if (currentFilter === 'completed') {
                // 已看完：看過等於總集數 (且總集數不為0)
                return anime.total > 0 && watched >= anime.total;
            } else if (currentFilter === 'planned') {
                // 尚未看：完全沒進度
                return watched === 0;
            }
            return true;
        });
    }

    list.innerHTML = '';
    if (data.length === 0) {
        list.innerHTML = '<p style="text-align:center; grid-column:1/-1; opacity:0.6;">沒有符合條件的動畫</p>';
        return;
    }

    // (以下保持原本的渲染卡片邏輯，不變)
    data.sort((a, b) => b.id - a.id);
    data.forEach(anime => {
        // ... (貼上你原本的卡片生成程式碼) ...
        const watched = anime.history.length > 0 ? Math.max(...anime.history.map(h => h.end)) : 0;
        let progress = Math.round((watched / anime.total) * 100);
        if (progress > 100) progress = 100;

        const card = document.createElement('div');
        card.className = 'glass-card';
        card.style.display = 'flex'; 
        card.style.flexDirection = 'column';
        card.style.height = '100%';

        card.innerHTML = `
            <img src="${anime.image}" class="anime-cover" onerror="this.src='https://placehold.co/600x400?text=Error'">
            <h3 style="margin:0 0 10px 0;">${anime.title}</h3>
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; color:var(--text-secondary); font-size:0.9rem; margin-top: auto;">
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

// ==========================================
// 🔥 評分系統修復區塊 (請小心覆蓋)
// ==========================================
async function openUpdateModal(id, currentWatched, total) {
    currentAnimeId = id;
    
    const data = await loadData();
    const anime = data.find(a => a.id === id);
    
    if(anime) {
        document.getElementById('modalTitle').textContent = `更新進度 - ${anime.title}`;
        document.getElementById('userScore').value = anime.userScore || "";
        document.getElementById('userComment').value = anime.userComment || "";
    }

    // A. 生成週次選單
    const weekSelect = document.getElementById('modalWeek');
    weekSelect.innerHTML = '';
    const weeks = generateWeekOptions();
    weeks.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w.value;
        opt.textContent = w.label;
        if(w.selected) opt.selected = true;
        weekSelect.appendChild(opt);
    });

    // B. 設定開始與結束集數
    // 預設開始集數 = 目前進度 + 1
    const startVal = currentWatched + 1;
    document.getElementById('modalStart').value = startVal;
    // 預設結束集數 = 開始集數 (假設看一集)，使用者可自己改
    document.getElementById('modalEnd').value = startVal;

    // 設定最大值 (防呆)
    const maxVal = (total > 0) ? total : 9999;
    document.getElementById('modalStart').max = maxVal;
    document.getElementById('modalEnd').max = maxVal;
    
    document.getElementById('updateModal').classList.add('active');
}

async function updateProgress(event) {
    event.preventDefault();
    if (!currentAnimeId) return; 

    // 取得資料
    const weekVal = document.getElementById('modalWeek').value;
    const startEp = parseInt(document.getElementById('modalStart').value);
    const endEp = parseInt(document.getElementById('modalEnd').value);
    const newScore = document.getElementById('userScore').value;
    const newComment = document.getElementById('userComment').value;

    if (endEp < startEp) {
        alert("結束集數不能小於開始集數！");
        return;
    }

    const data = await loadData();
    const animeIndex = data.findIndex(a => a.id === currentAnimeId);

    if (animeIndex > -1) {
        const anime = data[animeIndex];
        
        // A. 新增歷史紀錄 (這裡紀錄的是您選擇的「現實週次」)
        const count = endEp - startEp + 1;
        anime.history.push({
            date: weekVal,  // 使用選擇的週次字串，例如 "2026/01/12 ~ 01/18"
            start: startEp,
            end: endEp,
            count: count
        });

        // B. 儲存評分與心得
        anime.userScore = newScore;
        anime.userComment = newComment;

        await saveData(data);
        closeModal('updateModal');
        
        if(typeof loadDashboard === 'function') loadDashboard();
        if(typeof refreshAll === 'function') refreshAll();

        // 完食鼓勵
        if (anime.total > 0 && endEp >= anime.total) {
            alert(`🎉 恭喜完食！`);
        }
    }
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

// ==========================================
// 🛠️ 歷史紀錄修復 (History Fix)
// ==========================================
async function openHistoryModal(id) {
    currentAnimeId = id; 
    const data = await loadData();
    const anime = data.find(a => a.id === id);

    if (!anime) return;

    // 解決標題 undefined 問題
    // 這裡我們直接修改 HTML 裡的標題文字，不依賴 class
    const modal = document.getElementById('historyModal');
    let header = modal.querySelector('.modal-header');
    if (!header) {
        // 如果 HTML 結構不同，嘗試直接改 modal-content 的第一個子元素
        header = modal.querySelector('.modal-content > div'); 
    }
    if (header) header.textContent = `歷史紀錄 - ${anime.title}`;

    const list = document.getElementById('historyList');
    list.innerHTML = '';

    if (!anime.history || anime.history.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:gray; padding:20px;">尚無觀看紀錄</div>';
    } else {
        // 【關鍵修復】: 反轉陣列以顯示最新紀錄，但保留 "原始索引 (originalIndex)" 用於刪除
        // 這樣刪除時才不會刪錯人
        anime.history
             .map((item, index) => ({ ...item, originalIndex: index })) // 加上原始索引
             .reverse() // 反轉顯示
             .forEach(record => {
            
            const item = document.createElement('div');
            item.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid rgba(255,255,255,0.1);";
            
            item.innerHTML = `
                <div>
                    <div style="font-weight:bold; color:white;">${record.date}</div>
                    <div style="font-size:0.9rem; color:var(--text-secondary);">
                        第 ${record.start} - ${record.end} 集 (共 ${record.count} 集)
                    </div>
                </div>
                <button onclick="deleteHistory(${record.originalIndex})" style="background:var(--danger-color, #ef4444); color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">刪除</button>
            `;
            list.appendChild(item);
        });
    }

    modal.classList.add('active');
}

// 2. 刪除單筆紀錄 (已修復「刪除全部」的 Bug)
async function deleteHistory(index) {
    if(!confirm("確定要刪除這筆紀錄嗎？")) return;

    const data = await loadData();
    const anime = data.find(a => a.id === currentAnimeId);

    if (anime && anime.history) {
        // 因為傳入的是 originalIndex，所以這裡 splice 絕對準確
        anime.history.splice(index, 1);
        
        await saveData(data);
        
        // 刷新列表
        openHistoryModal(currentAnimeId);
        if(typeof loadDashboard === 'function') loadDashboard();
        if(typeof refreshAll === 'function') refreshAll();
    }
}

function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// 3. 管理頁面 (Manage)
// 修改 app.js 中的 loadManage 函式

async function loadManage() {
    const list = document.getElementById('manageList');
    const searchInput = document.getElementById('manageSearch'); // 取得搜尋框
    if (!list) return;
    
    // 取得資料
    let data = await loadData();
    
    // 【新增】過濾資料
    if (searchInput && searchInput.value) {
        const keyword = searchInput.value.toLowerCase();
        data = data.filter(a => a.title.toLowerCase().includes(keyword));
    }

    list.innerHTML = '';
    
    if(data.length === 0) {
        list.innerHTML = '<p style="text-align:center; opacity:0.6;">找不到動畫</p>';
        return;
    }

    data.forEach(anime => {
        const item = document.createElement('div');
        item.className = 'glass-card';
        // 確保卡片排版
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.justifyContent = 'space-between';

        item.innerHTML = `
            <div style="font-weight:500; flex:1; margin-right: 15px;">${anime.title}</div>
            <div style="display:flex; gap:10px; flex-shrink: 0;">
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

// ==========================================
// 🔥 V11.0 新增：輪盤抽籤功能 🔥
// ==========================================

let rouletteInterval = null;
let isSpinning = false;

async function startRoulette() {
    if (isSpinning) return; // 防止重複點擊
    
    const display = document.getElementById('roulette-display');
    const resultArea = document.getElementById('result-area');
    const btn = document.getElementById('spinBtn');
    
    // 1. 準備資料
    const data = await loadData();
    // 篩選條件：還沒看完的動畫 (進度 < 總集數)
    const candidates = data.filter(anime => {
        const watched = anime.history.length > 0 ? Math.max(...anime.history.map(h => h.end)) : 0;
        return watched < anime.total;
    });

    if (candidates.length === 0) {
        return alert("恭喜你！所有動畫都看完了，沒得抽啦！快去新增幾部吧！");
    }

    if (candidates.length === 1) {
        return alert(`只剩下一部《${candidates[0].title}》，不用抽了，直接看吧！`);
    }

    // 2. 開始轉動
    isSpinning = true;
    btn.disabled = true;
    btn.textContent = "抽選中...";
    resultArea.style.display = 'none';
    resultArea.style.opacity = '0';
    
    display.classList.remove('winner');
    display.classList.add('spinning');

    // 3. 動畫邏輯：快速切換文字
    let counter = 0;
    let speed = 50; // 初始速度 (毫秒)
    
    // 播放音效 (選用，目前先不加)
    
    // 建立一個遞迴的 timeout 來模擬減速效果
    function spinLoop() {
        // 隨機選一個顯示
        const randomAnime = candidates[Math.floor(Math.random() * candidates.length)];
        display.textContent = randomAnime.title;
        
        counter++;
        
        // 前 30 次快速轉動，之後開始減速
        if (counter > 30) speed += 20; 
        if (counter > 40) speed += 50;

        if (counter < 50) {
            // 繼續轉
            setTimeout(spinLoop, speed);
        } else {
            // 4. 停止 (中獎)
            finishSpin(randomAnime);
        }
    }

    spinLoop();
}

function finishSpin(winner) {
    const display = document.getElementById('roulette-display');
    const resultArea = document.getElementById('result-area');
    const btn = document.getElementById('spinBtn');
    
    // 顯示中獎者
    display.textContent = winner.title;
    display.classList.remove('spinning');
    display.classList.add('winner');
    
    // 顯示詳細資訊
    const watched = winner.history.length > 0 ? Math.max(...winner.history.map(h => h.end)) : 0;
    document.getElementById('result-title').textContent = winner.title;
    document.getElementById('result-img').src = winner.image;
    document.getElementById('result-progress').textContent = `目前進度: 第 ${watched} / ${winner.total} 集`;
    
    // 淡入顯示結果區
    resultArea.style.display = 'block';
    // 稍微延遲一點讓 display:block 生效後再加 opacity
    setTimeout(() => {
        resultArea.style.opacity = '1';
    }, 50);

    // 重置按鈕
    isSpinning = false;
    btn.disabled = false;
    btn.textContent = "再抽一次";
}

// ==========================================
// 🔥 V12.0 新增：探索頁面邏輯 🔥
// ==========================================

let exploreData = []; // 暫存 API 資料

async function loadExplore() {
    const grid = document.getElementById('exploreGrid');
    const tabsContainer = document.getElementById('weekTabs');
    if (!grid) return;

    // 1. 初始化星期標籤
    const weekNames = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
    const todayIndex = new Date().getDay(); // 0=週日, 1=週一...
    
    tabsContainer.innerHTML = '';
    weekNames.forEach((name, index) => {
        // Bangumi API 的 weekday: 1=Mon, ..., 7=Sun. 我們需要轉換一下
        // JS: 0=Sun, 1=Mon ... 6=Sat
        // 對應: API id = (index === 0) ? 7 : index
        const btn = document.createElement('button');
        btn.className = `tab-btn ${index === todayIndex ? 'active' : ''}`;
        btn.textContent = (index === todayIndex) ? `${name} (今日)` : name;
        btn.onclick = () => switchExploreTab(index);
        tabsContainer.appendChild(btn);
    });

    // 2. 抓取資料
    try {
        const response = await fetch('https://api.bgm.tv/calendar');
        const data = await response.json();
        exploreData = data; // 格式: [{weekday: {id:1...}, items: [...]}, ...]
        
        // 3. 預設顯示今天的動畫
        switchExploreTab(todayIndex);

    } catch (error) {
        console.error("Explore Error:", error);
        grid.innerHTML = '<p style="text-align:center; grid-column:1/-1; color:#ef4444;">無法載入放送表，請稍後再試。</p>';
    }
}

async function switchExploreTab(dayIndex) {
    // 1. 更新按鈕樣式
    document.querySelectorAll('.tab-btn').forEach((btn, idx) => {
        if (idx === dayIndex) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    // 2. 篩選資料
    // Bangumi: Mon=1 ... Sat=6, Sun=7
    // JS Input (dayIndex): Sun=0, Mon=1 ... Sat=6
    const apiDayId = (dayIndex === 0) ? 7 : dayIndex;
    
    const dayData = exploreData.find(d => d.weekday.id === apiDayId);
    const grid = document.getElementById('exploreGrid');
    grid.innerHTML = '';

    if (!dayData || !dayData.items || dayData.items.length === 0) {
        grid.innerHTML = '<p style="text-align:center; grid-column:1/-1;">這天沒有動畫更新資料。</p>';
        return;
    }

    // 3. 取得使用者已收藏的動畫 (為了避免重複加入)
    const userAnimes = await loadData();
    const userTitles = new Set(userAnimes.map(a => a.title)); // 用 Set 加速比對

    // 4. 渲染卡片
    dayData.items.forEach(item => {
        // 排除掉沒有圖片的條目 (通常是不重要的)
        if (!item.images || !item.images.large) return;

        const title = item.name_cn || item.name;
        // 修正圖片網址
        let imgUrl = item.images.large || item.images.common;
        if(imgUrl) imgUrl = imgUrl.replace('http://', 'https://');
        
        // 檢查是否已收藏
        const isAdded = userTitles.has(title);

        const card = document.createElement('div');
        card.className = 'glass-card explore-card';
        // 點擊觸發加入 (如果已加入則提示)
        card.onclick = () => quickAddFromExplore(item, dayIndex);

        card.innerHTML = `
            <div style="position:relative;">
                <img src="${imgUrl}" class="anime-cover" loading="lazy">
                <div class="explore-overlay">
                    <span class="add-icon">${isAdded ? '✅' : '➕'}</span>
                </div>
                ${isAdded ? '<div style="position:absolute; top:5px; right:5px; background:var(--success-color); color:white; padding:2px 6px; border-radius:4px; font-size:0.75rem; font-weight:bold;">已收藏</div>' : ''}
            </div>
            <h4 style="margin:0; font-size:0.9rem; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${title}</h4>
            <div style="margin-top:5px; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.8rem; color:var(--text-secondary);">
                    ${item.rating && item.rating.score ? '⭐' + item.rating.score : ''}
                </span>
            </div>
        `;
        grid.appendChild(card);
    });
}

async function quickAddFromExplore(item, weekdayIndex) {
    const title = item.name_cn || item.name;
    
    // 1. 檢查是否重複
    const userAnimes = await loadData();
    if (userAnimes.some(a => a.title === title)) {
        return alert(`《${title}》已經在你的清單裡囉！`);
    }

    // 2. 確認加入
    if (!confirm(`要將《${title}》加入清單嗎？`)) return;

    // 3. 準備資料
    let imgUrl = item.images ? (item.images.large || item.images.common) : '';
    if(imgUrl) imgUrl = imgUrl.replace('http://', 'https://');

    // API 回傳的 calendar 項目通常沒有 eps 總集數，設為 0 讓使用者之後補
    // 放送日可以直接用目前的 weekdayIndex
    const newAnime = {
        id: Date.now(),
        bangumiId: item.id, // 【新增】
        title: title,
        total: item.eps || 0, // 嘗試抓取，如果沒有就設為 0
        image: imgUrl || 'https://placehold.co/600x400/1e293b/FFF?text=No+Image',
        weekday: weekdayIndex,
        history: [],
        
        // 【新增】從 Calendar API 抓取資料
        // Calendar API 回傳的 rating 格式與 search 略有不同，但通常也有 score
        tags: [], // Calendar API 通常沒有 tags，之後可以用腳本補抓
        rating: item.rating || {},
        addedDate: new Date().toISOString()
    };

    // 4. 存檔
    userAnimes.push(newAnime);
    await saveData(userAnimes);

    // 5. 更新畫面 (把 + 變成 ✅)
    alert(`✨ 成功加入！\n預設集數為 12，請之後再手動修正。`);
    switchExploreTab(weekdayIndex); // 重新渲染該頁面以更新狀態
}

// ==========================================
// 🔥 V13.0 新增：個人名片與成就系統 🔥
// ==========================================

// 修改 app.js 的 loadProfile 函式

async function loadProfile() {
    if (!document.getElementById('profile-card')) return;

    const data = await loadData();
    
    // 1. 基礎數據統計
    let stats = {
        totalAnimes: data.length,
        totalEps: 0,
        completedCount: 0
    };

    data.forEach(anime => {
        const watched = anime.history.length > 0 ? Math.max(...anime.history.map(h => h.end)) : 0;
        stats.totalEps += watched;
        
        // 判斷完食
        if (anime.total > 0 && watched >= anime.total) {
            stats.completedCount++;
        }
    });

    const totalHours = Math.round((stats.totalEps * 24) / 60);

    // 2. 更新 DOM 數據
    document.getElementById('stat-count').textContent = stats.totalAnimes;
    document.getElementById('stat-ep').textContent = stats.totalEps;
    document.getElementById('stat-time').textContent = totalHours + 'h';

    if (window.currentUser) {
        document.getElementById('profile-name').textContent = window.currentUser.displayName;
        document.getElementById('profile-avatar').src = window.currentUser.photoURL;
    }

    // 計算稱號 (Level)
    const titleEl = document.getElementById('profile-title');
    if (stats.totalEps < 50) titleEl.textContent = "LV.1 萌新觀眾";
    else if (stats.totalEps < 200) titleEl.textContent = "LV.10 資深宅宅";
    else if (stats.totalEps < 500) titleEl.textContent = "LV.30 追番狂人";
    else if (stats.totalEps < 1000) titleEl.textContent = "LV.50 番劇鑑賞家";
    else if (stats.totalEps < 5000) titleEl.textContent = "LV.80 次元領主";
    else titleEl.textContent = "LV.99 傳說中的御宅族";

    // 3. 成就判斷與篩選 (只顯示最高階)
    const badgeContainer = document.getElementById('badge-container');
    const listContainer = document.getElementById('achievements-list');
    
    badgeContainer.innerHTML = '';
    listContainer.innerHTML = '';

    const achievements = window.ACHIEVEMENT_DB || [];
    let bestBadges = {}; // 暫存各群組最高級成就

    achievements.forEach(ach => {
        let isUnlocked = false;

        // 判斷解鎖條件
        if (ach.type === 'collection') isUnlocked = stats.totalAnimes >= ach.threshold;
        else if (ach.type === 'episodes') isUnlocked = stats.totalEps >= ach.threshold;
        else if (ach.type === 'completed') isUnlocked = stats.completedCount >= ach.threshold;

        if (isUnlocked) {
            // 比較並保留同群組中「門檻最高」的那個
            if (ach.group) {
                if (!bestBadges[ach.group] || ach.threshold > bestBadges[ach.group].threshold) {
                    bestBadges[ach.group] = ach;
                }
            }
        }

        // 下方列表顯示所有成就狀態
        const item = document.createElement('div');
        item.className = `achievement-item ${isUnlocked ? '' : 'locked'}`;
        item.innerHTML = `
            <div class="achievement-icon">${ach.icon}</div>
            <div>
                <div style="font-weight:bold; color:${isUnlocked ? 'var(--accent-color)' : 'var(--text-secondary)'}">
                    ${ach.title} ${isUnlocked ? ' (已獲得)' : ''}
                </div>
                <div style="font-size:0.8rem; color:var(--text-secondary);">${ach.desc}</div>
            </div>
        `;
        listContainer.appendChild(item);
    });

    // 4. 渲染名片徽章 (只渲染最高級)
    Object.values(bestBadges).forEach(ach => {
        const badge = document.createElement('div');
        badge.className = 'badge';
        badge.innerHTML = `${ach.icon} ${ach.title}`;
        badgeContainer.appendChild(badge);
    });

    if (badgeContainer.innerHTML === '') {
        badgeContainer.innerHTML = '<span style="font-size:0.8rem; opacity:0.6">繼續觀看以解鎖徽章</span>';
    }
}

// 輔助函式：建立徽章 HTML
function createBadgeElement(ach, container) {
    const badge = document.createElement('div');
    badge.className = 'badge';
    badge.innerHTML = `${ach.icon} ${ach.title}`;
    container.appendChild(badge);
}

// 截圖下載功能
function downloadCard() {
    const card = document.getElementById('profile-card');
    const btn = document.querySelector('button[onclick="downloadCard()"]');
    
    btn.textContent = "⏳ 生成中...";
    btn.disabled = true;

    html2canvas(card, {
        useCORS: true,       // 允許跨域圖片 (為了 Google 頭像)
        backgroundColor: null, // 背景透明
        scale: 2             // 2倍解析度，讓圖片更清晰
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `my_anime_card_${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
        
        btn.textContent = "📸 下載名片";
        btn.disabled = false;
    }).catch(err => {
        console.error(err);
        alert("圖片生成失敗，可能是頭像跨域問題。");
        btn.textContent = "📸 下載名片";
        btn.disabled = false;
    });
}

// ===== 初始化 =====
window.onload = function() {
    refreshAll();
    initCSVSelect();
};
