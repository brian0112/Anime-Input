/* achievements.js - 獨立的成就資料庫 */

// 定義成就群組，方便管理
const ACHIEVEMENT_DATA = [
    // 1. 【收藏家系列】 (新增作品數量)
    { id: 'col_1', icon: '🌱', title: '初次見面', desc: '收藏第 1 部動畫', threshold: 1, type: 'collection' },
    { id: 'col_5', icon: '📚', title: '小小書庫', desc: '收藏 5 部動畫', threshold: 5, type: 'collection' },
    { id: 'col_10', icon: '🔖', title: '入門收藏家', desc: '收藏 10 部動畫', threshold: 10, type: 'collection' },
    { id: 'col_20', icon: '📂', title: '檔案建立', desc: '收藏 20 部動畫', threshold: 20, type: 'collection' },
    { id: 'col_30', icon: '🗂️', title: '片單擴充', desc: '收藏 30 部動畫', threshold: 30, type: 'collection' },
    { id: 'col_40', icon: '📈', title: '持續關注', desc: '收藏 40 部動畫', threshold: 40, type: 'collection' },
    { id: 'col_50', icon: '🎩', title: '資深收藏家', desc: '收藏 50 部動畫', threshold: 50, type: 'collection' },
    { id: 'col_60', icon: '📦', title: '囤積症候群', desc: '收藏 60 部動畫', threshold: 60, type: 'collection' },
    { id: 'col_70', icon: '🏗️', title: '建立倉庫', desc: '收藏 70 部動畫', threshold: 70, type: 'collection' },
    { id: 'col_80', icon: '🏰', title: '動畫堡壘', desc: '收藏 80 部動畫', threshold: 80, type: 'collection' },
    { id: 'col_90', icon: '🌎', title: '動畫世界', desc: '收藏 90 部動畫', threshold: 90, type: 'collection' },
    { id: 'col_100', icon: '👑', title: '百部達成', desc: '收藏 100 部動畫', threshold: 100, type: 'collection' },
    { id: 'col_150', icon: '🌌', title: '無盡片單', desc: '收藏 150 部動畫', threshold: 150, type: 'collection' },
    { id: 'col_200', icon: '🪐', title: '次元圖書館', desc: '收藏 200 部動畫', threshold: 200, type: 'collection' },
    { id: 'col_300', icon: '🛸', title: '銀河收藏家', desc: '收藏 300 部動畫', threshold: 300, type: 'collection' },
    { id: 'col_500', icon: '🧙‍♂️', title: '全知全能', desc: '收藏 500 部動畫', threshold: 500, type: 'collection' },

    // 2. 【觀測者系列】 (總集數)
    { id: 'ep_1', icon: '🥚', title: '開始旅程', desc: '觀看總集數達 1 集', threshold: 1, type: 'episodes' },
    { id: 'ep_50', icon: '🐥', title: '暖身運動', desc: '觀看總集數達 50 集', threshold: 50, type: 'episodes' },
    { id: 'ep_100', icon: '🦅', title: '展翅高飛', desc: '觀看總集數達 100 集', threshold: 100, type: 'episodes' },
    { id: 'ep_200', icon: '🔥', title: '熱血沸騰', desc: '觀看總集數達 200 集', threshold: 200, type: 'episodes' },
    { id: 'ep_300', icon: '⚔️', title: '歷經百戰', desc: '觀看總集數達 300 集', threshold: 300, type: 'episodes' },
    { id: 'ep_400', icon: '🛡️', title: '堅定不移', desc: '觀看總集數達 400 集', threshold: 400, type: 'episodes' },
    { id: 'ep_500', icon: '🏅', title: '半千斬', desc: '觀看總集數達 500 集', threshold: 500, type: 'episodes' },
    { id: 'ep_600', icon: '🧗', title: '攀登高峰', desc: '觀看總集數達 600 集', threshold: 600, type: 'episodes' },
    { id: 'ep_700', icon: '🏃', title: '長跑選手', desc: '觀看總集數達 700 集', threshold: 700, type: 'episodes' },
    { id: 'ep_800', icon: '🚴', title: '衝刺', desc: '觀看總集數達 800 集', threshold: 800, type: 'episodes' },
    { id: 'ep_900', icon: '🚵', title: '無人能擋', desc: '觀看總集數達 900 集', threshold: 900, type: 'episodes' },
    { id: 'ep_1000', icon: '🏆', title: '千集達成', desc: '觀看總集數達 1000 集', threshold: 1000, type: 'episodes' },
    { id: 'ep_1500', icon: '🚀', title: '突破天際', desc: '觀看總集數達 1500 集', threshold: 1500, type: 'episodes' },
    { id: 'ep_2000', icon: '🛸', title: '星際旅行', desc: '觀看總集數達 2000 集', threshold: 2000, type: 'episodes' },
    { id: 'ep_3000', icon: '👾', title: '異次元生物', desc: '觀看總集數達 3000 集', threshold: 3000, type: 'episodes' },
    { id: 'ep_5000', icon: '🐲', title: '上古神獸', desc: '觀看總集數達 5000 集', threshold: 5000, type: 'episodes' },
    { id: 'ep_10000', icon: '🤴', title: '動漫之王', desc: '觀看總集數達 10000 集', threshold: 10000, type: 'episodes' },

    // 3. 【完食者系列】 (看完的作品數)
    { id: 'comp_1', icon: '✅', title: '第一滴血', desc: '完整看完 1 部動畫', threshold: 1, type: 'completed' },
    { id: 'comp_3', icon: '🥉', title: '完食三連', desc: '完整看完 3 部動畫', threshold: 3, type: 'completed' },
    { id: 'comp_5', icon: '🥈', title: '五部完結', desc: '完整看完 5 部動畫', threshold: 5, type: 'completed' },
    { id: 'comp_10', icon: '🥇', title: '十部里程碑', desc: '完整看完 10 部動畫', threshold: 10, type: 'completed' },
    { id: 'comp_15', icon: '🎗️', title: '精彩不斷', desc: '完整看完 15 部動畫', threshold: 15, type: 'completed' },
    { id: 'comp_20', icon: '🎬', title: '影評人', desc: '完整看完 20 部動畫', threshold: 20, type: 'completed' },
    { id: 'comp_30', icon: '📼', title: '錄影帶時代', desc: '完整看完 30 部動畫', threshold: 30, type: 'completed' },
    { id: 'comp_40', icon: '💿', title: 'DVD收藏', desc: '完整看完 40 部動畫', threshold: 40, type: 'completed' },
    { id: 'comp_50', icon: '📀', title: '藍光畫質', desc: '完整看完 50 部動畫', threshold: 50, type: 'completed' },
    { id: 'comp_60', icon: '📽️', title: '放映師', desc: '完整看完 60 部動畫', threshold: 60, type: 'completed' },
    { id: 'comp_70', icon: '🎥', title: '導演視角', desc: '完整看完 70 部動畫', threshold: 70, type: 'completed' },
    { id: 'comp_80', icon: '🎞️', title: '膠捲記憶', desc: '完整看完 80 部動畫', threshold: 80, type: 'completed' },
    { id: 'comp_90', icon: '📺', title: '電視兒童', desc: '完整看完 90 部動畫', threshold: 90, type: 'completed' },
    { id: 'comp_100', icon: '💯', title: '百部完食', desc: '完整看完 100 部動畫', threshold: 100, type: 'completed' },
    { id: 'comp_150', icon: '🤯', title: '還有什麼沒看', desc: '完整看完 150 部動畫', threshold: 150, type: 'completed' },
    { id: 'comp_200', icon: '🧘', title: '心如止水', desc: '完整看完 200 部動畫', threshold: 200, type: 'completed' },

    // 4. 【時光旅人系列】 (總時數)
    { id: 'time_1', icon: '🕐', title: '初體驗', desc: '總觀看時數達 1 小時', threshold: 1, type: 'time' },
    { id: 'time_10', icon: '🕙', title: '漸入佳境', desc: '總觀看時數達 10 小時', threshold: 10, type: 'time' },
    { id: 'time_24', icon: '☀️', title: '不眠不休', desc: '總觀看時數達 24 小時 (1天)', threshold: 24, type: 'time' },
    { id: 'time_48', icon: '📅', title: '週末狂歡', desc: '總觀看時數達 48 小時 (2天)', threshold: 48, type: 'time' },
    { id: 'time_100', icon: '⌛', title: '百小時', desc: '總觀看時數達 100 小時', threshold: 100, type: 'time' },
    { id: 'time_200', icon: '⏳', title: '時光飛逝', desc: '總觀看時數達 200 小時', threshold: 200, type: 'time' },
    { id: 'time_300', icon: '🕯️', title: '挑燈夜戰', desc: '總觀看時數達 300 小時', threshold: 300, type: 'time' },
    { id: 'time_400', icon: '💡', title: '熱愛', desc: '總觀看時數達 400 小時', threshold: 400, type: 'time' },
    { id: 'time_500', icon: '🕰️', title: '歲月痕跡', desc: '總觀看時數達 500 小時', threshold: 500, type: 'time' },
    { id: 'time_720', icon: '🗓️', title: '一個月', desc: '總觀看時數達 720 小時 (30天)', threshold: 720, type: 'time' },
    { id: 'time_1000', icon: '🗿', title: '千小時', desc: '總觀看時數達 1000 小時', threshold: 1000, type: 'time' },
    { id: 'time_2000', icon: '🏺', title: '考古學家', desc: '總觀看時數達 2000 小時', threshold: 2000, type: 'time' },
    { id: 'time_5000', icon: '🦕', title: '化石等級', desc: '總觀看時數達 5000 小時', threshold: 5000, type: 'time' },

    // 5. 【特殊與星期系列】
    { id: 'special_weekly', icon: '📅', title: '追新番', desc: '正在追每週更新的動畫', check: (data) => data.some(a => a.weekday >= 0 && a.weekday <= 6) },
    { id: 'special_binge_6', icon: '🥤', title: '追劇時光', desc: '單次更新超過 6 集', check: (data) => data.some(a => a.history.some(h => h.count >= 6)) },
    { id: 'special_binge_12', icon: '🍿', title: '停不下來', desc: '單次更新超過 12 集 (一季)', check: (data) => data.some(a => a.history.some(h => h.count >= 12)) },
    { id: 'special_binge_24', icon: '🧟', title: '爆肝', desc: '單次更新超過 24 集 (兩季)', check: (data) => data.some(a => a.history.some(h => h.count >= 24)) },
    
    // 星期制霸 (檢查該作品的放送日)
    { id: 'day_1', icon: '🌑', title: '週一症候群', desc: '正在追週一放送的動畫', check: (data) => data.some(a => a.weekday === 1) },
    { id: 'day_2', icon: '🔥', title: '火熱週二', desc: '正在追週二放送的動畫', check: (data) => data.some(a => a.weekday === 2) },
    { id: 'day_3', icon: '💧', title: '小週末', desc: '正在追週三放送的動畫', check: (data) => data.some(a => a.weekday === 3) },
    { id: 'day_4', icon: '⚡', title: '週四雷霆', desc: '正在追週四放送的動畫', check: (data) => data.some(a => a.weekday === 4) },
    { id: 'day_5', icon: '🍻', title: '快樂星期五', desc: '正在追週五放送的動畫', check: (data) => data.some(a => a.weekday === 5) },
    { id: 'day_6', icon: '🎉', title: '狂歡週末', desc: '正在追週六放送的動畫', check: (data) => data.some(a => a.weekday === 6) },
    { id: 'day_0', icon: '⛪', title: '神聖週日', desc: '正在追週日放送的動畫', check: (data) => data.some(a => a.weekday === 0) },
];

// 為了讓 app.js 使用，我們需要一個全域變數
window.ACHIEVEMENT_DB = ACHIEVEMENT_DATA;
