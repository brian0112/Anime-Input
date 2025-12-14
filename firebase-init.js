// firebase-init.js
// 引入 Firebase 核心、驗證、資料庫模組
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, onValue, remove, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 你的設定檔
const firebaseConfig = {
    apiKey: "AIzaSyDzphZwsszlppDvXSVba7D6mtMhSSg0vdI",
    authDomain: "anime-input-cloud.firebaseapp.com",
    databaseURL: "https://anime-input-cloud-default-rtdb.firebaseio.com",
    projectId: "anime-input-cloud",
    storageBucket: "anime-input-cloud.firebasestorage.app",
    messagingSenderId: "265274499242",
    appId: "1:265274499242:web:61352fba06a619880830d3"
};

// 1. 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

// 2. 定義登入函式
async function googleLogin() {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        console.log("登入成功:", user.displayName);
        alert(`歡迎回來，${user.displayName}！`);
        updateUserUI(user);
    } catch (error) {
        console.error("登入失敗:", error);
        alert("登入失敗: " + error.message);
    }
}

// 3. 定義登出函式
function googleLogout() {
    signOut(auth).then(() => {
        alert("已登出");
        updateUserUI(null);
    }).catch((error) => {
        console.error("登出錯誤", error);
    });
}

// 4. 更新介面顯示 (切換登入/登出按鈕)
function updateUserUI(user) {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfo = document.getElementById('userInfo');
    
    if (user) {
        // 已登入狀態
        if(loginBtn) loginBtn.style.display = 'none';
        if(logoutBtn) logoutBtn.style.display = 'inline-block';
        if(userInfo) userInfo.textContent = `👤 ${user.displayName}`;
        
        // 把 user 物件掛載到 window，讓 app.js 可以存取
        window.currentUser = user; 
        window.firebaseDB = db; // 把資料庫也開放出去
    } else {
        // 未登入狀態
        if(loginBtn) loginBtn.style.display = 'inline-block';
        if(logoutBtn) logoutBtn.style.display = 'none';
        if(userInfo) userInfo.textContent = '';
        
        window.currentUser = null;
    }
}

// 5. 監聽登入狀態改變 (重整網頁後會自動偵測)
onAuthStateChanged(auth, (user) => {
    updateUserUI(user);
});

// 6. 【關鍵步驟】將功能掛載到全域 window 物件
// 因為這是 module，外部 html 預設呼叫不到，所以要強制掛上去
window.googleLogin = googleLogin;
window.googleLogout = googleLogout;

console.log("Firebase initialized!");
