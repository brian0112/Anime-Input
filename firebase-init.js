/* firebase-init.js */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, onValue, remove, get, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDzphZwsszlppDvXSVba7D6mtMhSSg0vdI",
    authDomain: "anime-input-cloud.firebaseapp.com",
    databaseURL: "https://anime-input-cloud-default-rtdb.firebaseio.com",
    projectId: "anime-input-cloud",
    storageBucket: "anime-input-cloud.firebasestorage.app",
    messagingSenderId: "265274499242",
    appId: "1:265274499242:web:61352fba06a619880830d3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

// 將 Firebase 方法掛載到全域，讓 app.js 使用
window.firebaseModule = { ref, set, onValue, remove, get, child };

async function googleLogin() {
    try {
        const result = await signInWithPopup(auth, provider);
        alert(`歡迎，${result.user.displayName}`);
    } catch (error) {
        console.error("登入失敗", error);
        alert("登入失敗: " + error.message);
    }
}

function googleLogout() {
    signOut(auth).then(() => alert("已登出"));
}

function updateUserUI(user) {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfo = document.getElementById('userInfo');
    
    if (user) {
        if(loginBtn) loginBtn.style.display = 'none';
        if(logoutBtn) logoutBtn.style.display = 'inline-block';
        if(userInfo) userInfo.textContent = `👤 ${user.displayName}`;
        
        window.currentUser = user; 
        window.firebaseDB = db;
    } else {
        if(loginBtn) loginBtn.style.display = 'inline-block';
        if(logoutBtn) logoutBtn.style.display = 'none';
        if(userInfo) userInfo.textContent = '';
        
        window.currentUser = null;
    }
    
    // 【關鍵】發送事件通知 app.js
    window.dispatchEvent(new Event('authChanged'));
}

onAuthStateChanged(auth, (user) => {
    updateUserUI(user);
});

window.googleLogin = googleLogin;
window.googleLogout = googleLogout;
