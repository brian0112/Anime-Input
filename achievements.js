/* achievements.js - 成就系統 2.0 (精簡與屬性版) */

const ACHIEVEMENT_DATA = [
    // =================================================
    // 1. 基礎數據階梯 (擁有 group 屬性，只會顯示最高階)
    // =================================================
    
    // --- A. 收藏家系列 (group: collection) ---
    { id: 'col_1', group: 'collection', icon: '🌱', title: '初次見面', desc: '收藏 1 部動畫', threshold: 1, type: 'collection' },
    { id: 'col_10', group: 'collection', icon: '📚', title: '小小書庫', desc: '收藏 10 部動畫', threshold: 10, type: 'collection' },
    { id: 'col_50', group: 'collection', icon: '🎩', title: '資深收藏家', desc: '收藏 50 部動畫', threshold: 50, type: 'collection' },
    { id: 'col_100', group: 'collection', icon: '🏰', title: '動畫堡壘', desc: '收藏 100 部動畫', threshold: 100, type: 'collection' },
    { id: 'col_300', group: 'collection', icon: '🌌', title: '次元圖書館', desc: '收藏 300 部動畫', threshold: 300, type: 'collection' },

    // --- B. 觀測者系列 (group: episodes) ---
    { id: 'ep_100', group: 'episodes', icon: '🦅', title: '展翅高飛', desc: '觀看總集數達 100 集', threshold: 100, type: 'episodes' },
    { id: 'ep_500', group: 'episodes', icon: '🔥', title: '熱血沸騰', desc: '觀看總集數達 500 集', threshold: 500, type: 'episodes' },
    { id: 'ep_1000', group: 'episodes', icon: '🏆', title: '千集達成', desc: '觀看總集數達 1000 集', threshold: 1000, type: 'episodes' },
    { id: 'ep_5000', group: 'episodes', icon: '🐲', title: '上古神獸', desc: '觀看總集數達 5000 集', threshold: 5000, type: 'episodes' },

    // --- C. 完食者系列 (group: completed) ---
    { id: 'comp_1', group: 'completed', icon: '✅', title: '第一滴血', desc: '完整看完 1 部動畫', threshold: 1, type: 'completed' },
    { id: 'comp_10', group: 'completed', icon: '🥇', title: '十部里程碑', desc: '完整看完 10 部動畫', threshold: 10, type: 'completed' },
    { id: 'comp_50', group: 'completed', icon: '📀', title: '藍光畫質', desc: '完整看完 50 部動畫', threshold: 50, type: 'completed' },
    { id: 'comp_100', group: 'completed', icon: '💯', title: '百部完食', desc: '完整看完 100 部動畫', threshold: 100, type: 'completed' },

    // =================================================
    // 2. 屬性與特殊成就 (API 驅動，不分階級，符合即獲得)
    // =================================================

    // --- D. 題材風格 (Tags) ---
    { 
        id: 'tag_isekai', icon: '🚚', title: '異世界轉生', desc: '收藏 5 部「異世界/穿越」題材作品', 
        check: (stats) => stats.tags.isekai >= 5 
    },
    { 
        id: 'tag_love', icon: '💕', title: '糖分攝取', desc: '收藏 10 部「戀愛/純愛」題材作品', 
        check: (stats) => stats.tags.love >= 10 
    },
    { 
        id: 'tag_scifi', icon: '🤖', title: '駕駛員', desc: '收藏 5 部「科幻/機戰」題材作品', 
        check: (stats) => stats.tags.scifi >= 5 
    },
    { 
        id: 'tag_healing', icon: '🍃', title: '心靈綠洲', desc: '收藏 5 部「治癒/日常」題材作品', 
        check: (stats) => stats.tags.healing >= 5 
    },
    { 
        id: 'tag_dark', icon: '💊', title: '胃痛藥', desc: '收藏 3 部「致鬱/黑暗」題材作品', 
        check: (stats) => stats.tags.dark >= 3 
    },

    // --- E. 評分與年份 (Rating & Date) ---
    { 
        id: 'rate_god', icon: '🛐', title: '神作獵人', desc: '觀看過 3 部 Bangumi 評分 8.5 以上的作品', 
        check: (stats) => stats.rating.god >= 3 
    },
    { 
        id: 'rate_trash', icon: '🗑️', title: '獨特品味', desc: '觀看過 3 部 Bangumi 評分 5.0 以下的作品', 
        check: (stats) => stats.rating.trash >= 3 
    },
    { 
        id: 'year_retro', icon: '📼', title: '文藝復興', desc: '觀看過 3 部 2005 年以前的懷舊作品', 
        check: (stats) => stats.year.retro >= 3 
    }
];

window.ACHIEVEMENT_DB = ACHIEVEMENT_DATA;
