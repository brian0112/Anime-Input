/* achievements.js - 基礎成就版 */

const ACHIEVEMENT_DATA = [
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
    { id: 'comp_100', group: 'completed', icon: '💯', title: '百部完食', desc: '完整看完 100 部動畫', threshold: 100, type: 'completed' }
];

window.ACHIEVEMENT_DB = ACHIEVEMENT_DATA;
